/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { EsClient } from '@kbn/scout-security';

import type { CommunicatesWithTestConfig } from './communicates_with_configs';
import { ENTITY_STORE_ROUTES, UPDATES_INDEX, LATEST_INDEX } from './constants';

interface ApiClient {
  post(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
      body: unknown;
    }
  ): Promise<{ statusCode: number; body: Record<string, unknown> }>;
}

export const triggerMaintainerRun = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  maintainerId = 'communicates_with'
) => {
  const response = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_RUN(maintainerId), {
    headers,
    responseType: 'json',
    body: {},
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to trigger maintainer run '${maintainerId}': ${JSON.stringify(response.body)}`
    );
  }
  return response;
};

export const ingestDoc = async (esClient: EsClient, index: string, body: Record<string, unknown>) =>
  esClient.index({ index, refresh: 'wait_for', body });

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current != null && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Polls an index for an entity with the given ID and verifies it has the
 * expected communicates_with relationship targets.
 */
export const waitForCommunicatesWith = async (
  esClient: EsClient,
  index: string,
  entityId: string,
  expectedTargets: string[],
  timeoutMs = 120_000
): Promise<Record<string, unknown>> => {
  const start = Date.now();
  let lastSource: Record<string, unknown> | undefined;

  while (Date.now() - start < timeoutMs) {
    await esClient.indices.refresh({ index, ignore_unavailable: true });
    const response = await esClient.search({
      index,
      ignore_unavailable: true,
      query: {
        bool: {
          should: [{ term: { 'entity.id': entityId } }, { term: { 'user.entity.id': entityId } }],
          minimum_should_match: 1,
        },
      },
      size: 10,
      sort: [{ '@timestamp': 'desc' }],
    });

    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      lastSource = source;

      const communicatesWith =
        (getNestedValue(source, 'entity.relationships.communicates_with') as
          | string[]
          | undefined) ??
        (getNestedValue(source, 'user.entity.relationships.communicates_with') as
          | string[]
          | undefined) ??
        [];

      if (communicatesWith.length > 0) {
        const actualSorted = [...communicatesWith].sort();
        const expectedSorted = [...expectedTargets].sort();

        if (JSON.stringify(actualSorted) === JSON.stringify(expectedSorted)) {
          return source;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(
    `Timed out waiting for entity '${entityId}' to have communicates_with targets ` +
      `[${expectedTargets.join(', ')}] in '${index}' after ${timeoutMs}ms. ` +
      `Last _source: ${JSON.stringify(lastSource, null, 2)}`
  );
};

export const createDataStreamTemplate = async (
  esClient: EsClient,
  templateName: string,
  indexPattern: string,
  mappingProperties: Record<string, unknown>
) => {
  await esClient.indices.putIndexTemplate({
    name: templateName,
    index_patterns: [indexPattern],
    data_stream: {},
    priority: 500,
    template: {
      settings: { index: { default_pipeline: '_none' } },
      mappings: {
        properties: mappingProperties as Record<string, MappingProperty>,
      },
    },
  });
};

export const cleanupDataStream = async (
  esClient: EsClient,
  dataStreamName: string,
  templateName: string
) => {
  await esClient.indices.deleteDataStream({ name: dataStreamName }).catch(() => {
    /* data stream may not exist */
  });
  await esClient.indices.deleteIndexTemplate({ name: templateName }).catch(() => {
    /* template may not exist */
  });
};

export const cleanupEntityIndices = async (esClient: EsClient) => {
  await esClient.deleteByQuery({
    index: UPDATES_INDEX,
    refresh: true,
    query: { match_all: {} },
    ignore_unavailable: true,
  });
  await esClient.deleteByQuery({
    index: LATEST_INDEX,
    refresh: true,
    query: { match_all: {} },
    ignore_unavailable: true,
  });
};

export const seedIntegrationData = async (
  esClient: EsClient,
  config: CommunicatesWithTestConfig
) => {
  const templateName = `test-${config.integrationId}`;
  await createDataStreamTemplate(
    esClient,
    templateName,
    config.dataStreamName,
    config.mappingProperties
  );

  const now = new Date();
  for (const doc of config.sourceDocuments(now)) {
    await ingestDoc(esClient, config.dataStreamName, doc);
  }

  for (const doc of config.idpDocuments(now)) {
    await ingestDoc(esClient, UPDATES_INDEX, doc);
  }
};

export const cleanupIntegrationData = async (
  esClient: EsClient,
  config: CommunicatesWithTestConfig
) => {
  const templateName = `test-${config.integrationId}`;
  await cleanupDataStream(esClient, config.dataStreamName, templateName);
};
