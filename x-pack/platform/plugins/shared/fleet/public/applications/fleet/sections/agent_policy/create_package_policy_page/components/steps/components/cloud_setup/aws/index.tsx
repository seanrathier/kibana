/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { PackageInfo } from '../../../../../../../../../../../common';

import type { AwsFormCredentials } from './types';

import { AwsCredentialsFormAgentless } from './aws_form_agentless';
import { AwsCredentialsForm } from './aws_form_agent_based';

export const AwsCredentials = ({
  packageInfo,
  integrationType,
  isAgentless,
  credentials,
  onChangeCredentials,
  isEditPage,
  documentLink,
}: {
  packageInfo: PackageInfo;
  integrationType: string;
  isAgentless: boolean;
  credentials: AwsFormCredentials;
  onChangeCredentials: (credentials: Partial<AwsFormCredentials>) => void;
  isEditPage: boolean;
  documentLink: string;
}) => {
  if (isAgentless) {
    return (
      <AwsCredentialsFormAgentless
        packageInfo={packageInfo}
        integrationType={integrationType}
        credentials={credentials}
        onChange={onChangeCredentials}
        disabled={isEditPage}
        documentLink={documentLink}
      />
    );
  } else {
    return (
      <AwsCredentialsForm
        packageInfo={packageInfo}
        integrationType={integrationType}
        credentials={credentials}
        onChange={onChangeCredentials}
        disabled={isEditPage}
        documentLink={documentLink}
      />
    );
  }
};
