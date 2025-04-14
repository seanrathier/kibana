/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFormRow, EuiSelect } from '@elastic/eui';

import { AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ } from '../constants';

import type { AwsCredentialsType, AwsCredentialsTypeOptions } from './types';

export const AwsCredentialTypeSelector = ({
  type,
  onChange,
  label,
  options,
}: {
  onChange(type: AwsCredentialsType): void;
  type: AwsCredentialsType;
  label: string;
  options: AwsCredentialsTypeOptions;
}) => (
  <EuiFormRow fullWidth label={label}>
    <EuiSelect
      fullWidth
      options={options}
      value={type}
      onChange={(optionElem) => {
        onChange(optionElem.target.value as AwsCredentialsType);
      }}
      data-test-subj={AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ}
    />
  </EuiFormRow>
);
