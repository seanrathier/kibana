/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiSpacer } from '@elastic/eui';

import type { NewPackagePolicy, PackageInfo } from '../../../../../../../../../../common/types';

import { CloudProviderSelector } from './cloud_provider_selector';
import { AwsAccountTypeSelect } from './aws/aws_account_type_selector';
import type { AccountTypes, ProviderType } from './types';
import { AwsCredentials } from './aws';
import { useAws } from './aws/use_aws';

interface CloudSetupProps {
  packagePolicy: NewPackagePolicy;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  packageInfo: PackageInfo;
  integrationType: string;
  isEditPage: boolean;
  isAgentlessSelected?: boolean;
  cloudSetupConfig: CloudSetupConfig;
}

interface CloudSetupConfig {
  aws: {
    documentLink: string;
  };
  gcp: {
    documentLink: string;
  };
  azure: {
    documentLink: string;
  };
}

export const CloudSetup = ({
  packagePolicy,
  updatePackagePolicy,
  packageInfo,
  integrationType,
  isEditPage = false,
  isAgentlessSelected = false,
  cloudSetupConfig,
}: CloudSetupProps) => {
  const [provider, setProvider] = useState<ProviderType>('aws');

  const { awsCredentials, setAwsCredential } = useAws(provider);

  return (
    <>
      <CloudProviderSelector
        selectedProvider={provider}
        onChange={setProvider}
        disabled={isEditPage}
      />
      <EuiSpacer size="l" />

      {provider === 'aws' && (
        <>
          <AwsAccountTypeSelect
            disabled={isEditPage}
            selectedAccountType={awsCredentials.vars.accountType}
            onChangeAccountType={(accountType: AccountTypes) => {
              setAwsCredential({
                ...awsCredentials,
                vars: {
                  ...awsCredentials.vars,
                  accountType,
                },
              });
            }}
          />
          <EuiSpacer size="l" />
          <AwsCredentials
            packageInfo={packageInfo}
            integrationType={integrationType}
            isEditPage={isEditPage}
            isAgentless={isAgentlessSelected}
            credentials={awsCredentials}
            onChangeCredentials={setAwsCredential}
            documentLink={cloudSetupConfig.aws.documentLink}
          />
        </>
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
