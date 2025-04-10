/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiSelect, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { AWS_CREDENTIALS_TYPE, AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ } from '../constants';

import type { AwsCredentialsType, AwsCredentialsTypeOptions, AwsOptions } from './types';

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

export const getAwsCredentialsFormAgentlessOptions = (): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(
    ({ value }) =>
      value === AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS ||
      value === AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS
  );

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
