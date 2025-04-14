/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiCallOut,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { RadioGroup, type CspRadioOption } from '../cloud_provider_selector';
import {
  AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ,
  AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
  ORGANIZATION_ACCOUNT,
} from '../constants';

import type { AccountTypes } from '../types';

import type {
  AwsCredentialsType,
  AwsCredentialsTypeOptions,
  AwsFormCredentials,
  AwsFormProps,
} from './types';

import { AwsInputVarFields, getAwsCredentialsFormManualOptions } from './aws_credential_input';

interface AWSSetupInfoContentProps {
  info: ReactNode;
}

export type SetupFormat = typeof AWS_SETUP_FORMAT.CLOUD_FORMATION | typeof AWS_SETUP_FORMAT.MANUAL;

export const AWS_SETUP_FORMAT = {
  CLOUD_FORMATION: 'cloud_formation',
  MANUAL: 'manual',
} as const;

export const AWS_CREDENTIALS_TYPE = {
  ASSUME_ROLE: 'assume_role',
  DIRECT_ACCESS_KEYS: 'direct_access_keys',
  TEMPORARY_KEYS: 'temporary_keys',
  SHARED_CREDENTIALS: 'shared_credentials',
  CLOUD_FORMATION: 'cloud_formation',
} as const;

export const AWSSetupInfoContent = ({ info }: AWSSetupInfoContentProps) => {
  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.csp.awsIntegration.setupInfoContentTitle"
            defaultMessage="Setup Access"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        {info}
      </EuiText>
    </>
  );
};

const getSetupFormatOptions = (): CspRadioOption[] => [
  {
    id: AWS_SETUP_FORMAT.CLOUD_FORMATION,
    label: 'CloudFormation',
    testId: AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUDFORMATION,
  },
  {
    id: AWS_SETUP_FORMAT.MANUAL,
    label: i18n.translate('xpack.csp.awsIntegration.setupFormatOptions.manual', {
      defaultMessage: 'Manual',
    }),
    testId: AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL,
  },
];

const CloudFormationSetup = ({
  hasCloudFormationTemplate,
  accountType,
}: {
  hasCloudFormationTemplate: boolean;
  accountType: AccountTypes;
}) => {
  if (!hasCloudFormationTemplate) {
    return (
      <EuiCallOut color="warning">
        <FormattedMessage
          id="xpack.csp.awsIntegration.cloudFormationSetupStep.notSupported"
          defaultMessage="CloudFormation is not supported on the current Integration version, please upgrade your integration to the latest version to use CloudFormation"
        />
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiText color="subdued" size="s">
        <ol
          css={css`
            list-style: auto;
          `}
        >
          <li>
            <FormattedMessage
              id="xpack.csp.awsIntegration.cloudFormationSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          {accountType === ORGANIZATION_ACCOUNT ? (
            <li>
              <FormattedMessage
                id="xpack.csp.awsIntegration.cloudFormationSetupStep.organizationLogin"
                defaultMessage="Log in as an admin in your organization's AWS management account"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.csp.awsIntegration.cloudFormationSetupStep.login"
                defaultMessage="Log in as an admin to the AWS Account you want to onboard"
              />
            </li>
          )}
          <li>
            <FormattedMessage
              id="xpack.csp.awsIntegration.cloudFormationSetupStep.save"
              defaultMessage="Click the Save and continue button on the bottom right of this page"
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.csp.awsIntegration.cloudFormationSetupStep.launch"
              defaultMessage="On the subsequent pop-up modal, click the Launch CloudFormation button."
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="l" />
      <ReadDocumentation url={CLOUD_FORMATION_EXTERNAL_DOC_URL} />
    </>
  );
};

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

const Link = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <EuiLink
    href={url}
    target="_blank"
    rel="noopener nofollow noreferrer"
    data-test-subj="externalLink"
  >
    {children}
  </EuiLink>
);

export const ReadDocumentation = ({ url }: { url: string }) => {
  return (
    <EuiText color="subdued" size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.cloudFormationSetupNote"
        defaultMessage="Read the {documentation} for more details"
        values={{
          documentation: (
            <Link url={url}>
              {i18n.translate('xpack.csp.awsIntegration.documentationLinkText', {
                defaultMessage: 'documentation',
              })}
            </Link>
          ),
        }}
      />
    </EuiText>
  );
};

export const AwsCredentialsForm = ({
  packageInfo,
  integrationType,
  credentials,
  onChange,
  disabled,
  documentLink,
}: AwsFormProps) => {
  //   const {
  //     awsCredentialsType,
  //     setupFormat,
  //     group,
  //     fields,
  //     elasticDocLink,
  //     hasCloudFormationTemplate,
  //     onSetupFormatChange,
  //   } = useAwsCredentialsForm({
  //     newPolicy,
  //     input,
  //     packageInfo,
  //     onChange,
  //     setIsValid,
  //     updatePolicy,
  //   });
  const [setupFormat, setSetupFormat] = React.useState<SetupFormat>(
    AWS_SETUP_FORMAT.CLOUD_FORMATION
  );
  const hasCloudFormationTemplate = true; // TODO: Replace with actual logic to check for CloudFormation template
  //   const [awsCredentialsType, setAwsCredentialsType] = React.useState<AwsCredentialsType>(
  //     AWS_CREDENTIALS_TYPE.CLOUD_FORMATION
  //   ); // TODO: Replace with actual logic to get AWS credentials type
  return (
    <>
      <AWSSetupInfoContent
        info={
          <FormattedMessage
            id="xpack.csp.awsIntegration.gettingStarted.setupInfoContent"
            defaultMessage="Utilize AWS CloudFormation (a built-in AWS tool) or a series of manual steps to set up and deploy CSPM for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
            values={{
              gettingStartedLink: (
                <EuiLink href={documentLink} target="_blank">
                  <FormattedMessage
                    id="xpack.csp.awsIntegration.gettingStarted.setupInfoContentLink"
                    defaultMessage="Getting Started"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        size="m"
        options={getSetupFormatOptions()}
        idSelected={setupFormat}
        onChange={(idSelected: SetupFormat) =>
          idSelected !== setupFormat && setSetupFormat(idSelected)
        }
      />
      <EuiSpacer size="l" />
      {setupFormat === AWS_SETUP_FORMAT.CLOUD_FORMATION && (
        <CloudFormationSetup
          hasCloudFormationTemplate={hasCloudFormationTemplate}
          accountType={credentials.vars['aws.account_type']}
        />
      )}
      {setupFormat === AWS_SETUP_FORMAT.MANUAL && (
        <>
          <AwsCredentialTypeSelector
            label={i18n.translate('xpack.csp.awsIntegration.awsCredentialTypeSelectorLabel', {
              defaultMessage: 'Preferred manual method',
            })}
            options={getAwsCredentialsFormManualOptions()}
            type={credentials.vars['aws.credentials.type']}
            onChange={(optionId) => {
              onChange({
                vars: {
                  'aws.credentials.type': optionId,
                },
              } as Partial<AwsFormCredentials>);
            }}
          />
          <EuiSpacer size="m" />
          {/*  TODO: Replace with actual logic to get group info */}
          {/* {group.info} */}
          <EuiSpacer size="m" />
          <ReadDocumentation url={documentLink} />
          <EuiSpacer size="l" />
          <AwsInputVarFields
            credentials={credentials}
            packageInfo={packageInfo}
            onChange={(key, value) => {
              onChange({
                vars: {
                  [key]: value,
                },
              } as Partial<AwsFormCredentials>); // TODO: Update this to the correct type
            }}
            hasInvalidRequiredVars={false}
          />
        </>
      )}
      <EuiSpacer />
    </>
  );
};
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
