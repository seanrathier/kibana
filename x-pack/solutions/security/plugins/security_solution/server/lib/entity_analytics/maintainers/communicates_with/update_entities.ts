/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, BulkObject } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';

import type { ProcessedEntityRecord } from './types';

export async function updateEntityRelationships(
  crudClient: EntityUpdateClient,
  logger: Logger,
  records: ProcessedEntityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const objects: BulkObject[] = records
    .filter((r) => r.communicates_with.length > 0)
    .map((r) => ({
      type: 'user' as const,
      doc: {
        entity: {
          id: r.entityId,
          relationships: {
            communicates_with: r.communicates_with,
          },
        },
      } as Entity,
    }));

  if (objects.length === 0) return 0;

  logger.info(`Updating ${objects.length} entity relationship records via bulk API`);
  const errors = await crudClient.bulkUpdateEntity({ objects, force: true });

  const updated = objects.length - errors.length;
  if (errors.length > 0) {
    logger.error(`Failed to update ${errors.length} entity records: ${JSON.stringify(errors)}`);
  }

  logger.info(`Updated ${updated} entity relationship records`);
  return updated;
}
