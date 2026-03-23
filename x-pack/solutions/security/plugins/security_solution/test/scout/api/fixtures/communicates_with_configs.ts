/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CommunicatesWithTestConfig {
  integrationId: string;
  name: string;
  dataStreamName: string;
  singleTargetEntityId: string;
  singleTarget: string;
  multiTargetEntityId: string;
  multiTargets: string[];
  mappingProperties: Record<string, unknown>;
  sourceDocuments: (now: Date) => Array<Record<string, unknown>>;
  idpDocuments: (now: Date) => Array<Record<string, unknown>>;
}

const ts = (now: Date, minutesAgo: number) =>
  new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString();

export const AWS_CLOUDTRAIL_CONFIG: CommunicatesWithTestConfig = {
  integrationId: 'aws_cloudtrail',
  name: 'AWS CloudTrail',
  dataStreamName: 'logs-aws.cloudtrail-default',
  singleTargetEntityId: 'cw-user-a@example.com@aws',
  singleTarget: 'service:s3.amazonaws.com',
  multiTargetEntityId: 'cw-user-b@example.com@aws',
  multiTargets: [
    'service:ec2.amazonaws.com',
    'service:lambda.amazonaws.com',
    'service:s3.amazonaws.com',
  ],
  mappingProperties: {
    '@timestamp': { type: 'date' },
    user: {
      properties: {
        email: { type: 'keyword' },
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        domain: { type: 'keyword' },
      },
    },
    event: {
      properties: {
        provider: { type: 'keyword' },
        module: { type: 'keyword' },
        kind: { type: 'keyword' },
        outcome: { type: 'keyword' },
        category: { type: 'keyword' },
      },
    },
    aws: {
      properties: {
        cloudtrail: {
          properties: {
            user_identity: { properties: { type: { type: 'keyword' } } },
          },
        },
      },
    },
    data_stream: {
      properties: {
        dataset: { type: 'keyword' },
        namespace: { type: 'keyword' },
        type: { type: 'keyword' },
      },
    },
  },
  sourceDocuments: (now) => [
    {
      '@timestamp': ts(now, 5),
      user: { email: 'cw-user-a@example.com' },
      event: { provider: 's3.amazonaws.com', outcome: 'success' },
      aws: { cloudtrail: { user_identity: { type: 'IAMUser' } } },
      data_stream: { dataset: 'aws.cloudtrail', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 4),
      user: { email: 'cw-user-b@example.com' },
      event: { provider: 's3.amazonaws.com', outcome: 'success' },
      aws: { cloudtrail: { user_identity: { type: 'IAMUser' } } },
      data_stream: { dataset: 'aws.cloudtrail', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 3),
      user: { email: 'cw-user-b@example.com' },
      event: { provider: 'ec2.amazonaws.com', outcome: 'success' },
      aws: { cloudtrail: { user_identity: { type: 'IAMUser' } } },
      data_stream: { dataset: 'aws.cloudtrail', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 2),
      user: { email: 'cw-user-b@example.com' },
      event: { provider: 'lambda.amazonaws.com', outcome: 'success' },
      aws: { cloudtrail: { user_identity: { type: 'IAMUser' } } },
      data_stream: { dataset: 'aws.cloudtrail', namespace: 'default', type: 'logs' },
    },
  ],
  idpDocuments: (now) => [
    {
      '@timestamp': ts(now, 5),
      event: { kind: 'asset', module: 'aws' },
      user: { email: 'cw-user-a@example.com' },
    },
    {
      '@timestamp': ts(now, 4),
      event: { kind: 'asset', module: 'aws' },
      user: { email: 'cw-user-b@example.com' },
    },
  ],
};

export const AZURE_SIGNINLOGS_CONFIG: CommunicatesWithTestConfig = {
  integrationId: 'azure_signinlogs',
  name: 'Azure Sign-in Logs',
  dataStreamName: 'logs-azure.signinlogs-default',
  singleTargetEntityId: 'cw-user-a@example.com@entra_id',
  singleTarget: 'service:Microsoft Office 365',
  multiTargetEntityId: 'cw-user-b@example.com@entra_id',
  multiTargets: ['service:Azure Portal', 'service:Microsoft Office 365', 'service:Microsoft Teams'],
  mappingProperties: {
    '@timestamp': { type: 'date' },
    user: {
      properties: {
        email: { type: 'keyword' },
        id: { type: 'keyword' },
        name: { type: 'keyword' },
      },
    },
    event: {
      properties: {
        kind: { type: 'keyword' },
        outcome: { type: 'keyword' },
        category: { type: 'keyword' },
      },
    },
    azure: {
      properties: {
        signinlogs: {
          properties: {
            properties: {
              properties: {
                app_display_name: { type: 'keyword' },
              },
            },
          },
        },
      },
    },
    data_stream: {
      properties: {
        dataset: { type: 'keyword' },
        namespace: { type: 'keyword' },
        type: { type: 'keyword' },
      },
    },
  },
  sourceDocuments: (now) => [
    {
      '@timestamp': ts(now, 5),
      user: { email: 'cw-user-a@example.com' },
      azure: { signinlogs: { properties: { app_display_name: 'Microsoft Office 365' } } },
      data_stream: { dataset: 'azure.signinlogs', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 4),
      user: { email: 'cw-user-b@example.com' },
      azure: { signinlogs: { properties: { app_display_name: 'Microsoft Office 365' } } },
      data_stream: { dataset: 'azure.signinlogs', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 3),
      user: { email: 'cw-user-b@example.com' },
      azure: { signinlogs: { properties: { app_display_name: 'Microsoft Teams' } } },
      data_stream: { dataset: 'azure.signinlogs', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 2),
      user: { email: 'cw-user-b@example.com' },
      azure: { signinlogs: { properties: { app_display_name: 'Azure Portal' } } },
      data_stream: { dataset: 'azure.signinlogs', namespace: 'default', type: 'logs' },
    },
  ],
  idpDocuments: (now) => [
    {
      '@timestamp': ts(now, 5),
      event: { kind: 'asset', module: 'azure' },
      user: { email: 'cw-user-a@example.com' },
    },
    {
      '@timestamp': ts(now, 4),
      event: { kind: 'asset', module: 'azure' },
      user: { email: 'cw-user-b@example.com' },
    },
  ],
};

export const OKTA_CONFIG: CommunicatesWithTestConfig = {
  integrationId: 'okta',
  name: 'Okta',
  dataStreamName: 'logs-okta.system-default',
  singleTargetEntityId: 'cw-user-a@example.com@okta',
  singleTarget: 'service:Salesforce',
  multiTargetEntityId: 'cw-user-b@example.com@okta',
  multiTargets: ['service:Jira', 'service:Salesforce', 'service:Slack'],
  mappingProperties: {
    '@timestamp': { type: 'date' },
    user: {
      properties: {
        email: { type: 'keyword' },
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        domain: { type: 'keyword' },
      },
    },
    event: {
      properties: {
        action: { type: 'keyword' },
        module: { type: 'keyword' },
        kind: { type: 'keyword' },
        outcome: { type: 'keyword' },
        category: { type: 'keyword' },
      },
    },
    okta: {
      properties: {
        target: {
          properties: {
            display_name: { type: 'keyword' },
          },
        },
      },
    },
    data_stream: {
      properties: {
        dataset: { type: 'keyword' },
        namespace: { type: 'keyword' },
        type: { type: 'keyword' },
      },
    },
  },
  sourceDocuments: (now) => [
    {
      '@timestamp': ts(now, 5),
      user: { email: 'cw-user-a@example.com' },
      event: { action: 'user.authentication.sso' },
      okta: { target: { display_name: 'Salesforce' } },
      data_stream: { dataset: 'okta.system', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 4),
      user: { email: 'cw-user-b@example.com' },
      event: { action: 'user.authentication.sso' },
      okta: { target: { display_name: 'Salesforce' } },
      data_stream: { dataset: 'okta.system', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 3),
      user: { email: 'cw-user-b@example.com' },
      event: { action: 'user.authentication.sso' },
      okta: { target: { display_name: 'Slack' } },
      data_stream: { dataset: 'okta.system', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 2),
      user: { email: 'cw-user-b@example.com' },
      event: { action: 'user.session.start' },
      okta: { target: { display_name: 'Jira' } },
      data_stream: { dataset: 'okta.system', namespace: 'default', type: 'logs' },
    },
  ],
  idpDocuments: (now) => [
    {
      '@timestamp': ts(now, 5),
      event: { kind: 'asset', module: 'okta' },
      user: { email: 'cw-user-a@example.com' },
    },
    {
      '@timestamp': ts(now, 4),
      event: { kind: 'asset', module: 'okta' },
      user: { email: 'cw-user-b@example.com' },
    },
  ],
};

export const JAMF_PRO_CONFIG: CommunicatesWithTestConfig = {
  integrationId: 'jamf_pro',
  name: 'Jamf Pro',
  dataStreamName: 'logs-jamf_pro.events-default',
  singleTargetEntityId: 'cw-user-a@jamf_pro',
  singleTarget: 'host:host-001',
  multiTargetEntityId: 'cw-user-b@jamf_pro',
  multiTargets: ['host:host-001', 'host:host-002', 'host:host-003'],
  mappingProperties: {
    '@timestamp': { type: 'date' },
    user: {
      properties: {
        email: { type: 'keyword' },
        name: { type: 'keyword' },
      },
    },
    host: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
      },
    },
    event: {
      properties: {
        kind: { type: 'keyword' },
        outcome: { type: 'keyword' },
        category: { type: 'keyword' },
      },
    },
    data_stream: {
      properties: {
        dataset: { type: 'keyword' },
        namespace: { type: 'keyword' },
        type: { type: 'keyword' },
      },
    },
  },
  sourceDocuments: (now) => [
    {
      '@timestamp': ts(now, 5),
      user: { name: 'cw-user-a' },
      host: { id: 'host-001', name: 'macbook-pro-1' },
      data_stream: { dataset: 'jamf_pro.events', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 4),
      user: { name: 'cw-user-b' },
      host: { id: 'host-001', name: 'macbook-pro-1' },
      data_stream: { dataset: 'jamf_pro.events', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 3),
      user: { name: 'cw-user-b' },
      host: { id: 'host-002', name: 'macbook-air-1' },
      data_stream: { dataset: 'jamf_pro.events', namespace: 'default', type: 'logs' },
    },
    {
      '@timestamp': ts(now, 2),
      user: { name: 'cw-user-b' },
      host: { id: 'host-003', name: 'imac-1' },
      data_stream: { dataset: 'jamf_pro.events', namespace: 'default', type: 'logs' },
    },
  ],
  idpDocuments: (now) => [
    {
      '@timestamp': ts(now, 5),
      event: { kind: 'asset', module: 'jamf_pro' },
      user: { name: 'cw-user-a' },
    },
    {
      '@timestamp': ts(now, 4),
      event: { kind: 'asset', module: 'jamf_pro' },
      user: { name: 'cw-user-b' },
    },
  ],
};

export const ALL_INTEGRATION_CONFIGS: CommunicatesWithTestConfig[] = [
  AWS_CLOUDTRAIL_CONFIG,
  AZURE_SIGNINLOGS_CONFIG,
  OKTA_CONFIG,
  JAMF_PRO_CONFIG,
];
