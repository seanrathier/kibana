/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  useEuiTheme,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  type EuiThemeComputed,
} from '@elastic/eui';
import { JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';
import { useMlKibana } from '../../../contexts/kibana';
import { Controls, Cytoscape, JobMapLegend } from './components';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { useRefresh } from '../../../routing/use_refresh';
import { useRefDimensions } from './components/use_ref_dimensions';
import { useFetchAnalyticsMapData } from './use_fetch_analytics_map_data';
import { useCreateAndNavigateToManagementMlLink } from '../../../contexts/kibana/use_create_url';

const getCytoscapeDivStyle = (theme: EuiThemeComputed) => ({
  background: `linear-gradient(
  90deg,
  ${theme.colors.backgroundBasePlain}
    calc(${theme.size.l} - calc(${theme.size.xs} / 2)),
  transparent 1%
)
center,
linear-gradient(
  ${theme.colors.backgroundBasePlain}
    calc(${theme.size.l} - calc(${theme.size.xs} / 2)),
  transparent 1%
)
center,
${theme.colors.lightShade}`,
  backgroundSize: `${theme.size.l} ${theme.size.l}`,
  marginTop: 0,
});

interface Props {
  key?: string;
  defaultHeight?: number;
  analyticsId?: string;
  modelId?: string;
  forceRefresh?: boolean;
}

export const JobMap: FC<Props> = ({ defaultHeight, analyticsId, modelId, forceRefresh }) => {
  // itemsDeleted will reset to false when Controls component calls updateElements to remove nodes deleted from map
  const [itemsDeleted, setItemsDeleted] = useState<boolean>(false);
  const [resetCyToggle, setResetCyToggle] = useState<boolean>(false);
  const {
    elements,
    error,
    fetchAndSetElementsWrapper,
    message,
    nodeDetails,
    setElements,
    setError,
  } = useFetchAnalyticsMapData();

  const {
    services: { notifications },
  } = useMlKibana();
  const { euiTheme } = useEuiTheme();
  const refresh = useRefresh();

  const redirectToAnalyticsManagementPage = useCreateAndNavigateToManagementMlLink(
    ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
    'analytics'
  );

  const updateElements = (nodeId: string, nodeLabel: string, destIndexNode?: string) => {
    // If removing the root job just go back to the jobs list
    if (nodeLabel === analyticsId) {
      redirectToAnalyticsManagementPage();
    } else {
      // Remove job element
      const filteredElements = elements.filter((e) => {
        // Filter out job node and related edges, including trained model node.
        let isNotDeletedNodeOrRelated =
          e.data.id !== nodeId && e.data.target !== nodeId && e.data.source !== nodeId;

        if (e.data.id !== undefined && e.data.type === JOB_MAP_NODE_TYPES.TRAINED_MODEL) {
          // remove training model node related to that job
          isNotDeletedNodeOrRelated =
            isNotDeletedNodeOrRelated &&
            nodeDetails[e.data.id]?.metadata?.analytics_config?.id !== nodeLabel;
        }

        if (destIndexNode !== undefined) {
          // Filter out destination index node for that job
          return (
            isNotDeletedNodeOrRelated &&
            e.data.id !== destIndexNode &&
            e.data.target !== destIndexNode &&
            e.data.source !== destIndexNode
          );
        }

        return isNotDeletedNodeOrRelated;
      });
      setItemsDeleted(true);
      setElements(filteredElements);
    }
  };

  useEffect(() => {
    fetchAndSetElementsWrapper({ analyticsId, modelId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsId, modelId]);

  useEffect(() => {
    if (forceRefresh === true) {
      fetchAndSetElementsWrapper({ analyticsId, modelId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceRefresh]);

  useEffect(() => {
    if (message !== undefined) {
      notifications.toasts.add(message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  useEffect(
    function updateOnTimerRefresh() {
      if (!refresh) return;
      fetchAndSetElementsWrapper({ analyticsId, modelId });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh]
  );

  if (error !== undefined) {
    notifications.toasts.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsMap.fetchDataErrorMessage', {
        defaultMessage: 'Unable to fetch some data. An error occurred: {error}',
        values: { error: JSON.stringify(error) },
      })
    );
    setError(undefined);
  }

  const { ref, width, height } = useRefDimensions();

  const refreshCallback = () => fetchAndSetElementsWrapper({ analyticsId, modelId });
  const hasMissingJobNode = useMemo(
    () => elements.map(({ data }) => data.type).includes(JOB_MAP_NODE_TYPES.ANALYTICS_JOB_MISSING),
    [elements]
  );

  const h = defaultHeight ?? height;
  return (
    <div data-test-subj="mlPageDataFrameAnalyticsMap">
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem>
          <JobMapLegend hasMissingJobNode={hasMissingJobNode} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            data-test-subj="mlAnalyticsResetGraphButton"
            // trigger reset on value change
            onClick={() => setResetCyToggle(!resetCyToggle)}
          >
            <FormattedMessage
              id="xpack.ml.dataframe.analyticsList.resetMapButtonLabel"
              defaultMessage="Reset"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div style={{ height: h - parseInt(euiTheme.size.l, 10) - 20 }} ref={ref}>
        <Cytoscape
          height={h - 20}
          elements={elements}
          width={width}
          style={getCytoscapeDivStyle(euiTheme)}
          itemsDeleted={itemsDeleted}
          resetCy={resetCyToggle}
        >
          <Controls
            details={nodeDetails}
            getNodeData={fetchAndSetElementsWrapper}
            modelId={modelId}
            updateElements={updateElements}
            refreshJobsCallback={refreshCallback}
          />
        </Cytoscape>
      </div>
    </div>
  );
};
