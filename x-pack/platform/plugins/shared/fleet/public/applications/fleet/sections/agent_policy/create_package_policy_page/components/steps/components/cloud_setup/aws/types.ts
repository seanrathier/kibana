/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../../../../../../../../../../common';
import type { AccountTypes } from '../types';

export type AwsCredentialsFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; isSecret?: boolean; dataTestSubj: string }
>;

interface AwsOptionValue {
  label: string;
  info: React.ReactNode;
  fields: AwsCredentialsFields;
}

export type AwsOptions = Record<AwsCredentialsType, AwsOptionValue>;

export type AwsCredentialsType =
  | 'assume_role'
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'cloud_formation';

export type AwsCredentialsTypeOptions = Array<{
  value: AwsCredentialsType;
  text: string;
}>;

export interface AwsFormCredentials {
  enabled: boolean;
  vars: {
    'aws.account_type': AccountTypes;
    'aws.credentials.type': AwsCredentialsType;
    'aws.access_key_id'?: string;
    'aws.secret_access_key'?: string;
    'aws.session_token'?: string;
    'aws.shared_credential_file'?: string;
    'aws.credential_profile_name'?: string;
    'aws.role_arn'?: string;
  };
}
export interface AwsFormProps {
  packageInfo: PackageInfo;
  integrationType: string;
  credentials: AwsFormCredentials;
  onChange: (credentials: Partial<AwsFormCredentials>) => void;
  disabled: boolean;
  documentLink: string;
}
