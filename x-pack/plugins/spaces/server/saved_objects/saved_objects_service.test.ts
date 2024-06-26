/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';

import { SpacesSavedObjectsService } from './saved_objects_service';
import { spacesServiceMock } from '../spaces_service/spaces_service.mock';
import { SPACES_USAGE_STATS_TYPE } from '../usage_stats';

describe('SpacesSavedObjectsService', () => {
  describe('#setup', () => {
    it('registers the "space" saved object type with appropriate mappings, migrations, and schemas', () => {
      const core = coreMock.createSetup();
      const spacesService = spacesServiceMock.createStartContract();

      const service = new SpacesSavedObjectsService();
      service.setup({ core, getSpacesService: () => spacesService });

      expect(core.savedObjects.registerType).toHaveBeenCalledTimes(2);
      expect(core.savedObjects.registerType).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          name: 'space',
          mappings: expect.objectContaining({
            properties: expect.objectContaining({
              disabledFeatures: expect.any(Object),
              name: expect.any(Object),
              solution: expect.any(Object),
            }),
          }),
          schemas: { '8.8.0': expect.any(Object) },
        })
      );
      expect(core.savedObjects.registerType).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: SPACES_USAGE_STATS_TYPE })
      );
    });

    it('registers the spaces extension', () => {
      const core = coreMock.createSetup();
      const spacesService = spacesServiceMock.createStartContract();

      const service = new SpacesSavedObjectsService();
      service.setup({ core, getSpacesService: () => spacesService });

      expect(core.savedObjects.setSpacesExtension).toHaveBeenCalledTimes(1);
    });
  });
});
