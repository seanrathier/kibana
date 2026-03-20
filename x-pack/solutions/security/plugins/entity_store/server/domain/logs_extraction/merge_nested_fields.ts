/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  EntityField,
  EntityType,
  ManagedEntityDefinition,
} from '../../../common/domain/definitions/entity_schema';
import { hashEuid } from '../crud/utils';

interface MergeNestedFieldsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  entityDefinition: ManagedEntityDefinition;
  updatesDataStream: string;
  latestIndex: string;
  fromDateISO: string;
  toDateISO: string;
  abortSignal?: AbortSignal;
}

/**
 * Merges nested field data from the updates data stream into the latest entity index.
 *
 * ESQL cannot reference nested-typed fields; the main extraction pipeline skips them.
 * This function bridges the gap by querying the updates data stream with a standard
 * ES nested query, grouping hits by entity EUID, deduplicating values, and scripted-
 * updating the corresponding documents in the latest index.
 */
export async function mergeNestedFieldsFromUpdates({
  esClient,
  logger,
  entityDefinition,
  updatesDataStream,
  latestIndex,
  fromDateISO,
  toDateISO,
  abortSignal,
}: MergeNestedFieldsParams): Promise<number> {
  const nestedFields = entityDefinition.fields.filter((f) => f.mapping?.type === 'nested');
  if (nestedFields.length === 0) return 0;

  const { type } = entityDefinition;
  const euidSourceField = getEuidSourceField(type);
  const typePrefix = entityDefinition.identityField.skipTypePrepend ? undefined : type;

  let totalMerged = 0;

  for (const field of nestedFields) {
    const merged = await mergeOneNestedField({
      esClient,
      logger,
      field,
      updatesDataStream,
      latestIndex,
      euidSourceField,
      typePrefix,
      fromDateISO,
      toDateISO,
      abortSignal,
    });
    totalMerged += merged;
  }

  return totalMerged;
}

function getEuidSourceField(type: EntityType): string {
  return type === 'generic' ? 'entity.id' : `${type}.entity.id`;
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function buildNestedUpsertDoc(
  destParts: string[],
  values: Array<Record<string, unknown>>
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  let current = doc;
  for (let i = 0; i < destParts.length - 1; i++) {
    const next: Record<string, unknown> = {};
    current[destParts[i]] = next;
    current = next;
  }
  current[destParts[destParts.length - 1]] = values;
  return doc;
}

const MERGE_NESTED_SCRIPT = `
  def obj = ctx._source;
  for (int i = 0; i < params.destParts.length - 1; i++) {
    def part = params.destParts[i];
    if (obj[part] == null) { obj[part] = [:]; }
    obj = obj[part];
  }
  def fieldName = params.destParts[params.destParts.length - 1];
  def existing = obj[fieldName];
  if (existing == null) {
    obj[fieldName] = params.values;
  } else {
    def existingEuids = new HashSet();
    for (def e : existing) {
      if (e.euid != null) { existingEuids.add(e.euid); }
    }
    for (def nv : params.values) {
      if (nv.euid != null && !existingEuids.contains(nv.euid)) {
        existing.add(nv);
      }
    }
    if (existing.size() > params.maxLength) {
      obj[fieldName] = existing.subList(0, params.maxLength);
    }
  }
`;

interface MergeOneFieldParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  field: EntityField;
  updatesDataStream: string;
  latestIndex: string;
  euidSourceField: string;
  /** When set, prepended to the raw EUID before hashing to match the latest index _id format (e.g. "user"). */
  typePrefix: string | undefined;
  fromDateISO: string;
  toDateISO: string;
  abortSignal?: AbortSignal;
}

async function mergeOneNestedField({
  esClient,
  logger,
  field,
  updatesDataStream,
  latestIndex,
  euidSourceField,
  typePrefix,
  fromDateISO,
  toDateISO,
  abortSignal,
}: MergeOneFieldParams): Promise<number> {
  const sourcePath = field.source;
  const destPath = field.destination;
  const maxLength = field.retention.operation === 'collect_values' ? field.retention.maxLength : 50;

  const response = await esClient.search(
    {
      index: updatesDataStream,
      size: 10000,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: fromDateISO, lte: toDateISO } } },
            { nested: { path: sourcePath, query: { match_all: {} } } },
          ],
        },
      },
      _source: true,
    },
    ...(abortSignal ? [{ signal: abortSignal }] : [])
  );

  const hits = response.hits.hits;

  if (hits.length === 0) {
    logger.debug(`No updates found for nested field ${sourcePath}`);
    return 0;
  }

  const entityMap = new Map<string, Array<Record<string, unknown>>>();
  for (const hit of hits) {
    const source = hit._source;
    if (!source) continue;

    const rawEuid = getNestedValue(source, euidSourceField) as string;
    if (!rawEuid) continue;

    const euid = typePrefix ? `${typePrefix}:${rawEuid}` : rawEuid;

    const nestedData = getNestedValue(source, sourcePath) as Array<Record<string, unknown>>;
    if (!nestedData || !Array.isArray(nestedData)) continue;

    const existing = entityMap.get(euid) || [];
    for (const item of nestedData) {
      const itemEuid = (item as { euid?: string }).euid;
      if (itemEuid && !existing.some((e) => (e as { euid?: string }).euid === itemEuid)) {
        existing.push(item);
      }
    }
    entityMap.set(euid, existing);
  }

  if (entityMap.size === 0) return 0;

  logger.info(`Merging nested field ${destPath} for ${entityMap.size} entities`);

  const destParts = destPath.split('.');
  const operations: object[] = [];

  for (const [euid, values] of entityMap) {
    const hashedId = hashEuid(euid);
    const slicedValues = values.slice(0, maxLength);

    operations.push({
      update: {
        _index: latestIndex,
        _id: hashedId,
        retry_on_conflict: 3,
      },
    });
    operations.push({
      script: {
        source: MERGE_NESTED_SCRIPT,
        lang: 'painless',
        params: {
          destParts,
          values: slicedValues,
          maxLength,
        },
      },
      upsert: buildNestedUpsertDoc(destParts, slicedValues),
    });
  }

  const bulkResponse = await esClient.bulk(
    {
      operations,
      refresh: true,
    },
    ...(abortSignal ? [{ signal: abortSignal }] : [])
  );

  let errorCount = 0;
  if (bulkResponse.errors) {
    for (const item of bulkResponse.items) {
      const result = Object.values(item)[0];
      if (result.error) {
        errorCount++;
        logger.error(
          `Failed to merge nested field ${destPath} for entity ${result._id}: ${result.error.reason}`
        );
      }
    }
  }

  const successCount = entityMap.size - errorCount;

  logger.info(`Merged nested field ${destPath} for ${successCount} entities`);
  return successCount;
}
