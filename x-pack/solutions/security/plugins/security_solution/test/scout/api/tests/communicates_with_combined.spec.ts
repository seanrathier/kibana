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
  ALL_INTEGRATION_CONFIGS,
} from '../fixtures';

apiTest.describe(
  'communicates_with — all integrations combined',
  { tag: ENTITY_STORE_TAGS },
  () => {
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
      for (const integrationConfig of ALL_INTEGRATION_CONFIGS) {
        await seedIntegrationData(esClient, integrationConfig);
      }
    });

    apiTest.afterAll(async ({ esClient, apiClient }) => {
      for (const integrationConfig of ALL_INTEGRATION_CONFIGS) {
        await cleanupIntegrationData(esClient, integrationConfig);
      }
      await cleanupEntityIndices(esClient);
      await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    });

    apiTest(
      'processes all integrations in one pass — updates index',
      async ({ apiClient, esClient }) => {
        await triggerMaintainerRun(apiClient, defaultHeaders);

        for (const integrationConfig of ALL_INTEGRATION_CONFIGS) {
          const singleEntity = await waitForCommunicatesWith(
            esClient,
            UPDATES_INDEX,
            integrationConfig.singleTargetEntityId,
            [integrationConfig.singleTarget]
          );
          expect(singleEntity).toBeDefined();

          const multiEntity = await waitForCommunicatesWith(
            esClient,
            UPDATES_INDEX,
            integrationConfig.multiTargetEntityId,
            integrationConfig.multiTargets
          );
          expect(multiEntity).toBeDefined();
        }
      }
    );
  }
);
