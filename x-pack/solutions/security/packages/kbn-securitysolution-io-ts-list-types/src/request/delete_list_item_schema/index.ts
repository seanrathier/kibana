/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { id } from '../../common/id';
import { list_id } from '../../common/list_id';
import { valueOrUndefined } from '../../common/value';
import { refresh } from '../../common/refresh';

export const deleteListItemSchema = t.intersection([
  t.exact(
    t.type({
      value: valueOrUndefined,
    })
  ),
  t.exact(t.partial({ id, list_id, refresh })),
]);

export type DeleteListItemSchema = t.OutputOf<typeof deleteListItemSchema>;
export type DeleteListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof deleteListItemSchema>
>;
