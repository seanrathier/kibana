/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Adapters } from '@kbn/inspector-plugin/public';
import { getLensInspectorService } from '../../lens_inspector_service';
import type { LensEmbeddableStartServices, LensInspectorAdapters } from '../types';

export function initializeInspector(services: LensEmbeddableStartServices): {
  api: LensInspectorAdapters;
} {
  const inspectorApi = getLensInspectorService(services.inspector);

  return {
    api: {
      ...inspectorApi,
      adapters$: new BehaviorSubject<Adapters>(inspectorApi.getInspectorAdapters()),
    },
  };
}
