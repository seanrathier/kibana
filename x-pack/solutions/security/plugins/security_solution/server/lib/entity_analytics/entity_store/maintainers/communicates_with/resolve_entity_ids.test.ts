/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { resolveEntityIds } from './resolve_entity_ids';
import type { ProcessedEntityRecord } from './types';

function createRecord(overrides?: Partial<ProcessedEntityRecord>): ProcessedEntityRecord {
  return {
    entityId: 'user:john.doe@acmecrm.com@jamf_pro',
    userEmail: 'john.doe@acmecrm.com',
    userId: null,
    userName: 'john.doe@acmecrm.com',
    entityNamespace: 'jamf_pro',
    communicates_with: ['host:CD33248A-C9A5-48D7-B7CB-48D814BB4E94'],
    ...overrides,
  };
}

function makeSearchHit(euid: string, email?: string, id?: string, name?: string) {
  return {
    _source: {
      entity: { id: euid },
      user: {
        ...(email && { email }),
        ...(id && { id }),
        ...(name && { name }),
      },
    },
  };
}

function makeSearchHitNestedEntity(euid: string, email?: string, id?: string, name?: string) {
  return {
    _source: {
      user: {
        entity: { id: euid },
        ...(email && { email }),
        ...(id && { id }),
        ...(name && { name }),
      },
    },
  };
}

describe('communicates_with resolveEntityIds', () => {
  const logger = loggingSystemMock.createLogger();
  const namespace = 'default';

  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns records unchanged when the list is empty', async () => {
    const result = await resolveEntityIds(esClient, namespace, logger, []);
    expect(result).toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('resolves entityId by email match', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [makeSearchHit('user:john.doe@acmecrm.com@okta', 'john.doe@acmecrm.com')],
      },
    } as any);

    const records = [createRecord()];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result).toHaveLength(1);
    expect(result[0].entityId).toBe('user:john.doe@acmecrm.com@okta');
  });

  it('resolves entityId by userId when email is absent', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [makeSearchHit('user:uid123@entra_id', undefined, 'uid123')],
      },
    } as any);

    const records = [
      createRecord({
        entityId: 'user:uid123@jamf_pro',
        userEmail: null,
        userId: 'uid123',
        userName: null,
      }),
    ];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:uid123@entra_id');
  });

  it('resolves entityId by userName when email and userId are absent', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [makeSearchHit('user:jdoe@okta', undefined, undefined, 'jdoe')],
      },
    } as any);

    const records = [
      createRecord({
        entityId: 'user:jdoe@jamf_pro',
        userEmail: null,
        userId: null,
        userName: 'jdoe',
      }),
    ];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:jdoe@okta');
  });

  it('keeps original entityId when no store entity matches', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [] },
    } as any);

    const records = [createRecord()];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:john.doe@acmecrm.com@jamf_pro');
  });

  it('keeps original entityId when it already matches the store entity', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [makeSearchHit('user:john.doe@acmecrm.com@jamf_pro', 'john.doe@acmecrm.com')],
      },
    } as any);

    const records = [createRecord()];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:john.doe@acmecrm.com@jamf_pro');
  });

  it('resolves multiple records in a single search call', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          makeSearchHit('user:alice@acme.com@okta', 'alice@acme.com'),
          makeSearchHit('user:bob@acme.com@okta', 'bob@acme.com'),
        ],
      },
    } as any);

    const records = [
      createRecord({ entityId: 'user:alice@acme.com@jamf_pro', userEmail: 'alice@acme.com' }),
      createRecord({ entityId: 'user:bob@acme.com@jamf_pro', userEmail: 'bob@acme.com' }),
    ];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(result[0].entityId).toBe('user:alice@acme.com@okta');
    expect(result[1].entityId).toBe('user:bob@acme.com@okta');
  });

  it('returns records unchanged when all identity fields are null', async () => {
    const records = [
      createRecord({ userEmail: null, userId: null, userName: null }),
    ];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:john.doe@acmecrm.com@jamf_pro');
    expect(esClient.search).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No identity fields')
    );
  });

  it('returns records unchanged and logs error on ES failure', async () => {
    esClient.search.mockRejectedValueOnce(new Error('connection refused'));

    const records = [createRecord()];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:john.doe@acmecrm.com@jamf_pro');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('connection refused')
    );
  });

  it('builds the correct should query with all identity field types', async () => {
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    const records = [
      createRecord({ userEmail: 'a@b.com', userId: 'uid1', userName: 'alice' }),
    ];
    await resolveEntityIds(esClient, namespace, logger, records);

    const searchCall = esClient.search.mock.calls[0][0] as any;
    expect(searchCall.query.bool.should).toEqual([
      { terms: { 'user.email': ['a@b.com'] } },
      { terms: { 'user.id': ['uid1'] } },
      { terms: { 'user.name': ['alice'] } },
    ]);
    expect(searchCall.query.bool.minimum_should_match).toBe(1);
  });

  it('queries the correct latest entities index for the namespace', async () => {
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await resolveEntityIds(esClient, 'prod', logger, [createRecord()]);

    const searchCall = esClient.search.mock.calls[0][0] as any;
    expect(searchCall.index).toBe('.entities.v2.latest.security_prod');
  });

  it('prefers email match over name match when both exist', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          makeSearchHit('user:john@okta', 'john.doe@acmecrm.com', undefined, 'different-name'),
          makeSearchHit('user:john-by-name@okta', undefined, undefined, 'john.doe@acmecrm.com'),
        ],
      },
    } as any);

    const records = [createRecord()];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:john@okta');
  });

  it('skips hits without entity id at either path', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          { _source: { user: { email: 'john.doe@acmecrm.com' } } },
          makeSearchHit('user:john@okta', 'john.doe@acmecrm.com'),
        ],
      },
    } as any);

    const records = [createRecord()];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:john@okta');
  });

  it('resolves from user.entity.id path (CRUD-created docs)', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [makeSearchHitNestedEntity('user:john@okta', 'john.doe@acmecrm.com')],
      },
    } as any);

    const records = [createRecord()];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:john@okta');
  });

  it('prefers entity.id (root) over user.entity.id when both exist', async () => {
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _source: {
              entity: { id: 'user:root-path@okta' },
              user: {
                entity: { id: 'user:nested-path@okta' },
                email: 'john.doe@acmecrm.com',
              },
            },
          },
        ],
      },
    } as any);

    const records = [createRecord()];
    const result = await resolveEntityIds(esClient, namespace, logger, records);

    expect(result[0].entityId).toBe('user:root-path@okta');
  });
});
