/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';

describe('communicates_with Azure Sign-in Logs buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-azure.signinlogs-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-azure.signinlogs-production');
  });

  it('requires app_display_name to be non-null', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('azure.signinlogs.properties.app_display_name IS NOT NULL');
  });

  it('requires at least one of user.email, user.id, or user.name', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain(
      'user.email IS NOT NULL OR user.id IS NOT NULL OR user.name IS NOT NULL'
    );
  });

  it('hardcodes entity.namespace to "entra_id"', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('entity.namespace = "entra_id"');
  });

  it('builds actorUserId from user.email, user.id, or user.name with @entra_id suffix', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('CONCAT("user:", user.email, "@", entity.namespace)');
    expect(query).toContain('CONCAT("user:", user.id, "@", entity.namespace)');
    expect(query).toContain('CONCAT("user:", user.name, "@", entity.namespace)');
  });

  it('does NOT reference user.domain (unmapped in Azure Sign-in Logs)', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toMatch(/\buser\.domain\b/);
  });

  it('constructs target EUID as service: + app_display_name', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('CONCAT("service:", azure.signinlogs.properties.app_display_name)');
  });

  it('aggregates communicates_with targets per user', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('communicates_with = VALUES(targetEntityId)');
    expect(query).toContain('BY actorUserId');
  });

  it('does not add an explicit success-only filter', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('event.outcome == "success"');
  });

  it('does not fall back to resource_display_name', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('resource_display_name');
  });
});
