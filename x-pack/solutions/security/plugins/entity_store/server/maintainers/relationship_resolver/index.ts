/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '../../tasks/entity_maintainers/types';
import type { RelationshipResolverState } from './types';
import { runRelationshipResolver } from './run';

const MAINTAINER_ID = 'relationship-resolver';

const initialState: RelationshipResolverState = {
  lastProcessedTimestamp: null,
  lastRun: null,
};

export const relationshipResolverMaintainerConfig: RegisterEntityMaintainerConfig = {
  id: MAINTAINER_ID,
  description: 'Resolves raw relationship identifiers to confirmed entity IDs',
  interval: '5m',
  initialState,
  minLicense: 'enterprise',
  run: async ({ status, abortController, logger, esClient, crudClient }) => {
    const namespace = status.metadata.namespace;
    const state = status.state as RelationshipResolverState;

    return runRelationshipResolver({
      state,
      namespace,
      esClient,
      crudClient,
      logger,
      abortController,
    });
  },
};
