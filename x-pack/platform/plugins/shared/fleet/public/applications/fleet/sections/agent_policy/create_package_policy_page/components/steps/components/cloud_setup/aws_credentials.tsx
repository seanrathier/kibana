/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiSelect, EuiSpacer, EuiText } from '@elastic/eui';

import { ORGANIZATION_ACCOUNT, AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ } from './constants';
import { FormattedMessage } from '@kbn/i18n-react';

const AWS_CREDENTIALS_TYPE = {
  ASSUME_ROLE: 'assume_role',
  DIRECT_ACCESS_KEYS: 'direct_access_keys',
  TEMPORARY_KEYS: 'temporary_keys',
  SHARED_CREDENTIALS: 'shared_credentials',
  CLOUD_FORMATION: 'cloud_formation',
} as const;

export type AwsCredentialsFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; isSecret?: boolean; dataTestSubj: string }
>;

interface AwsOptionValue {
  label: string;
  info: React.ReactNode;
  fields: AwsCredentialsFields;
}

type AwsOptions = Record<AwsCredentialsType, AwsOptionValue>;

type AwsCredentialsType =
  | 'assume_role'
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'cloud_formation';

type AwsCredentialsTypeOptions = Array<{
  value: AwsCredentialsType;
  text: string;
}>;

const AssumeRoleDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.assumeRoleDescription"
        defaultMessage="An IAM role Amazon Resource Name (ARN) is an IAM identity that you can create in your AWS
      account. When creating an IAM role, users can define the role’s permissions. Roles do not have
      standard long-term credentials such as passwords or access keys."
      />
    </EuiText>
  </div>
);

const DirectAccessKeysDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.directAccessKeysDescription"
        defaultMessage="Access keys are long-term credentials for an IAM user or the AWS account root user."
      />
    </EuiText>
  </div>
);

const TemporaryKeysDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.temporaryKeysDescription"
        defaultMessage="You can configure temporary security credentials in AWS to last for a specified duration. They
      consist of an access key ID, a secret access key, and a security token, which is typically
      found using GetSessionToken."
      />
    </EuiText>
  </div>
);

const SharedCredentialsDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.sharedCredentialsDescription"
        defaultMessage="If you use different AWS credentials for different tools or applications, you can use profiles
      to define multiple access keys in the same configuration file."
      />
    </EuiText>
  </div>
);

const AWS_FIELD_LABEL = {
  access_key_id: i18n.translate('xpack.csp.awsIntegration.accessKeyIdLabel', {
    defaultMessage: 'Access Key ID',
  }),
  secret_access_key: i18n.translate('xpack.csp.awsIntegration.secretAccessKeyLabel', {
    defaultMessage: 'Secret Access Key',
  }),
};

export const getAwsCredentialsFormOptions = (): AwsOptions => ({
  [AWS_CREDENTIALS_TYPE.ASSUME_ROLE]: {
    label: i18n.translate('xpack.csp.awsIntegration.assumeRoleLabel', {
      defaultMessage: 'Assume role',
    }),
    info: AssumeRoleDescription,
    fields: {
      role_arn: {
        label: i18n.translate('xpack.csp.awsIntegration.roleArnLabel', {
          defaultMessage: 'Role ARN',
        }),
        dataTestSubj: 'awsRoleArnInput',
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
    label: i18n.translate('xpack.csp.awsIntegration.directAccessKeyLabel', {
      defaultMessage: 'Direct access keys',
    }),
    info: DirectAccessKeysDescription,
    fields: {
      access_key_id: { label: AWS_FIELD_LABEL.access_key_id, dataTestSubj: 'awsDirectAccessKeyId' },
      secret_access_key: {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'awsDirectAccessSecretKey',
        isSecret: true,
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS]: {
    info: TemporaryKeysDescription,
    label: i18n.translate('xpack.csp.awsIntegration.temporaryKeysLabel', {
      defaultMessage: 'Temporary keys',
    }),
    fields: {
      access_key_id: {
        label: AWS_FIELD_LABEL.access_key_id,
        dataTestSubj: 'awsTemporaryKeysAccessKeyId',
      },
      secret_access_key: {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'awsTemporaryKeysSecretAccessKey',
        isSecret: true,
      },
      session_token: {
        label: i18n.translate('xpack.csp.awsIntegration.sessionTokenLabel', {
          defaultMessage: 'Session Token',
        }),
        dataTestSubj: 'awsTemporaryKeysSessionToken',
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.SHARED_CREDENTIALS]: {
    label: i18n.translate('xpack.csp.awsIntegration.sharedCredentialLabel', {
      defaultMessage: 'Shared credentials',
    }),
    info: SharedCredentialsDescription,
    fields: {
      shared_credential_file: {
        label: i18n.translate('xpack.csp.awsIntegration.sharedCredentialFileLabel', {
          defaultMessage: 'Shared Credential File',
        }),
        dataTestSubj: 'awsSharedCredentialFile',
      },
      credential_profile_name: {
        label: i18n.translate('xpack.csp.awsIntegration.credentialProfileNameLabel', {
          defaultMessage: 'Credential Profile Name',
        }),
        dataTestSubj: 'awsCredentialProfileName',
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.CLOUD_FORMATION]: {
    label: 'CloudFormation',
    info: [],
    fields: {},
  },
});

const getAwsCredentialsTypeSelectorOptions = (
  filterFn: ({ value }: { value: AwsCredentialsType }) => boolean
): AwsCredentialsTypeOptions => {
  return Object.entries(getAwsCredentialsFormOptions())
    .map(([key, value]) => ({
      value: key as AwsCredentialsType,
      text: value.label,
    }))
    .filter(filterFn);
};

const getAwsCredentialsFormAgentlessOptions = (): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(
    ({ value }) =>
      value === AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS ||
      value === AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS
  );

const AwsCredentialTypeSelector = ({
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

export interface AwsFormProps {
  //   newPolicy: NewPackagePolicy;
  //   input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>;
  //   updatePolicy(updatedPolicy: NewPackagePolicy): void;
  //   packageInfo: PackageInfo;
  credentialType: AwsCredentialsType;
  //   accountType: string;
  onChange: any;
  //   setIsValid: (isValid: boolean) => void;
  disabled: boolean;
  //   hasInvalidRequiredVars: boolean;
}

const AwsCredentialsFormAgentless = ({
  //   input,
  //   newPolicy,
  //   packageInfo,
  //   updatePolicy,
  //   hasInvalidRequiredVars,
  credentialType,
  //   accountType,
  onChange,
  disabled,
}: AwsFormProps) => {
  const options = getAwsCredentialsFormOptions();
  const group = options[credentialType];
  //   const fields = getInputVarsFields(input, group.fields);
  //   const documentationLink = cspIntegrationDocsNavigation.cspm.awsGetStartedPath;
  //   const accountType = input?.streams?.[0].vars?.['aws.account_type']?.value ?? SINGLE_ACCOUNT;

  // This should ony set the credentials after the initial render
  //   if (!getAwsCredentialsType(input)) {
  //     updatePolicy({
  //       ...getPosturePolicy(newPolicy, input.type, {
  //         'aws.credentials.type': {
  //           value: awsCredentialsType,
  //           type: 'text',
  //         },
  //       }),
  //     });
  //   }

  //   const automationCredentialTemplate = getTemplateUrlFromPackageInfo(
  //     packageInfo,
  //     input.policy_template,
  //     SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION_CREDENTIALS
  //   )?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType);

  //   const isOrganization = accountType === ORGANIZATION_ACCOUNT;

  return (
    <>
      {/* <AWSSetupInfoContent
        info={
          <FormattedMessage
            id="xpack.csp.awsIntegration.gettingStarted.setupInfoContentAgentless"
            defaultMessage="Utilize AWS Access Keys to set up and deploy CSPM for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
            values={{
              gettingStartedLink: (
                <EuiLink href={documentationLink} target="_blank">
                  <FormattedMessage
                    id="xpack.csp.awsIntegration.gettingStarted.setupInfoContentLink"
                    defaultMessage="Getting Started"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      /> */}
      <EuiSpacer size="l" />
      <AwsCredentialTypeSelector
        label={i18n.translate('xpack.csp.awsIntegration.awsCredentialTypeSelectorLabelAgentless', {
          defaultMessage: 'Preferred method',
        })}
        type={credentialType}
        options={getAwsCredentialsFormAgentlessOptions()}
        onChange={(optionId) => {
          //   updatePolicy(
          //     getPosturePolicy(newPolicy, input.type, {
          //       'aws.credentials.type': { value: optionId },
          //     })
          //   );
        }}
      />
      {/* <EuiSpacer size="m" />
      {awsCredentialsType === DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE &&
        !showCloudCredentialsButton && (
          <>
            <EuiCallOut color="warning">
              <FormattedMessage
                id="xpack.csp.fleetIntegration.awsCloudCredentials.cloudFormationSupportedMessage"
                defaultMessage="Launch Cloud Formation for Automated Credentials not supported in current integration version. Please upgrade to the latest version to enable Launch CloudFormation for automated credentials."
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
      {awsCredentialsType === DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE &&
        showCloudCredentialsButton && (
          <>
            <EuiSpacer size="m" />
            <EuiAccordion
              id="cloudFormationAccordianInstructions"
              data-test-subj="launchGoogleCloudFormationAccordianInstructions"
              buttonContent={<EuiLink>Steps to Generate AWS Account Credentials</EuiLink>}
              paddingSize="l"
            >
              <CloudFormationCloudCredentialsGuide isOrganization={isOrganization} />
            </EuiAccordion>
            <EuiSpacer size="l" />
            <EuiButton
              data-test-subj="launchCloudFormationAgentlessButton"
              target="_blank"
              iconSide="left"
              iconType="launch"
              href={automationCredentialTemplate}
            >
              <FormattedMessage
                id="xpack.csp.agentlessForm.agentlessAWSCredentialsForm.cloudFormation.launchButton"
                defaultMessage="Launch CloudFormation"
              />
            </EuiButton>
            <EuiSpacer size="m" />
          </>
        )}
      <AwsInputVarFields
        fields={fields}
        packageInfo={packageInfo}
        onChange={(key, value) => {
          updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }));
        }}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
      />
      <ReadDocumentation url={documentationLink} /> */}
    </>
  );
};

export const AwsCredentials = ({
  isAgentless,
}: //   onChangeCredentials,
{
  isAgentless: boolean;
  credentialType: AwsCredentialsType;
  onChangeCredentialType: (credentialType: AwsCredentialsType) => void;
}) => {
    const [awsCredentials, setAwsCredentials] = React.useState<AwsCredentialsType>(
  if (isAgentless) {
    return <AwsCredentialsFormAgentless credentialType={credentialType} />;
  } else {
    return <AwsCredentialsFormAgentless credentialType={credentialType} />;
  }
};
