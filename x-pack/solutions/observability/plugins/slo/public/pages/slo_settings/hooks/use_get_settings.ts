/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOSettingsResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_STALE_SLO_THRESHOLD_HOURS } from '../../../../common/constants';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export const useGetSettings = () => {
  const { sloClient } = usePluginContext();
  const { isLoading, data } = useQuery({
    queryKey: ['getSloSettings'],
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch('GET /internal/slo/settings', { signal });
      } catch (error) {
        return defaultSettings;
      }
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return { isLoading, data };
};

const defaultSettings: GetSLOSettingsResponse = {
  useAllRemoteClusters: false,
  selectedRemoteClusters: [],
  staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
};
