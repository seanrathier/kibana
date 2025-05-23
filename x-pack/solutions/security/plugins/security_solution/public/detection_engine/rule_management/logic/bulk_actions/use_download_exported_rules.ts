/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { downloadBlob } from '../../../../common/utils/download_blob';
import * as i18n from '../../../common/translations';
import { getExportedRulesCounts } from '../../../rule_management_ui/components/rules_table/helpers';
import { useShowBulkErrorToast } from './use_show_bulk_error_toast';
import { useShowBulkSuccessToast } from './use_show_bulk_success_toast';

const DEFAULT_EXPORT_FILENAME = `${i18n.EXPORT_FILENAME}.ndjson`;

/**
 * downloads exported rules, received from export action
 */
export function useDownloadExportedRules() {
  const showBulkSuccessToast = useShowBulkSuccessToast();
  const showBulkErrorToast = useShowBulkErrorToast();

  return useCallback(
    async (response: Blob) => {
      try {
        downloadBlob(response, DEFAULT_EXPORT_FILENAME);
        showBulkSuccessToast({
          actionType: BulkActionTypeEnum.export,
          summary: await getExportedRulesCounts(response),
        });
      } catch (error) {
        showBulkErrorToast({ actionType: BulkActionTypeEnum.export, error });
      }
    },
    [showBulkSuccessToast, showBulkErrorToast]
  );
}
