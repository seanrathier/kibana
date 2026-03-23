/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';

import { ENTITY_STORE_ROUTES } from './constants';

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

const INSTALL_MAX_RETRIES = 3;
const INSTALL_RETRY_DELAY_MS = 5_000;

/**
 * Installs the entity store and initialises maintainers with retry-with-backoff.
 *
 * Safe to call from multiple parallel workers: the install API is idempotent
 * (201 = freshly created, 200 = already installed). A 500 during concurrent
 * installs is retried after a short backoff.
 */
export const installEntityStore = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  kbnClient: KbnClient
) => {
  await kbnClient.uiSettings.update({ 'securitySolution:entityStoreEnableV2': true });

  let lastStatusCode = 0;
  for (let attempt = 1; attempt <= INSTALL_MAX_RETRIES; attempt++) {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers,
      responseType: 'json',
      body: {},
    });

    lastStatusCode = response.statusCode;

    if (response.statusCode === 200 || response.statusCode === 201) {
      break;
    }

    if (attempt < INSTALL_MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, INSTALL_RETRY_DELAY_MS));
    }
  }

  if (lastStatusCode !== 200 && lastStatusCode !== 201) {
    throw new Error(
      `Entity store install failed after ${INSTALL_MAX_RETRIES} attempts (last status: ${lastStatusCode})`
    );
  }

  const initResponse = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
    headers,
    responseType: 'json',
    body: {},
  });

  if (initResponse.statusCode !== 200 && initResponse.statusCode !== 201) {
    throw new Error(`Entity maintainers init failed (status: ${initResponse.statusCode})`);
  }
};
