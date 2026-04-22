/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, BulkObject } from '../../domain/crud';
import { getLatestEntitiesIndexName } from '../../../common';
import type { RelationshipResolverState } from './types';

const RELATIONSHIP_TYPES = [
  'accesses_frequently',
  'accesses_infrequently',
  'communicates_with',
] as const;
const PAGE_SIZE = 1_000;
const CONFIRM_BATCH_SIZE = 5_000;

export interface RunResolverDeps {
  state: RelationshipResolverState;
  namespace: string;
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  logger: Logger;
  abortController: AbortController;
}

export const runRelationshipResolver = async (
  deps: RunResolverDeps
): Promise<RelationshipResolverState> => {
  const { state, namespace, esClient, crudClient, logger, abortController } = deps;
  const index = getLatestEntitiesIndexName(namespace);

  // Step 1: Collect entities with raw_identifiers populated
  const entities = await collectEntitiesWithRawIdentifiers(esClient, index, logger);

  if (entities.length === 0) {
    logger.debug('No entities with raw_identifiers found, skipping');
    return { ...state, lastRun: { entitiesResolved: 0, entityIdsConfirmed: 0 } };
  }

  logger.debug(`Step 1: Found ${entities.length} entities with raw_identifiers`);

  if (abortController.signal.aborted) {
    logger.debug('Aborted after Step 1');
    return state;
  }

  // Step 2: Confirm which raw entity.ids exist in the latest entities index
  const allRawIds = new Set<string>();
  for (const entity of entities) {
    for (const rel of Object.values(entity.relationships)) {
      for (const id of rel.rawIds) allRawIds.add(id);
    }
  }

  const confirmedIds = await confirmEntityIds(esClient, index, Array.from(allRawIds));
  logger.debug(`Step 2: Confirmed ${confirmedIds.size} of ${allRawIds.size} raw entity IDs exist`);

  if (abortController.signal.aborted) {
    logger.debug('Aborted after Step 2');
    return state;
  }

  // Step 3: Write confirmed ids to entity documents
  const { entitiesResolved, entityIdsConfirmed } = await writeConfirmedIds(
    crudClient,
    logger,
    entities,
    confirmedIds
  );

  logger.info(
    `Resolver complete: ${entitiesResolved} entities updated, ${entityIdsConfirmed} ids confirmed`
  );

  return {
    ...state,
    lastProcessedTimestamp: new Date().toISOString(),
    lastRun: { entitiesResolved, entityIdsConfirmed },
  };
};

interface CollectedEntity {
  entityId: string;
  relationships: Record<string, { rawIds: string[] }>;
}

async function collectEntitiesWithRawIdentifiers(
  esClient: ElasticsearchClient,
  index: string,
  logger: Logger
): Promise<CollectedEntity[]> {
  const rawIdFields = RELATIONSHIP_TYPES.map(
    (rel) => `entity.relationships.${rel}.raw_identifiers.entity.id`
  );

  const results: CollectedEntity[] = [];
  let from = 0;

  while (true) {
    const response = await esClient.search({
      index,
      from,
      size: PAGE_SIZE,
      query: {
        bool: {
          should: rawIdFields.map((field) => ({ exists: { field } })),
          minimum_should_match: 1,
        },
      },
      _source: ['entity.id', ...rawIdFields],
    });

    const hits = response.hits.hits;
    if (hits.length === 0) break;

    for (const hit of hits) {
      const source = hit._source as Record<string, unknown> | null;
      if (!source) continue;

      const entityId = source['entity.id'] as string | undefined;
      if (!entityId) continue;

      const entityRel = source['entity.relationships'] as Record<string, unknown> | undefined;
      if (!entityRel) continue;

      const relationships: Record<string, { rawIds: string[] }> = {};
      for (const relType of RELATIONSHIP_TYPES) {
        const rel = entityRel[relType] as Record<string, unknown> | undefined;
        const rawIdentifiers = rel?.raw_identifiers as Record<string, unknown> | undefined;
        const rawIds = rawIdentifiers?.['entity.id'];
        if (Array.isArray(rawIds) && rawIds.length > 0) {
          relationships[relType] = { rawIds: rawIds as string[] };
        }
      }

      if (Object.keys(relationships).length > 0) {
        results.push({ entityId, relationships });
      }
    }

    from += hits.length;
    logger.debug(`Collected ${results.length} entities so far (page from=${from})`);

    if (hits.length < PAGE_SIZE) break;
  }

  return results;
}

async function confirmEntityIds(
  esClient: ElasticsearchClient,
  index: string,
  ids: string[]
): Promise<Set<string>> {
  const confirmed = new Set<string>();
  if (ids.length === 0) return confirmed;

  for (let i = 0; i < ids.length; i += CONFIRM_BATCH_SIZE) {
    const batch = ids.slice(i, i + CONFIRM_BATCH_SIZE);
    const response = await esClient.search({
      index,
      size: batch.length,
      query: { terms: { 'entity.id': batch } },
      _source: ['entity.id'],
    });

    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown> | null;
      const id = source?.['entity.id'] as string | undefined;
      if (id) confirmed.add(id);
    }
  }

  return confirmed;
}

async function writeConfirmedIds(
  crudClient: EntityUpdateClient,
  logger: Logger,
  entities: CollectedEntity[],
  confirmedIds: Set<string>
): Promise<{ entitiesResolved: number; entityIdsConfirmed: number }> {
  const objects: BulkObject[] = [];
  let totalConfirmed = 0;

  for (const entity of entities) {
    const relationships: Record<string, { ids: string[] }> = {};

    for (const [relType, rel] of Object.entries(entity.relationships)) {
      const ids = rel.rawIds.filter((id) => confirmedIds.has(id));
      if (ids.length > 0) {
        relationships[relType] = { ids };
        totalConfirmed += ids.length;
      }
    }

    if (Object.keys(relationships).length === 0) continue;

    objects.push({
      type: 'user',
      // EntityField.relationships is strict-keyed; this partial update doc cannot
      // satisfy the full Entity type when keys are dynamic — cast through unknown.
      doc: {
        entity: {
          id: entity.entityId,
          relationships,
        },
      } as unknown as BulkObject['doc'],
    });
  }

  if (objects.length === 0) return { entitiesResolved: 0, entityIdsConfirmed: 0 };

  logger.info(`Writing confirmed ids for ${objects.length} entities`);
  const errors = await crudClient.bulkUpdateEntity({ objects, force: true });

  const realErrors = errors.filter((e) => e.status !== 404);
  if (realErrors.length > 0) {
    logger.error(`Failed to write ${realErrors.length} entities: ${JSON.stringify(realErrors)}`);
  }

  const entitiesResolved = objects.length - realErrors.length;
  return { entitiesResolved, entityIdsConfirmed: totalConfirmed };
}
