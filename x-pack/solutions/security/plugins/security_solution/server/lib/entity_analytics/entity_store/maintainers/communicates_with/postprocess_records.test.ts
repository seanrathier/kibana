/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postprocessEsqlResults } from './postprocess_records';

describe('communicates_with postprocessEsqlResults', () => {
  const baseColumns = [
    { name: 'actorUserId', type: 'keyword' },
    { name: '_userEmail', type: 'keyword' },
    { name: '_userId', type: 'keyword' },
    { name: '_userName', type: 'keyword' },
    { name: '_ns', type: 'keyword' },
    { name: 'communicates_with', type: 'keyword' },
  ];

  it('maps columns to fields by position', () => {
    const values = [
      [
        'user:alice@acme',
        'alice@acme.com',
        'alice-id',
        'Alice',
        'aws',
        ['service:s3.amazonaws.com'],
      ],
    ];
    const result = postprocessEsqlResults(baseColumns, values);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      entityId: 'user:alice@acme',
      userEmail: 'alice@acme.com',
      userId: 'alice-id',
      userName: 'Alice',
      entityNamespace: 'aws',
      communicates_with: ['service:s3.amazonaws.com'],
    });
  });

  it('returns empty array when values is empty', () => {
    expect(postprocessEsqlResults(baseColumns, [])).toEqual([]);
  });

  it('treats null _userEmail as null', () => {
    const values = [['user:bob@acme', null, 'bob-id', 'Bob', 'azure', ['service:Microsoft Teams']]];
    const result = postprocessEsqlResults(baseColumns, values);
    expect(result[0].userEmail).toBeNull();
  });

  it('treats null _userId as null', () => {
    const values = [
      ['user:bob@acme', 'bob@acme.com', null, 'Bob', 'azure', ['service:Microsoft Teams']],
    ];
    const result = postprocessEsqlResults(baseColumns, values);
    expect(result[0].userId).toBeNull();
  });

  it('treats null _userName as null', () => {
    const values = [
      ['user:bob@acme', 'bob@acme.com', 'bob-id', null, 'azure', ['service:Microsoft Teams']],
    ];
    const result = postprocessEsqlResults(baseColumns, values);
    expect(result[0].userName).toBeNull();
  });

  it('treats null _ns as null', () => {
    const values = [
      ['user:bob@acme', 'bob@acme.com', 'bob-id', 'Bob', null, ['service:Microsoft Teams']],
    ];
    const result = postprocessEsqlResults(baseColumns, values);
    expect(result[0].entityNamespace).toBeNull();
  });

  it('handles null communicates_with as empty array', () => {
    const values = [['user:bob@acme', 'bob@acme.com', 'bob-id', 'Bob', 'aws', null]];
    const result = postprocessEsqlResults(baseColumns, values);
    expect(result[0].communicates_with).toEqual([]);
  });

  it('handles scalar string communicates_with as single-element array', () => {
    const values = [
      ['user:alice@acme', 'alice@acme.com', 'alice-id', 'Alice', 'aws', 'service:s3.amazonaws.com'],
    ];
    const result = postprocessEsqlResults(baseColumns, values);
    expect(result[0].communicates_with).toEqual(['service:s3.amazonaws.com']);
  });

  it('handles multi-value array in communicates_with', () => {
    const targets = ['service:s3.amazonaws.com', 'service:ec2.amazonaws.com'];
    const values = [['user:alice@acme', 'alice@acme.com', 'alice-id', 'Alice', 'aws', targets]];
    const result = postprocessEsqlResults(baseColumns, values);
    expect(result[0].communicates_with).toEqual(targets);
  });

  it('filters non-string values out of communicates_with array', () => {
    const values = [
      [
        'user:alice@acme',
        'alice@acme.com',
        'alice-id',
        'Alice',
        'aws',
        ['service:s3', 42, null, 'service:ec2'],
      ],
    ];
    const result = postprocessEsqlResults(baseColumns, values);
    expect(result[0].communicates_with).toEqual(['service:s3', 'service:ec2']);
  });

  it('drops non-string scalar communicates_with value', () => {
    const values = [['user:alice@acme', 'alice@acme.com', 'alice-id', 'Alice', 'aws', 99]];
    const result = postprocessEsqlResults(baseColumns, values);
    expect(result[0].communicates_with).toEqual([]);
  });

  it('processes multiple rows independently', () => {
    const values = [
      [
        'user:alice@acme',
        'alice@acme.com',
        'alice-id',
        'Alice',
        'aws',
        ['service:s3.amazonaws.com'],
      ],
      ['user:bob@acme', 'bob@acme.com', null, 'Bob', 'azure', 'service:Microsoft Teams'],
    ];
    const result = postprocessEsqlResults(baseColumns, values);

    expect(result).toHaveLength(2);
    expect(result[0].entityId).toBe('user:alice@acme');
    expect(result[1].entityId).toBe('user:bob@acme');
    expect(result[1].communicates_with).toEqual(['service:Microsoft Teams']);
  });
});
