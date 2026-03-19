/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCompositeAggQuery } from './build_composite_agg';

describe('communicates_with Jamf Pro buildCompositeAggQuery', () => {
  it('requires user.name to exist', () => {
    const query = buildCompositeAggQuery();
    expect(query.query.bool.filter).toContainEqual({ exists: { field: 'user.name' } });
  });

  it('requires at least one of host.name or host.id to exist', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter;
    const hostFilter = filters.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) =>
        f.bool?.should?.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.exists?.field === 'host.name' || s.exists?.field === 'host.id'
        )
    );
    expect(hostFilter).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((hostFilter as any).bool.minimum_should_match).toBe(1);
  });

  it('does not filter on event.outcome', () => {
    const query = buildCompositeAggQuery();
    const filters = query.query.bool.filter;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outcomeFilter = filters.find((f: any) => f.term?.['event.outcome']);
    expect(outcomeFilter).toBeUndefined();
  });

  it('passes afterKey to composite aggregation when provided', () => {
    const afterKey = { 'user.id': null, 'user.name': 'jane.doe', 'user.email': null };
    const query = buildCompositeAggQuery(afterKey);
    expect(query.aggs.users.composite.after).toEqual(afterKey);
  });
});
