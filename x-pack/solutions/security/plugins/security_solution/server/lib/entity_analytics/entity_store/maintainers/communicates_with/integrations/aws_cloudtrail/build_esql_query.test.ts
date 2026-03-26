/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';

describe('communicates_with AWS CloudTrail buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-aws.cloudtrail-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-aws.cloudtrail-production');
  });

  it('filters for human IAM identity types', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('aws.cloudtrail.user_identity.type IN (');
    expect(query).toContain('"IAMUser"');
    expect(query).toContain('"AssumedRole"');
    expect(query).toContain('"Root"');
    expect(query).toContain('"FederatedUser"');
    expect(query).toContain('"IdentityCenterUser"');
  });

  it('requires event.provider to be present', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('event.provider IS NOT NULL');
  });

  it('constructs target EUID as service: + event.provider', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('CONCAT("service:", event.provider)');
  });

  it('aggregates communicates_with targets per user', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('communicates_with = VALUES(targetEntityId)');
    expect(query).toContain('BY actorUserId');
  });

  it('uses only user.id for identity (user.name is the IdP name for federated events)', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('user.id IS NOT NULL');
    expect(query).toContain('CONCAT("user:", user.id, "@", entity.namespace)');
    expect(query).toContain('_userId = MIN(user.id)');
    expect(query).not.toContain('user.email');
    expect(query).not.toContain('user.name');
    expect(query).not.toContain('host.id');
  });

  it('does not add an explicit success-only filter', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('event.outcome == "success"');
  });
});
