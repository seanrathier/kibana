/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { COMPOSITE_PAGE_SIZE } from '../../constants';
import { getIndexPattern } from './constants';

export function buildEsqlQuery(namespace: string): string {
  const userFieldEvals = euid.getFieldEvaluationsEsql('user');
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdEval = euid.getEuidEsqlEvaluation('user', { withTypeId: false });
  const userIdFilter = euid.getEuidEsqlDocumentsContainsIdFilter('user');

  return `FROM ${getIndexPattern(namespace)}
| WHERE azure.signinlogs.properties.app_display_name IS NOT NULL
    AND (${userIdFilter})
${userFieldEvalsLine}| EVAL actorUserId = ${userIdEval}
| WHERE actorUserId IS NOT NULL AND actorUserId != ""
| EVAL targetEntityId = CONCAT("service:", azure.signinlogs.properties.app_display_name)
| WHERE targetEntityId IS NOT NULL AND targetEntityId != "service:"
| STATS communicates_with = VALUES(targetEntityId), _userId = MIN(user.id), _ns = MIN(entity.namespace) BY actorUserId
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}
