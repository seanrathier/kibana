/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CompositeAfterKey {
  [key: string]: string | null;
}

export interface CompositeBucket {
  key: CompositeAfterKey;
  doc_count: number;
}

export interface ProcessedEntityRecord {
  entityId: string;
  userEmail: string | null;
  userId: string | null;
  userName: string | null;
  entityNamespace: string | null;
  /** Plain EUID strings (e.g. "service:s3.amazonaws.com"). Converted to { euid } objects at upsert time. */
  communicates_with: string[];
}
