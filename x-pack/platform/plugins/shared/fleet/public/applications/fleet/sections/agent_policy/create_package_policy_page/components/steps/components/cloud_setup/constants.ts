/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ORGANIZATION_ACCOUNT = 'organization-account';
export const SINGLE_ACCOUNT = 'single-account';

export const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = 'ACCOUNT_TYPE';

export const AWS_CREDENTIALS_TYPE = {
  ASSUME_ROLE: 'assume_role',
  DIRECT_ACCESS_KEYS: 'direct_access_keys',
  TEMPORARY_KEYS: 'temporary_keys',
  SHARED_CREDENTIALS: 'shared_credentials',
  CLOUD_FORMATION: 'cloud_formation',
} as const;
export const DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE = AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS;
export const AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ = 'aws-credentials-type-selector';

export const SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS = {
  CLOUD_FORMATION: 'cloud_formation_template',
  CLOUD_FORMATION_CREDENTIALS: 'cloud_formation_credentials_template',
  ARM_TEMPLATE: 'arm_template_url',
  CLOUD_SHELL_URL: 'cloud_shell_url',
};

export const AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ = {
  CLOUDFORMATION: 'aws-cloudformation-setup-option',
  MANUAL: 'aws-manual-setup-option',
};
