/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { upsertEntityRelationships } from './upsert_entities';
import type { ProcessedEntityRecord } from './types';

function createRecord(overrides?: Partial<ProcessedEntityRecord>): ProcessedEntityRecord {
  return {
    entityId: 'alice@acme',
    userId: 'alice-user-id',
    entityNamespace: 'aws',
    communicates_with: ['service:s3.amazonaws.com'],
    ...overrides,
  };
}

function createCrudClient(errors: unknown[] = []): EntityStoreCRUDClient {
  return {
    upsertEntitiesBulk: jest.fn().mockResolvedValue(errors),
  } as unknown as EntityStoreCRUDClient;
}

describe('communicates_with upsertEntityRelationships', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 without calling the API when records is empty', async () => {
    const crudClient = createCrudClient();
    const result = await upsertEntityRelationships(crudClient, logger, []);
    expect(result).toBe(0);
    expect(crudClient.upsertEntitiesBulk).not.toHaveBeenCalled();
  });

  it('returns 0 without calling the API when all records have empty communicates_with', async () => {
    const crudClient = createCrudClient();
    const records = [createRecord({ communicates_with: [] }), createRecord({ communicates_with: [] })];
    const result = await upsertEntityRelationships(crudClient, logger, records);
    expect(result).toBe(0);
    expect(crudClient.upsertEntitiesBulk).not.toHaveBeenCalled();
  });

  it('upserts only records that have at least one communicates_with target', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({ entityId: 'alice@acme', communicates_with: ['service:s3.amazonaws.com'] }),
      createRecord({ entityId: 'bob@acme', communicates_with: [] }),
    ];
    await upsertEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.upsertEntitiesBulk as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    expect(objects[0].doc.entity.id).toBe('alice@acme');
  });

  it('maps communicates_with strings to { euid } objects', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({
      communicates_with: ['service:s3.amazonaws.com', 'service:ec2.amazonaws.com'],
    });
    await upsertEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.upsertEntitiesBulk as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.communicates_with).toEqual([
      { euid: 'service:s3.amazonaws.com' },
      { euid: 'service:ec2.amazonaws.com' },
    ]);
  });

  it('sets entity.id to entityId', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ entityId: 'alice@acme' });
    await upsertEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.upsertEntitiesBulk as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.id).toBe('alice@acme');
  });

  it('sets user.id to userId when userId is present', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ userId: 'alice-user-id' });
    await upsertEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.upsertEntitiesBulk as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.user?.id).toBe('alice-user-id');
  });

  it('omits user field when userId is null', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ userId: null });
    await upsertEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.upsertEntitiesBulk as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.user).toBeUndefined();
  });

  it('sets event.module to entityNamespace when present', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ entityNamespace: 'azure' });
    await upsertEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.upsertEntitiesBulk as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.event?.module).toBe('azure');
  });

  it('omits event field when entityNamespace is null', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ entityNamespace: null });
    await upsertEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.upsertEntitiesBulk as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.event).toBeUndefined();
  });

  it('calls upsertEntitiesBulk with force: true', async () => {
    const crudClient = createCrudClient();
    await upsertEntityRelationships(crudClient, logger, [createRecord()]);
    expect(crudClient.upsertEntitiesBulk).toHaveBeenCalledWith(
      expect.objectContaining({ force: true })
    );
  });

  it('returns the count of successfully upserted objects', async () => {
    const crudClient = createCrudClient([]);
    const records = [createRecord({ entityId: 'a@acme' }), createRecord({ entityId: 'b@acme' })];
    const result = await upsertEntityRelationships(crudClient, logger, records);
    expect(result).toBe(2);
  });

  it('returns upserted count minus errors when some fail', async () => {
    const errors = [{ _id: 'hash1', status: 429, type: 'too_many_requests', reason: 'throttled' }];
    const crudClient = createCrudClient(errors);
    const records = [createRecord({ entityId: 'a@acme' }), createRecord({ entityId: 'b@acme' })];
    const result = await upsertEntityRelationships(crudClient, logger, records);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to upsert 1'));
  });

  it('upserts all records in a single bulk call', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({ entityId: 'a@acme', communicates_with: ['service:s3'] }),
      createRecord({ entityId: 'b@acme', communicates_with: ['service:ec2'] }),
      createRecord({ entityId: 'c@acme', communicates_with: ['service:lambda'] }),
    ];
    await upsertEntityRelationships(crudClient, logger, records);
    expect(crudClient.upsertEntitiesBulk).toHaveBeenCalledTimes(1);
    const { objects } = (crudClient.upsertEntitiesBulk as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(3);
  });
});
