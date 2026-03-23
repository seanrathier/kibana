/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': '2',
};

export const ENTITY_STORE_ROUTES = {
  INSTALL: 'internal/security/entity_store/install',
  UNINSTALL: 'internal/security/entity_store/uninstall',
  ENTITY_MAINTAINERS_INIT: 'internal/security/entity_store/entity_maintainers/init',
  ENTITY_MAINTAINERS_RUN: (id: string) =>
    `internal/security/entity_store/entity_maintainers/run/${id}`,
} as const;

export const ENTITY_STORE_TAGS = [...tags.stateful.classic, ...tags.serverless.security.complete];

export const UPDATES_INDEX = '.entities.v2.updates.security_default';
export const LATEST_INDEX = '.entities.v2.latest.security_default';
