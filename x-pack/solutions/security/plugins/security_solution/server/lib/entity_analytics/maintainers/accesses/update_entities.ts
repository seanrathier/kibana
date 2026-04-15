/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, BulkObject } from '@kbn/entity-store/server';
import type { EntityType } from '@kbn/entity-store/common';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';

import type { ProcessedEntityRecord } from './types';

interface MergedEntity {
  frequently: Set<string>;
  infrequently: Set<string>;
}

function mergeRecordsByEntityId(records: ProcessedEntityRecord[]): Map<string, MergedEntity> {
  // Step 1: filter records that have at least one access and a valid entityId
  const validRecords = records.filter(
    (r): r is ProcessedEntityRecord & { entityId: string } =>
      r.entityId !== null &&
      (r.accesses_frequently.ids.length > 0 || r.accesses_infrequently.ids.length > 0)
  );

  // Step 2: group by entityId, merging ids across records for the same entity
  const merged = new Map<string, MergedEntity>();
  for (const r of validRecords) {
    const existing = merged.get(r.entityId);
    if (existing) {
      for (const id of r.accesses_frequently.ids) existing.frequently.add(id);
      for (const id of r.accesses_infrequently.ids) existing.infrequently.add(id);
    } else {
      merged.set(r.entityId, {
        frequently: new Set(r.accesses_frequently.ids),
        infrequently: new Set(r.accesses_infrequently.ids),
      });
    }
  }

  // Step 3: apply precedence — accesses_frequently wins, remove any overlap from infrequently
  for (const [, entity] of merged) {
    for (const id of entity.frequently) entity.infrequently.delete(id);
  }

  return merged;
}

export async function updateEntityRelationships(
  crudClient: EntityUpdateClient,
  logger: Logger,
  records: ProcessedEntityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const entityType: EntityType = 'user';
  const merged = mergeRecordsByEntityId(records);

  const objects: BulkObject[] = Array.from(merged, ([entityId, { frequently, infrequently }]) => {
    const frequentlyIds = Array.from(frequently);
    const infrequentlyIds = Array.from(infrequently);
    return {
      type: entityType as BulkObject['type'],
      doc: {
        entity: {
          id: entityId,
          relationships: {
            accesses_frequently: frequentlyIds.length > 0 ? { ids: frequentlyIds } : undefined,
            accesses_infrequently:
              infrequentlyIds.length > 0 ? { ids: infrequentlyIds } : undefined,
          },
        },
      } satisfies Entity,
    };
  });

  if (objects.length === 0) return 0;

  logger.info(`Updating ${objects.length} entity relationship records via CRUD bulk API`);
  const errors = await crudClient.bulkUpdateEntity({ objects, force: true });

  const updatedCount = objects.length - errors.length;
  if (errors.length > 0) {
    logger.error(`Failed to update ${errors.length} entity records: ${JSON.stringify(errors)}`);
  }

  logger.info(`Updated ${updatedCount} entity relationship records`);
  return updatedCount;
}
