/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { EuiSpacer } from '@elastic/eui';

import { CloudProviderSelector } from './cloud_provider_selector';
import { AwsAccountTypeSelect } from './aws_account_type_selector';
import type { ProviderType } from './types';

interface CloudProviderStreamInput {
  aws: string;
  gcp: string;
  azure: string;
}

interface CloudSetupProps {
  selectedStream?: ProviderType;
  cloudProviderStreamInput: CloudProviderStreamInput;
  isEditPage: boolean;
}

export const CloudSetup = ({
  selectedStream,
  cloudProviderStreamInput,
  isEditPage = false,
}: CloudSetupProps) => {
  const [provider, setProvider] = useState<ProviderType>('aws');
  const [accountType, setAccountType] = useState<string>('single-account');

  return (
    <>
      <CloudProviderSelector
        selectedProvider={provider}
        onChange={setProvider}
        disabled={isEditPage}
      />
      <EuiSpacer size="l" />

      {provider === 'aws' && (
        <AwsAccountTypeSelect
          // input={input}
          // newPolicy={newPolicy}
          // updatePolicy={updatePolicy}
          // packageInfo={packageInfo}
          disabled={isEditPage}
          selectedAccountType={accountType}
          onChangeAccountType={setAccountType}
        />
        <EuiSpacer size="l" />
        <A
      )}

      {/* {provider === 'gcp' && (
        <GcpAccountTypeSelect
          input={input}
          newPolicy={newPolicy}
          updatePolicy={updatePolicy}
          packageInfo={packageInfo}
          disabled={isEditPage}
        />
      )}

      {provider === 'azure' && (
        <AzureAccountTypeSelect
          input={input}
          newPolicy={newPolicy}
          updatePolicy={updatePolicy}
          packageInfo={packageInfo}
          disabled={isEditPage}
          setupTechnology={setupTechnology}
        />
      )} */}

      {/* <PolicyTemplateVarsForm
        input={input}
        newPolicy={newPolicy}
        updatePolicy={updatePolicy}
        packageInfo={packageInfo}
        onChange={onChange}
        setIsValid={setIsValid}
        disabled={isEditPage}
        setupTechnology={setupTechnology}
        isEditPage={isEditPage}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
      /> */}
    </>
  );
};
