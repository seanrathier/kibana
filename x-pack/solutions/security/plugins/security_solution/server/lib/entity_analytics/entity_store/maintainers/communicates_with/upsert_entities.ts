/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityStoreCRUDClient, BulkObject } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';

import type { ProcessedEntityRecord } from './types';

export async function upsertEntityRelationships(
  crudClient: EntityStoreCRUDClient,
  logger: Logger,
  records: ProcessedEntityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const objects: BulkObject[] = records
    .filter((r) => r.communicates_with.length > 0)
    .map((r) => {
      const userFields: Record<string, string> = {};
      if (r.userEmail) userFields.email = r.userEmail;
      if (r.userId) userFields.id = r.userId;
      if (r.userName) userFields.name = r.userName;
      const hasUserFields = Object.keys(userFields).length > 0;

      return {
        type: 'user' as const,
        doc: {
          entity: {
            id: r.entityId,
            relationships: {
              communicates_with: r.communicates_with,
            },
          },
          ...(hasUserFields ? { user: userFields } : {}),
          ...(r.entityNamespace
            ? { event: { module: r.entityNamespace, kind: 'asset' } }
            : { event: { kind: 'asset' } }),
        } as Entity,
      };
    });

  if (objects.length === 0) return 0;

  logger.info(`Upserting ${objects.length} entity relationship records via bulk API`);
  const errors = await crudClient.upsertEntitiesBulk({ objects, force: true });

  const upserted = objects.length - errors.length;
  if (errors.length > 0) {
    logger.error(`Failed to upsert ${errors.length} entity records: ${JSON.stringify(errors)}`);
  }

  logger.info(`Upserted ${upserted} entity relationship records`);
  return upserted;
}
