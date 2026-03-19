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
    // communicates_with includes both success and failure outcomes.
    // The EUID infrastructure may reference event.outcome internally, but we
    // never add event.outcome == "success".
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('event.outcome == "success"');
  });

  it('does not fall back to resource_display_name', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('resource_display_name');
  });
});
