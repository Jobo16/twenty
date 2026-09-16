import { invalidateCoreWorkflowVersions } from '@/object-core/workflows/versions/utils/invalidateCoreWorkflowVersions';
import { useMutation } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { isNonEmptyArray } from 'twenty-shared/utils';

import { DELETE_CORE_WORKFLOWS } from '@/object-core/workflows/graphql/mutations/deleteCoreWorkflows';
import { coreWorkflowsFilterSettingsState } from '@/object-core/workflows/states/coreWorkflowsFilterSettingsState';
import {
  EMPTY_CORE_WORKFLOWS_SELECTION,
  coreWorkflowsSelectionState,
} from '@/object-core/workflows/states/coreWorkflowsSelectionState';
import { getSelectedCoreWorkflowRowIds } from '@/object-core/workflows/utils/getSelectedCoreWorkflowRowIds';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import {
  type DeleteCoreWorkflowsMutation,
  type DeleteCoreWorkflowsMutationVariables,
} from '~/generated/graphql';
import { logError } from '~/utils/logError';

export const useDeleteSelectedCoreWorkflows = () => {
  const apolloCoreClient = useApolloCoreClient();

  const coreWorkflowsSelection = useAtomStateValue(coreWorkflowsSelectionState);
  const setCoreWorkflowsSelection = useSetAtomState(
    coreWorkflowsSelectionState,
  );

  const coreWorkflowsFilterSettings = useAtomStateValue(
    coreWorkflowsFilterSettingsState,
  );

  const { enqueueErrorSnackBar } = useSnackBar();

  const [deleteCoreWorkflowsMutation] = useMutation<
    DeleteCoreWorkflowsMutation,
    DeleteCoreWorkflowsMutationVariables
  >(DELETE_CORE_WORKFLOWS, { client: apolloCoreClient });

  const selectedCoreWorkflowIds = getSelectedCoreWorkflowRowIds({
    selection: coreWorkflowsSelection,
    currentFilterSettings: coreWorkflowsFilterSettings,
  });

  const deleteSelectedCoreWorkflows = async () => {
    if (!isNonEmptyArray(selectedCoreWorkflowIds)) {
      return;
    }

    let deletedCoreWorkflowIds: string[];

    try {
      const { data } = await deleteCoreWorkflowsMutation({
        variables: { input: { coreWorkflowIds: selectedCoreWorkflowIds } },
      });

      deletedCoreWorkflowIds = (data?.deleteCoreWorkflows ?? []).map(
        (deletedCoreWorkflow) => deletedCoreWorkflow.id,
      );
    } catch (error) {
      logError(error);
      enqueueErrorSnackBar({ message: t`Failed to delete workflows` });

      return;
    }

    if (!isNonEmptyArray(deletedCoreWorkflowIds)) {
      enqueueErrorSnackBar({ message: t`No workflows were deleted` });

      return;
    }

    setCoreWorkflowsSelection(EMPTY_CORE_WORKFLOWS_SELECTION);

    for (const coreWorkflowId of deletedCoreWorkflowIds) {
      apolloCoreClient.cache.evict({
        id: apolloCoreClient.cache.identify({
          __typename: 'CoreWorkflowDTO',
          id: coreWorkflowId,
        }),
      });
    }
    await invalidateCoreWorkflowVersions(apolloCoreClient);
  };

  return { deleteSelectedCoreWorkflows, selectedCoreWorkflowIds };
};
