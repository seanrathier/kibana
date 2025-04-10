/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ProviderType } from '../types';

import type { AwsFormCredentials } from './types';

export const useAws = (provider: ProviderType) => {
  const [credentials, setCredential] = React.useState<AwsFormCredentials>({
    enabled: false,
    vars: {
      accountType: 'organization-account',
      credentialType: 'direct_access_keys',
    },
  });

  if (provider === 'aws' && !credentials.enabled) {
    setCredential({
      ...credentials,
      enabled: true,
    });
  } else if (provider !== 'aws' && credentials.enabled) {
    setCredential({
      ...credentials,
      enabled: false,
    });
  }

  const onChangeCredentials = (newCredentials: Partial<AwsFormCredentials>) => {
    setCredential({
      ...credentials,
      ...newCredentials,
      vars: {
        ...credentials.vars,
        ...newCredentials.vars,
      },
    });
  };

  console.log('aws credentials', credentials);

  return {
    awsCredentials: credentials,
    setAwsCredential: onChangeCredentials,
  };
};
