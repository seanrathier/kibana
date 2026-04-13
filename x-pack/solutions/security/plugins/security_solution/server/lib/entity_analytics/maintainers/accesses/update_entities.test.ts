/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { updateEntityRelationships } from './update_entities';
import type { ProcessedEntityRecord } from './types';

function createRecord(overrides?: Partial<ProcessedEntityRecord>): ProcessedEntityRecord {
  return {
    entityId: 'user:alice@corp@system_auth',
    accesses_frequently: { ids: ['host:prod-db-01@corp'] },
    accesses_infrequently: { ids: [] },
    ...overrides,
  };
}

function createCrudClient(errors: unknown[] = []): EntityUpdateClient {
  return {
    bulkUpdateEntity: jest.fn().mockResolvedValue(errors),
    updateEntity: jest.fn(),
  } as unknown as EntityUpdateClient;
}

describe('accesses updateEntityRelationships', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 without calling the API when records is empty', async () => {
    const crudClient = createCrudClient();
    const result = await updateEntityRelationships(crudClient, logger, []);
    expect(result).toBe(0);
    expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('sets accesses_frequently to undefined when ids is empty', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ accesses_frequently: { ids: [] } });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.accesses_frequently).toBeUndefined();
  });

  it('sets accesses_infrequently to undefined when ids is empty', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ accesses_infrequently: { ids: [] } });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.accesses_infrequently).toBeUndefined();
  });

  it('passes accesses_frequently as { ids: [...] } when non-empty', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({
      accesses_frequently: { ids: ['host:prod-db-01@corp', 'host:prod-db-02@corp'] },
    });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.accesses_frequently).toEqual({
      ids: ['host:prod-db-01@corp', 'host:prod-db-02@corp'],
    });
  });

  it('passes accesses_infrequently as { ids: [...] } when non-empty', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({
      accesses_frequently: { ids: [] },
      accesses_infrequently: { ids: ['host:legacy-01@corp'] },
    });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.accesses_infrequently).toEqual({
      ids: ['host:legacy-01@corp'],
    });
  });

  it('sets entity.id to entityId', async () => {
    const crudClient = createCrudClient();
    await updateEntityRelationships(crudClient, logger, [createRecord()]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.id).toBe('user:alice@corp@system_auth');
  });

  it('hardcodes entity type as "user"', async () => {
    const crudClient = createCrudClient();
    await updateEntityRelationships(crudClient, logger, [createRecord()]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].type).toBe('user');
  });

  it('calls bulkUpdateEntity with force: true', async () => {
    const crudClient = createCrudClient();
    await updateEntityRelationships(crudClient, logger, [createRecord()]);
    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ force: true })
    );
  });

  it('returns the count of successfully updated records', async () => {
    const crudClient = createCrudClient([]);
    const records = [
      createRecord({ entityId: 'user:a@corp@auth' }),
      createRecord({ entityId: 'user:b@corp@auth' }),
    ];
    const result = await updateEntityRelationships(crudClient, logger, records);
    expect(result).toBe(2);
  });

  it('returns updated count minus errors when some fail', async () => {
    const errors = [{ _id: 'hash1', status: 429, type: 'too_many_requests', reason: 'throttled' }];
    const crudClient = createCrudClient(errors);
    const records = [
      createRecord({ entityId: 'user:a@corp@auth' }),
      createRecord({ entityId: 'user:b@corp@auth' }),
    ];
    const result = await updateEntityRelationships(crudClient, logger, records);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to update 1'));
  });

  it('updates all records in a single bulk call', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({ entityId: 'user:a@corp@auth' }),
      createRecord({ entityId: 'user:b@corp@auth' }),
      createRecord({ entityId: 'user:c@corp@auth' }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledTimes(1);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(3);
  });
});
