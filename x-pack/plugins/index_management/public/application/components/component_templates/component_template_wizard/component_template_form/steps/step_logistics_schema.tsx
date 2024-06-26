/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, fieldValidators, fieldFormatters, FormSchema } from '../../../shared_imports';

const { emptyField, containsCharsField, isJsonField } = fieldValidators;
const { toInt } = fieldFormatters;

const stringifyJson = (json: { [key: string]: any }): string =>
  Object.keys(json).length ? JSON.stringify(json, null, 2) : '{\n\n}';

const parseJson = (jsonString: string): object => {
  let parsedJSON: any;

  try {
    parsedJSON = JSON.parse(jsonString);
  } catch {
    parsedJSON = {};
  }

  return parsedJSON;
};

export const logisticsFormSchema: FormSchema = {
  name: {
    defaultValue: undefined,
    label: i18n.translate('xpack.idxMgmt.componentTemplateForm.stepLogistics.nameFieldLabel', {
      defaultMessage: 'Name',
    }),
    type: FIELD_TYPES.TEXT,
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.idxMgmt.componentTemplateForm.validation.nameRequiredError', {
            defaultMessage: 'A component template name is required.',
          })
        ),
      },
      {
        validator: containsCharsField({
          chars: ' ',
          message: i18n.translate(
            'xpack.idxMgmt.componentTemplateForm.stepLogistics.validation.nameSpacesError',
            {
              defaultMessage: 'Spaces are not allowed in a component template name.',
            }
          ),
        }),
      },
    ],
  },
  'lifecycle.enabled': {
    type: FIELD_TYPES.TOGGLE,
    label: i18n.translate(
      'xpack.idxMgmt.componentTemplateForm.stepLogistics.enableDataRetentionLabel',
      {
        defaultMessage: 'Enable data retention',
      }
    ),
    defaultValue: false,
  },
  'lifecycle.infiniteDataRetention': {
    type: FIELD_TYPES.TOGGLE,
    label: i18n.translate(
      'xpack.idxMgmt.componentTemplateForm.stepLogistics.infiniteDataRetentionLabel',
      {
        defaultMessage: 'Keep data indefinitely',
      }
    ),
    defaultValue: false,
  },
  'lifecycle.value': {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.idxMgmt.componentTemplateForm.stepLogistics.fieldDataRetentionValueLabel',
      {
        defaultMessage: 'Data Retention',
      }
    ),
    formatters: [toInt],
    validations: [
      {
        validator: ({ value, formData }) => {
          // If infiniteRetentionPeriod is set, we dont need to validate the data retention field
          if (formData['lifecycle.infiniteDataRetention']) {
            return undefined;
          }

          if (!value) {
            return {
              message: i18n.translate(
                'xpack.idxMgmt.dataStreamsDetailsPanel.stepLogistics.dataRetentionFieldRequiredError',
                {
                  defaultMessage: 'A data retention value is required.',
                }
              ),
            };
          }

          if (value <= 0) {
            return {
              message: i18n.translate(
                'xpack.idxMgmt.dataStreamsDetailsPanel.stepLogistics.dataRetentionFieldNonNegativeError',
                {
                  defaultMessage: `A positive value is required.`,
                }
              ),
            };
          }

          if (value % 1 !== 0) {
            return {
              message: i18n.translate(
                'xpack.idxMgmt.dataStreamsDetailsPanel.stepLogistics.dataRetentionFieldDecimalError',
                {
                  defaultMessage: `The value should be an integer number.`,
                }
              ),
            };
          }
        },
      },
    ],
  },
  'lifecycle.unit': {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.idxMgmt.componentTemplateForm.stepLogistics.fieldDataRetentionUnitLabel',
      {
        defaultMessage: 'Time unit',
      }
    ),
    defaultValue: 'd',
  },
  version: {
    type: FIELD_TYPES.NUMBER,
    label: i18n.translate('xpack.idxMgmt.componentTemplateForm.stepLogistics.versionFieldLabel', {
      defaultMessage: 'Version (optional)',
    }),
    formatters: [toInt],
  },
  _meta: {
    label: i18n.translate('xpack.idxMgmt.componentTemplateForm.stepLogistics.metaFieldLabel', {
      defaultMessage: '_meta field data (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.idxMgmt.componentTemplateForm.stepLogistics.metaHelpText"
        defaultMessage="Use JSON format: {code}"
        values={{
          code: <EuiCode>{JSON.stringify({ arbitrary_data: 'anything_goes' })}</EuiCode>,
        }}
      />
    ),
    serializer: (value) => {
      const result = parseJson(value);
      // If an empty object was passed, strip out this value entirely.
      if (!Object.keys(result).length) {
        return undefined;
      }
      return result;
    },
    deserializer: stringifyJson,
    validations: [
      {
        validator: isJsonField(
          i18n.translate(
            'xpack.idxMgmt.componentTemplateForm.stepLogistics.validation.metaJsonError',
            {
              defaultMessage: 'The input is not valid.',
            }
          ),
          { allowEmptyString: true }
        ),
      },
    ],
  },
};
