/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';

import {
  apiTest,
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  UPDATES_INDEX,
  triggerMaintainerRun,
  waitForCommunicatesWith,
  seedIntegrationData,
  cleanupIntegrationData,
  cleanupEntityIndices,
  JAMF_PRO_CONFIG,
} from '../fixtures';

const config = JAMF_PRO_CONFIG;

apiTest.describe(`communicates_with — ${config.name}`, { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient, esClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader, ...COMMON_HEADERS };

    await kbnClient.uiSettings.update({ 'securitySolution:entityStoreEnableV2': true });

    await apiClient
      .post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      })
      .catch(() => {});

    const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect([200, 201]).toContain(installResponse.statusCode);

    const initResponse = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect([200, 201]).toContain(initResponse.statusCode);

    await cleanupEntityIndices(esClient);
    await seedIntegrationData(esClient, config);
  });

  apiTest.afterAll(async ({ esClient, apiClient }) => {
    await cleanupIntegrationData(esClient, config);
    await cleanupEntityIndices(esClient);
    await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest('single communicates_with — updates index', async ({ apiClient, esClient }) => {
    await triggerMaintainerRun(apiClient, defaultHeaders);

    const entity = await waitForCommunicatesWith(
      esClient,
      UPDATES_INDEX,
      config.singleTargetEntityId,
      [config.singleTarget]
    );
    expect(entity).toBeDefined();
  });

  apiTest('multiple communicates_with — updates index', async ({ esClient }) => {
    const entity = await waitForCommunicatesWith(
      esClient,
      UPDATES_INDEX,
      config.multiTargetEntityId,
      config.multiTargets
    );
    expect(entity).toBeDefined();
  });
});
