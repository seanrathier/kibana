/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import type { CspRadioGroupProps } from '../cloud_provider_selector';
import { RadioGroup } from '../cloud_provider_selector';
import { ORGANIZATION_ACCOUNT, SINGLE_ACCOUNT } from '../constants';
import type { AccountTypes } from '../types';

const getAwsAccountTypeOptions = (): CspRadioGroupProps['options'] => [
  {
    id: ORGANIZATION_ACCOUNT,
    label: i18n.translate('xpack.csp.fleetIntegration.awsAccountType.awsOrganizationLabel', {
      defaultMessage: 'AWS Organization',
    }),
    testId: 'awsOrganizationTestId',
  },
  {
    id: SINGLE_ACCOUNT,
    label: i18n.translate('xpack.csp.fleetIntegration.awsAccountType.singleAccountLabel', {
      defaultMessage: 'Single Account',
    }),
    testId: 'awsSingleTestId',
  },
];

export const AwsAccountTypeSelect = ({
  // input,
  // newPolicy,
  // updatePolicy,
  // packageInfo,
  selectedAccountType,
  onChangeAccountType,
  disabled,
}: {
  // input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>;
  // newPolicy: NewPackagePolicy;
  // updatePolicy: (updatedPolicy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
  // packageInfo: PackageInfo;
  selectedAccountType: string;
  onChangeAccountType: (accountType: AccountTypes) => void;
  disabled: boolean;
}) => {
  // This will disable the aws org option for any version below 1.5.0-preview20 which introduced support for account_type. https://github.com/elastic/integrations/pull/6682
  // const isValidSemantic = semverValid(packageInfo.version);
  // const isAwsOrgDisabled = isValidSemantic
  //   ? semverCompare(packageInfo.version, AWS_ORG_MINIMUM_PACKAGE_VERSION) < 0
  //   : true;

  const awsAccountTypeOptions = getAwsAccountTypeOptions();

  // useEffect(() => {
  //   if (!getAwsAccountType(input)) {
  //     updatePolicy(
  //       getPosturePolicy(newPolicy, input.type, {
  //         'aws.account_type': {
  //           value: isAwsOrgDisabled ? AWS_SINGLE_ACCOUNT : AWS_ORGANIZATION_ACCOUNT,
  //           type: 'text',
  //         },
  //       })
  //     );
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [input, updatePolicy]);

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.fleetIntegration.awsAccountTypeDescriptionLabel"
          defaultMessage="Select between single account or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        idSelected={selectedAccountType}
        options={awsAccountTypeOptions}
        onChange={onChangeAccountType}
        size="m"
      />
      {selectedAccountType === ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.awsAccountType.awsOrganizationDescription"
              defaultMessage="Connect Elastic to every AWS Account (current and future) in your environment by providing Elastic with read-only (configuration) access to your AWS organization."
            />
          </EuiText>
        </>
      )}
      {selectedAccountType === SINGLE_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.awsAccountType.singleAccountDescription"
              defaultMessage="Deploying to a single account is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy CSPM at the organization-level, which automatically connects all accounts (both current and future)."
            />
          </EuiText>
        </>
      )}
    </>
  );
};
