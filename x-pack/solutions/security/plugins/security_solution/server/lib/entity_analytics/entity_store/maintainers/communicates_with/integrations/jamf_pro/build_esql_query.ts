/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPOSITE_PAGE_SIZE } from '../../constants';
import { getIndexPattern } from './constants';

/**
 * Jamf Pro uses a hand-written ESQL query instead of the generic EUID helpers
 * because `logs-jamf_pro.events-*` only maps `user.email` and `user.name`
 * (no `user.id` or `user.domain`).  ESQL validates every column reference at
 * compile time, so referencing unmapped fields causes a verification_exception.
 *
 * entity.namespace is hardcoded to "jamf_pro" since every document in this
 * index comes from the same integration.
 */
export function buildEsqlQuery(namespace: string): string {
  return `FROM ${getIndexPattern(namespace)}
| WHERE user.name IS NOT NULL AND user.name != ""
    AND (host.name IS NOT NULL OR host.id IS NOT NULL)
| EVAL entity.namespace = "jamf_pro"
| EVAL actorUserId = CASE(
    (user.email IS NOT NULL AND user.email != ""), CONCAT("user:", user.email, "@", entity.namespace),
    CONCAT("user:", user.name, "@", entity.namespace))
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = CASE(
    (host.id IS NOT NULL AND host.id != ""), CONCAT("host:", host.id),
    CONCAT("host:", host.name))
| MV_EXPAND targetEntityId
| WHERE targetEntityId IS NOT NULL AND targetEntityId != "host:"
| STATS communicates_with = VALUES(targetEntityId) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
