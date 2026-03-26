/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { getLatestEntitiesIndexName } from '@kbn/entity-store/server';

import type { ProcessedEntityRecord } from './types';

interface StoredUserEntity {
  entity?: { id?: string };
  user?: {
    entity?: { id?: string };
    email?: string;
    id?: string;
    name?: string;
  };
}

/**
 * Resolves `entityId` on each record to an existing entity in the store by
 * matching identity fields (email, id, name) across namespaces.
 *
 * This handles the case where the ES|QL query produces a namespace-specific
 * EUID (e.g. `user:alice@acme.com@jamf_pro`) but the canonical entity lives
 * under a different namespace (e.g. `user:alice@acme.com@okta`).
 *
 * Records whose identity cannot be resolved are returned unchanged — their
 * original `entityId` is preserved and the subsequent `bulkUpdateEntity` call
 * will surface a 404 if no matching entity exists.
 */
export async function resolveEntityIds(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger,
  records: ProcessedEntityRecord[]
): Promise<ProcessedEntityRecord[]> {
  if (records.length === 0) return records;

  const emails = new Set<string>();
  const userIds = new Set<string>();
  const userNames = new Set<string>();

  for (const record of records) {
    if (record.userEmail) emails.add(record.userEmail);
    if (record.userId) userIds.add(record.userId);
    if (record.userName) userNames.add(record.userName);
  }

  const shouldClauses: QueryDslQueryContainer[] = [];
  if (emails.size > 0) shouldClauses.push({ terms: { 'user.email': [...emails] } });
  if (userIds.size > 0) shouldClauses.push({ terms: { 'user.id': [...userIds] } });
  if (userNames.size > 0) shouldClauses.push({ terms: { 'user.name': [...userNames] } });

  if (shouldClauses.length === 0) {
    logger.warn('No identity fields available for cross-namespace entity resolution');
    return records;
  }

  const indexName: string = getLatestEntitiesIndexName(namespace);

  let resp;
  try {
    resp = await esClient.search<StoredUserEntity>({
      index: indexName,
      query: { bool: { should: shouldClauses, minimum_should_match: 1 } },
      _source: ['entity.id', 'user.entity.id', 'user.email', 'user.id', 'user.name'],
      size: records.length * 3,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    logger.error(`Cross-namespace entity resolution query failed: ${msg}`);
    return records;
  }

  const emailToEuid = new Map<string, string>();
  const idToEuid = new Map<string, string>();
  const nameToEuid = new Map<string, string>();

  for (const hit of resp.hits.hits) {
    const source = hit._source;
    const euid = source?.entity?.id ?? source?.user?.entity?.id;
    if (euid) {
      if (source?.user?.email) emailToEuid.set(source.user.email, euid);
      if (source?.user?.id) idToEuid.set(source.user.id, euid);
      if (source?.user?.name) nameToEuid.set(source.user.name, euid);
    }
  }

  let resolvedCount = 0;
  const resolved = records.map((record) => {
    const matchedEuid =
      (record.userEmail && emailToEuid.get(record.userEmail)) ||
      (record.userId && idToEuid.get(record.userId)) ||
      (record.userName && nameToEuid.get(record.userName));

    if (matchedEuid && matchedEuid !== record.entityId) {
      resolvedCount++;
      logger.info(
        `Resolved entity ${record.entityId} -> ${matchedEuid} via cross-namespace lookup`
      );
      return { ...record, entityId: matchedEuid };
    }
    return record;
  });

  if (resolvedCount > 0) {
    logger.info(
      `Resolved ${resolvedCount}/${records.length} entity IDs via cross-namespace lookup`
    );
  }

  return resolved;
}
