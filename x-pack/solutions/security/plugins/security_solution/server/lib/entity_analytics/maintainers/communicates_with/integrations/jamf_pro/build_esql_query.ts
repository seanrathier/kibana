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
 * Jamf Pro uses field evaluations from the EUID helpers for entity.namespace
 * derivation but a hand-written actorUserId CASE because
 * `logs-jamf_pro.events-*` lacks `user.id` and `user.domain`.  The full
 * `euid.esql.getEuidEvaluation('user')` would reference those unmapped fields
 * and cause a verification_exception.
 */
export function buildEsqlQuery(namespace: string): string {
  const userFieldEvals = euid.esql.getFieldEvaluations('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';

  return `FROM ${getIndexPattern(namespace)}
| WHERE user.name IS NOT NULL AND user.name != ""
    AND (host.name IS NOT NULL OR host.id IS NOT NULL)
${userFieldEvalsLine}| EVAL actorUserId = CASE(
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
