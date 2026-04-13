/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityType } from '@kbn/entity-store/common';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';

import type { ProcessedEntityRecord } from './types';

interface MergedEntity {
  frequently: Set<string>;
  infrequently: Set<string>;
}

function mergeRecordsByEntityId(records: ProcessedEntityRecord[]): Map<string, MergedEntity> {
  const merged = new Map<string, MergedEntity>();

  for (const r of records) {
    if (r.entityId) {
      const existing = merged.get(r.entityId);
      if (existing) {
        for (const h of r.accesses_frequently.ids) existing.frequently.add(h);
        for (const h of r.accesses_infrequently.ids) existing.infrequently.add(h);
      } else {
        merged.set(r.entityId, {
          frequently: new Set(r.accesses_frequently.ids),
          infrequently: new Set(r.accesses_infrequently.ids),
        });
      }
    }
  }

  // Precedence: accesses_frequently wins — remove from infrequently any host already in frequently
  for (const [, entity] of merged) {
    for (const h of entity.frequently) entity.infrequently.delete(h);
  }

  return merged;
}

function buildEntityDoc(record: ProcessedEntityRecord): Entity {
  return {
    entity: {
      id: record.entityId,
      relationships: {
        accesses_frequently:
          record.accesses_frequently.ids.length > 0 ? record.accesses_frequently : undefined,
        accesses_infrequently:
          record.accesses_infrequently.ids.length > 0 ? record.accesses_infrequently : undefined,
      },
    },
  } as Entity;
}

export async function updateEntityRelationships(
  crudClient: EntityUpdateClient,
  logger: Logger,
  records: ProcessedEntityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const entityType: EntityType = 'user';
  const merged = mergeRecordsByEntityId(records);

  const objects = Array.from(merged, ([entityId, { frequently, infrequently }]) => ({
    type: entityType,
    doc: buildEntityDoc({
      entityId,
      accesses_frequently: { ids: Array.from(frequently) },
      accesses_infrequently: { ids: Array.from(infrequently) },
    }),
  }));

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
