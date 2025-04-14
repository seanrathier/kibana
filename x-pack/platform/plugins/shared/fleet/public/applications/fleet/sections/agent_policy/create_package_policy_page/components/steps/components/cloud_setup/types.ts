/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AccountTypes = 'organization-account' | 'single-account';

export type ProviderType = 'aws' | 'gcp' | 'azure';

export interface CloudSetupConfig {
  aws: {
    documentLink: string;
    inputType: string;
    dataStream: string;
  };
  gcp: {
    documentLink: string;
  };
  azure: {
    documentLink: string;
  };
}
