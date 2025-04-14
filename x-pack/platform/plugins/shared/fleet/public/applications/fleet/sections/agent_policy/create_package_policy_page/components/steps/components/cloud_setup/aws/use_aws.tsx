/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { ProviderType } from '../types';

import type {
  NewPackagePolicy,
  NewPackagePolicyInputStream,
} from '../../../../../../../../../../../common';

import type { CloudSetupConfig } from '../types';

import type { AwsFormCredentials } from './types';

export const useAws = (
  provider: ProviderType,
  awsConfig: CloudSetupConfig['aws'],
  packagePolicy: NewPackagePolicy,
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void
) => {
  const [credentials, setCredential] = React.useState<AwsFormCredentials>({
    enabled: false,
    vars: {
      'aws.account_type': 'organization-account',
      'aws.credentials.type': 'direct_access_keys',
    },
  });

  const updateStreamVars = (
    streamVars: NewPackagePolicyInputStream['vars'],
    newVars: AwsFormCredentials['vars']
  ) => {
    if (!streamVars) {
      return {};
    }

    Object.keys(streamVars).forEach((key) => {
      if (newVars[key as keyof AwsFormCredentials['vars']] !== undefined) {
        streamVars[key].value = newVars[key as keyof AwsFormCredentials['vars']];
      }
    });

    return {
      ...streamVars,
    };
  };

  const onChangeCredentials = (newCredentials: Partial<AwsFormCredentials>) => {
    const updatedCredentials = {
      ...credentials,
      ...newCredentials,
      vars: {
        ...credentials.vars,
        ...newCredentials.vars,
      },
    };
    setCredential(updatedCredentials);

    const newPackagePolicy: NewPackagePolicy = {
      ...packagePolicy,
      inputs: packagePolicy.inputs.map((input) => {
        if (input.type === awsConfig.inputType) {
          return {
            ...input,
            enabled: updatedCredentials.enabled,
            streams: input.streams.map((stream) => {
              if (stream.data_stream.dataset === awsConfig.dataStream) {
                return {
                  ...stream,
                  enabled: updatedCredentials.enabled,
                  vars: {
                    ...stream.vars,
                    ...updateStreamVars(stream.vars, updatedCredentials.vars),
                  },
                };
              }
              return stream;
            }),
          };
        }
        return input;
      }),
    };
    console.log('updatedCredentials', updatedCredentials);
    console.log('newPackagePolicy', newPackagePolicy);
    updatePackagePolicy(newPackagePolicy);
  };

  if (provider === 'aws' && !credentials.enabled) {
    const newCredentials = {
      ...credentials,
      enabled: true,
    };
    setCredential(newCredentials);
    onChangeCredentials(newCredentials);
  } else if (provider !== 'aws' && credentials.enabled) {
    const newCredentials = {
      ...credentials,
      enabled: false,
    };
    setCredential(newCredentials);
    onChangeCredentials(newCredentials);
  }

  return {
    awsCredentials: credentials,
    setAwsCredential: onChangeCredentials,
  };
};
