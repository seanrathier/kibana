/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlQuery } from './build_esql_query';

describe('communicates_with Jamf Pro buildEsqlQuery', () => {
  it('uses the namespace to form the index pattern', () => {
    expect(buildEsqlQuery('default')).toContain('FROM logs-jamf_pro.events-default');
    expect(buildEsqlQuery('production')).toContain('FROM logs-jamf_pro.events-production');
  });

  it('filters for non-null user.name', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('user.name IS NOT NULL');
    expect(query).toContain('user.name != ""');
  });

  it('requires at least one of host.name or host.id', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('host.name IS NOT NULL OR host.id IS NOT NULL');
  });

  it('hardcodes entity.namespace to "jamf_pro"', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('entity.namespace = "jamf_pro"');
  });

  it('builds actorUserId from user.email or user.name with @jamf_pro suffix', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('CONCAT(user.email, "@", entity.namespace)');
    expect(query).toContain('CONCAT(user.name, "@", entity.namespace)');
  });

  it('does NOT reference user.id or user.domain (unmapped in Jamf Pro)', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toMatch(/\buser\.id\b/);
    expect(query).not.toMatch(/\buser\.domain\b/);
  });

  it('builds targetEntityId with host: prefix from host.id or host.name', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('CONCAT("host:", host.id)');
    expect(query).toContain('CONCAT("host:", host.name)');
  });

  it('uses MV_EXPAND to handle multi-value host targets', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('MV_EXPAND targetEntityId');
  });

  it('aggregates communicates_with targets per user', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('communicates_with = VALUES(targetEntityId)');
    expect(query).toContain('BY actorUserId');
  });

  it('captures identity fields for EUID reconstruction in extraction pipeline', () => {
    const query = buildEsqlQuery('default');
    expect(query).toContain('_userEmail = MIN(user.email)');
    expect(query).toContain('_userName = MIN(user.name)');
  });

  it('does not add an explicit success-only filter', () => {
    const query = buildEsqlQuery('default');
    expect(query).not.toContain('event.outcome == "success"');
  });
});
