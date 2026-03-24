/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPOSITE_PAGE_SIZE } from '../../constants';
import { getIndexPattern } from './constants';

/**
 * Azure Sign-in Logs uses a hand-written ESQL query instead of the generic
 * EUID helpers because `logs-azure.signinlogs-*` only maps `user.email`,
 * `user.id`, and `user.name` (no `user.domain`).  ESQL validates every column
 * reference at compile time, so referencing unmapped fields causes a
 * verification_exception.
 *
 * entity.namespace is hardcoded to "entra_id" since every document in this
 * index comes from the Azure AD / Entra ID integration.
 */
export function buildEsqlQuery(namespace: string): string {
  return `FROM ${getIndexPattern(namespace)}
| WHERE azure.signinlogs.properties.app_display_name IS NOT NULL
    AND (user.email IS NOT NULL OR user.id IS NOT NULL OR user.name IS NOT NULL)
| EVAL entity.namespace = "entra_id"
| EVAL actorUserId = CASE(
    (user.email IS NOT NULL AND user.email != ""), CONCAT(user.email, "@", entity.namespace),
    (user.id IS NOT NULL AND user.id != ""), CONCAT(user.id, "@", entity.namespace),
    (user.name IS NOT NULL AND user.name != ""), CONCAT(user.name, "@", entity.namespace),
    NULL)
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = CONCAT("service:", azure.signinlogs.properties.app_display_name)
| WHERE targetEntityId IS NOT NULL AND targetEntityId != "service:"
| STATS communicates_with = VALUES(targetEntityId), _userEmail = MIN(user.email), _userId = MIN(user.id), _userName = MIN(user.name), _ns = MIN(entity.namespace) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
