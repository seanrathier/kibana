/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';

import { MAINTAINER_ID } from './constants';
import { runGenericMaintainer } from '../engine/run_maintainer';
import { ACCESSES_ENGINE_CONFIGS } from './configs';

export const accessesFrequentlyMaintainer: RegisterEntityMaintainerConfig = {
  id: MAINTAINER_ID,
  description:
    'Computes accesses_frequently and accesses_infrequently relationships from authentication events',
  interval: '1d',
  initialState: {},
  run: async ({ esClient, logger, status, crudClient, abortController }) => {
    const namespace = status.metadata.namespace;
    logger.info('Starting accesses_frequently maintainer run');
    try {
      const result = await runGenericMaintainer({
        esClient,
        logger,
        namespace,
        crudClient,
        integrations: ACCESSES_ENGINE_CONFIGS,
        abortController,
      });
      logger.info(
        `Completed run: ${result.totalBuckets} user buckets, ${result.totalRecords} records, ${result.totalWritten} entities written`
      );
      return result;
    } catch (err) {
      logger.error(`Maintainer run failed with error: ${err?.message ?? JSON.stringify(err)}`);
      logger.error(`Full error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`);
      throw err;
    }
  },
};
