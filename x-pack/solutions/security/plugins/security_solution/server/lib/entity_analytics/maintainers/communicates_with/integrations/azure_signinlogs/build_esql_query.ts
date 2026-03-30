/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';

import { COMPOSITE_PAGE_SIZE } from '../../constants';
import { getIndexPattern } from './constants';

/**
 * Azure Sign-in Logs uses field evaluations from the EUID helpers for
 * entity.namespace derivation but a hand-written actorUserId CASE because
 * `logs-azure.signinlogs-*` lacks `user.domain`.  The full
 * `euid.esql.getEuidEvaluation('user')` would reference that unmapped field
 * and cause a verification_exception.
 */
export function buildEsqlQuery(namespace: string): string {
  const userFieldEvals = euid.esql.getFieldEvaluations('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';

  return `FROM ${getIndexPattern(namespace)}
| WHERE azure.signinlogs.properties.app_display_name IS NOT NULL
    AND (user.email IS NOT NULL OR user.id IS NOT NULL OR user.name IS NOT NULL)
${userFieldEvalsLine}| EVAL actorUserId = CASE(
    (user.email IS NOT NULL AND user.email != ""), CONCAT("user:", user.email, "@", entity.namespace),
    (user.id IS NOT NULL AND user.id != ""), CONCAT("user:", user.id, "@", entity.namespace),
    (user.name IS NOT NULL AND user.name != ""), CONCAT("user:", user.name, "@", entity.namespace),
    NULL)
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = CONCAT("service:", azure.signinlogs.properties.app_display_name)
| WHERE targetEntityId IS NOT NULL AND targetEntityId != "service:"
| STATS communicates_with = VALUES(targetEntityId) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
