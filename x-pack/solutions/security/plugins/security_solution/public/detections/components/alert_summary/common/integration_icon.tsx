/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { CardIcon } from '@kbn/fleet-plugin/public';
import type { IconSize } from '@elastic/eui/src/components/icon/icon';
import type { PackageListItem } from '@kbn/fleet-plugin/common';

export const INTEGRATION_LOADING_SKELETON_TEST_ID = 'integration-loading-skeleton';
export const INTEGRATION_ICON_TEST_ID = 'integration-icon';

interface IntegrationProps {
  /**
   * Optional data test subject string
   */
  'data-test-subj'?: string;
  /**
   * Changes the size of the icon. Uses the Eui IconSize interface.
   * Defaults to s
   */
  iconSize?: IconSize;
  /**
   * Id of the rule the alert was generated by
   */
  integration: PackageListItem | undefined;
  /**
   * If true, renders a EuiSkeletonText
   */
  isLoading?: boolean;
}

/**
 * Renders the icon for the integration. Renders a EuiSkeletonText if loading.
 */
export const IntegrationIcon = memo(
  ({
    'data-test-subj': dataTestSubj,
    iconSize = 's',
    integration,
    isLoading = false,
  }: IntegrationProps) => (
    <EuiSkeletonText
      data-test-subj={`${dataTestSubj}-${INTEGRATION_LOADING_SKELETON_TEST_ID}`}
      isLoading={isLoading}
      lines={1}
    >
      {integration ? (
        <CardIcon
          data-test-subj={`${dataTestSubj}-${INTEGRATION_ICON_TEST_ID}`}
          icons={integration.icons}
          integrationName={integration.title}
          packageName={integration.name}
          size={iconSize}
          version={integration.version}
        />
      ) : null}
    </EuiSkeletonText>
  )
);

IntegrationIcon.displayName = 'IntegrationIcon';
