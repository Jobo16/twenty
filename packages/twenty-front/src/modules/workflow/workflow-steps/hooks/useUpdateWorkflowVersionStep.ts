import { useWorkflowEditorMutationErrorHandler } from '@/workflow/hooks/useWorkflowEditorMutationErrorHandler';
import { useIsWorkflowCoreEnabled } from '@/workflow/hooks/useIsWorkflowCoreEnabled';
import { invalidateCoreWorkflowVersions } from '@/object-core/workflows/versions/utils/invalidateCoreWorkflowVersions';
import {
  UpdateCoreWorkflowVersionStepDocument,
  type UpdateWorkflowVersionStepInput,
  type UpdateWorkflowVersionStepMutation,
  type UpdateWorkflowVersionStepMutationVariables,
} from '~/generated/graphql';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { useGetRecordFromCache } from '@/object-record/cache/hooks/useGetRecordFromCache';
import { updateRecordFromCache } from '@/object-record/cache/utils/updateRecordFromCache';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { flowComponentState } from '@/workflow/states/flowComponentState';
import { UPDATE_WORKFLOW_VERSION_STEP } from '@/workflow/graphql/mutations/updateWorkflowVersionStep';
import {
  type WorkflowVersion,
  type WorkflowStep,
} from '@/workflow/types/Workflow';
import { useStepsOutputSchema } from '@/workflow/workflow-variables/hooks/useStepsOutputSchema';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useMutation } from '@apollo/client/react';
import { isDefined } from 'twenty-shared/utils';

export const useUpdateWorkflowVersionStep = (instanceId?: string) => {
  const apolloCoreClient = useApolloCoreClient();
  const isCore = useIsWorkflowCoreEnabled();
  const handleCoreMutationError =
    useWorkflowEditorMutationErrorHandler(instanceId);
  const [mutateCore] = useMutation(UpdateCoreWorkflowVersionStepDocument, {
    client: apolloCoreClient,
    onError: handleCoreMutationError,
  });
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const { enqueueErrorSnackBar } = useSnackBar();
  const { markStepForRecomputation } = useStepsOutputSchema();
  const setFlow = useSetAtomComponentState(flowComponentState, instanceId);

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.WorkflowVersion,
  });
  const getRecordFromCache = useGetRecordFromCache({
    objectNameSingular: CoreObjectNameSingular.WorkflowVersion,
  });
  const [mutate] = useMutation<
    UpdateWorkflowVersionStepMutation,
    UpdateWorkflowVersionStepMutationVariables
  >(UPDATE_WORKFLOW_VERSION_STEP, {
    client: apolloCoreClient,
  });

  const updateWorkflowVersionStep = async (
    input: UpdateWorkflowVersionStepInput,
  ) => {
    const { workflowVersionId, ...stepInput } = input;
    const result = isCore
      ? await mutateCore({
          variables: {
            input: { ...stepInput, coreWorkflowVersionId: workflowVersionId },
          },
        })
      : await mutate({
          variables: { input },
          onError: (error) => {
            enqueueErrorSnackBar({ apolloError: error });
          },
        });
    const updatedStep = result?.data?.updateWorkflowVersionStep;
    if (!isDefined(updatedStep)) {
      return;
    }

    markStepForRecomputation({
      stepId: updatedStep.id,
      workflowVersionId: input.workflowVersionId,
    });

    setFlow((currentFlow) => {
      if (!isDefined(currentFlow)) {
        return currentFlow;
      }

      return {
        ...currentFlow,
        workflowVersionId: input.workflowVersionId,
        steps: (currentFlow.steps ?? []).map((step) =>
          step.id === updatedStep.id ? updatedStep : step,
        ),
      };
    });

    if (isCore) {
      await invalidateCoreWorkflowVersions(apolloCoreClient);
      return result;
    }

    const cachedRecord = getRecordFromCache<WorkflowVersion>(
      input.workflowVersionId,
    );
    if (!isDefined(cachedRecord)) {
      return result;
    }

    const newCachedRecord = {
      ...cachedRecord,
      steps: (cachedRecord.steps || []).map((step: WorkflowStep) => {
        if (step.id === updatedStep.id) {
          return updatedStep;
        }
        return step;
      }),
    };

    const recordGqlFields = {
      steps: true,
    };
    updateRecordFromCache({
      objectMetadataItems,
      objectMetadataItem,
      cache: apolloCoreClient.cache,
      record: newCachedRecord,
      recordGqlFields,
      objectPermissionsByObjectMetadataId,
    });

    return result;
  };

  return { updateWorkflowVersionStep };
};
