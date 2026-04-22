/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '../../../domain/crud';
import { runRelationshipResolver } from '../run';
import type { RelationshipResolverState } from '../types';

const makeEsClient = (searchResponses: object[]): ElasticsearchClient => {
  let callCount = 0;
  return {
    search: jest.fn().mockImplementation(() => {
      return Promise.resolve(searchResponses[callCount++] ?? { hits: { hits: [] } });
    }),
  } as unknown as ElasticsearchClient;
};

const makeCrudClient = (): EntityUpdateClient =>
  ({ bulkUpdateEntity: jest.fn().mockResolvedValue([]) } as unknown as EntityUpdateClient);

const NAMESPACE = 'default';
const INITIAL_STATE: RelationshipResolverState = { lastProcessedTimestamp: null, lastRun: null };

describe('runRelationshipResolver', () => {
  it('returns state with zero counts when no entities with raw_identifiers are found', async () => {
    const esClient = makeEsClient([{ hits: { hits: [] } }]);
    const result = await runRelationshipResolver({
      state: INITIAL_STATE,
      namespace: NAMESPACE,
      esClient,
      crudClient: makeCrudClient(),
      logger: loggerMock.create(),
      abortController: new AbortController(),
    });
    expect(result.lastRun).toEqual({ entitiesResolved: 0, entityIdsConfirmed: 0 });
  });

  it('queries entities with any relationship raw_identifiers', async () => {
    const esClient = makeEsClient([{ hits: { hits: [] } }]);
    await runRelationshipResolver({
      state: INITIAL_STATE,
      namespace: NAMESPACE,
      esClient,
      crudClient: makeCrudClient(),
      logger: loggerMock.create(),
      abortController: new AbortController(),
    });
    const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
    const queryStr = JSON.stringify(searchCall.query);
    expect(queryStr).toContain('raw_identifiers');
  });

  it('confirms raw entity.ids against the latest entities index', async () => {
    const entityDoc = {
      _source: {
        'entity.id': 'user:alice@corp',
        'entity.relationships': {
          communicates_with: {
            raw_identifiers: { 'entity.id': ['host:web-01', 'host:missing'] },
          },
        },
      },
    };
    const confirmResponse = {
      hits: {
        hits: [{ _source: { 'entity.id': 'host:web-01' } }],
      },
    };
    const esClient = makeEsClient([
      { hits: { hits: [entityDoc] } }, // Step 1: entities with raw_identifiers
      confirmResponse, // Step 2: confirm existence of raw ids
      { hits: { hits: [] } }, // Step 1 pagination end
    ]);
    const crudClient = makeCrudClient();
    await runRelationshipResolver({
      state: INITIAL_STATE,
      namespace: NAMESPACE,
      esClient,
      crudClient,
      logger: loggerMock.create(),
      abortController: new AbortController(),
    });
    const bulkCall = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0]?.[0];
    expect(bulkCall).toBeDefined();
    const written = bulkCall.objects[0].doc.entity.relationships.communicates_with.ids;
    expect(written).toEqual(['host:web-01']);
  });
});
