/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  FetchData,
  FetchDataParams,
  LogsFetchDataResponse,
} from '@kbn/observability-plugin/public';
import { DEFAULT_LOG_VIEW, getLogsLocatorFromUrlService } from '@kbn/logs-shared-plugin/common';
import moment from 'moment';
import { TIMESTAMP_FIELD } from '../../common/constants';
import type { InfraClientStartDeps, InfraClientStartServicesAccessor } from '../types';

interface StatsAggregation {
  buckets: Array<{
    key: string;
    doc_count: number;
    series: {
      buckets: Array<{
        key_as_string: string;
        key: number;
        doc_count: number;
      }>;
    };
  }>;
}

interface LogParams {
  index: string;
}

type StatsAndSeries = Pick<LogsFetchDataResponse, 'stats' | 'series'>;

export function getLogsHasDataFetcher(getStartServices: InfraClientStartServicesAccessor) {
  return async () => {
    const [, { logsShared }] = await getStartServices();
    const resolvedLogView = await logsShared.logViews.client.getResolvedLogView(DEFAULT_LOG_VIEW);
    const logViewStatus = await logsShared.logViews.client.getResolvedLogViewStatus(
      resolvedLogView
    );

    const hasData = logViewStatus.index === 'available';
    const indices = resolvedLogView.indices;

    return {
      hasData,
      indices,
    };
  };
}

export function getLogsOverviewDataFetcher(
  getStartServices: InfraClientStartServicesAccessor
): FetchData<LogsFetchDataResponse> {
  return async (params) => {
    const [, { data, logsShared, share }] = await getStartServices();
    const resolvedLogView = await logsShared.logViews.client.getResolvedLogView(DEFAULT_LOG_VIEW);

    const { stats, series } = await fetchLogsOverview(
      {
        index: resolvedLogView.indices,
      },
      params,
      data
    );
    const logsLocator = getLogsLocatorFromUrlService(share.url)!;
    const timeSpanInMinutes = (params.absoluteTime.end - params.absoluteTime.start) / (1000 * 60);

    const appLink = logsLocator.getRedirectUrl({
      timeRange: {
        from: moment(params.absoluteTime.start).toISOString(),
        to: moment(params.absoluteTime.end).toISOString(),
      },
    });

    return {
      appLink,
      stats: normalizeStats(stats, timeSpanInMinutes),
      series: normalizeSeries(series),
    };
  };
}

async function fetchLogsOverview(
  logParams: LogParams,
  params: FetchDataParams,
  dataPlugin: InfraClientStartDeps['data']
): Promise<StatsAndSeries> {
  return new Promise((resolve, reject) => {
    let esResponse: estypes.SearchResponse<any> | undefined;

    dataPlugin.search
      .search({
        params: {
          index: logParams.index,
          body: {
            size: 0,
            query: buildLogOverviewQuery(logParams, params),
            aggs: buildLogOverviewAggregations(logParams, params),
          },
        },
      })
      .subscribe(
        (response) => (esResponse = response.rawResponse),
        (error) => reject(error),
        () => {
          if (esResponse?.aggregations) {
            resolve(processLogsOverviewAggregations(esResponse!.aggregations as any));
          } else {
            resolve({ stats: {}, series: {} });
          }
        }
      );
  });
}

function buildLogOverviewQuery(logParams: LogParams, params: FetchDataParams) {
  return {
    range: {
      [TIMESTAMP_FIELD]: {
        gt: new Date(params.absoluteTime.start).toISOString(),
        lte: new Date(params.absoluteTime.end).toISOString(),
        format: 'strict_date_optional_time',
      },
    },
  };
}

function buildLogOverviewAggregations(logParams: LogParams, params: FetchDataParams) {
  return {
    stats: {
      terms: {
        field: 'event.dataset',
        size: 4,
        missing: 'unknown',
      },
      aggs: {
        series: {
          date_histogram: {
            field: TIMESTAMP_FIELD,
            fixed_interval: params.intervalString,
          },
        },
      },
    },
  };
}

function processLogsOverviewAggregations(aggregations: {
  stats: StatsAggregation;
}): StatsAndSeries {
  const processedStats: StatsAndSeries['stats'] = {};
  const processedSeries: StatsAndSeries['series'] = {};

  aggregations.stats.buckets.forEach((stat) => {
    const label = stat.key;

    processedStats[stat.key] = {
      type: 'number',
      label,
      value: stat.doc_count,
    };

    stat.series.buckets.forEach((series) => {
      processedSeries[label] = processedSeries[label] || { label, coordinates: [] };
      processedSeries[label].coordinates.push({
        x: series.key,
        y: series.doc_count,
      });
    });
  });

  return {
    stats: processedStats,
    series: processedSeries,
  };
}

function normalizeStats(
  stats: LogsFetchDataResponse['stats'],
  timeSpanInMinutes: number
): LogsFetchDataResponse['stats'] {
  return Object.keys(stats).reduce<LogsFetchDataResponse['stats']>((normalized, key) => {
    normalized[key] = {
      ...stats[key],
      value: stats[key].value / timeSpanInMinutes,
    };
    return normalized;
  }, {});
}

function normalizeSeries(series: LogsFetchDataResponse['series']): LogsFetchDataResponse['series'] {
  const seriesKeys = Object.keys(series);
  const timestamps = seriesKeys.flatMap((key) => series[key].coordinates.map((c) => c.x));
  const [first, second] = [...new Set(timestamps)].sort();
  const timeSpanInMinutes = (second - first) / (1000 * 60);

  return seriesKeys.reduce<LogsFetchDataResponse['series']>((normalized, key) => {
    normalized[key] = {
      ...series[key],
      coordinates: series[key].coordinates.map((c) => {
        if (c.y) {
          return { ...c, y: c.y / timeSpanInMinutes };
        }
        return c;
      }),
    };
    return normalized;
  }, {});
}
