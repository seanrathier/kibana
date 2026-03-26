/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { COMPOSITE_PAGE_SIZE } from '../../constants';
import { getIndexPattern, HUMAN_IAM_IDENTITY_TYPES } from './constants';

/**
 * CloudTrail indices lack user.email, user.domain, and host.id so we cannot
 * use the generic EUID helpers (ES|QL validates every column at compile time).
 *
 * user.id (principalId) is always present and uniquely identifies the actor.
 * user.name is NOT used because for AssumedRole / FederatedUser events it
 * contains the identity-provider name (e.g. "okta"), not the actual person.
 */
export function buildEsqlQuery(namespace: string): string {
  const userFieldEvals = euid.esql.getFieldEvaluations('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';

  const iamTypesLiteral = HUMAN_IAM_IDENTITY_TYPES.map((t) => `"${t}"`).join(', ');

  return `FROM ${getIndexPattern(namespace)}
| WHERE aws.cloudtrail.user_identity.type IN (${iamTypesLiteral})
    AND event.provider IS NOT NULL
    AND user.id IS NOT NULL
${userFieldEvalsLine}| EVAL actorUserId = CONCAT("user:", user.id, "@", entity.namespace)
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = CONCAT("service:", event.provider)
| WHERE targetEntityId IS NOT NULL AND targetEntityId != "service:"
| STATS communicates_with = VALUES(targetEntityId), _userId = MIN(user.id), _ns = MIN(entity.namespace) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
