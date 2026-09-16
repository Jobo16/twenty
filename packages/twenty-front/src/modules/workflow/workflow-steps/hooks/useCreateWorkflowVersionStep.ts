import { useIsWorkflowCoreEnabled } from '@/workflow/hooks/useIsWorkflowCoreEnabled';
import { invalidateCoreWorkflowVersions } from '@/object-core/workflows/versions/utils/invalidateCoreWorkflowVersions';
import {
  CreateCoreWorkflowVersionStepDocument,
  type CreateWorkflowVersionStepInput,
  type CreateWorkflowVersionStepMutation,
  type CreateWorkflowVersionStepMutationVariables,
} from '~/generated/graphql';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { CREATE_WORKFLOW_VERSION_STEP } from '@/workflow/graphql/mutations/createWorkflowVersionStep';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useMutation } from '@apollo/client/react';
import { useApplyWorkflowVersionStepChanges } from '@/workflow/workflow-steps/hooks/useApplyWorkflowVersionStepChanges';

export const useCreateWorkflowVersionStep = () => {
  const apolloCoreClient = useApolloCoreClient();
  const isCore = useIsWorkflowCoreEnabled();
  const [mutateCore] = useMutation(CreateCoreWorkflowVersionStepDocument, {
    client: apolloCoreClient,
  });

  const { applyWorkflowVersionStepChanges } =
    useApplyWorkflowVersionStepChanges();

  const { enqueueErrorSnackBar } = useSnackBar();

  const [mutate] = useMutation<
    CreateWorkflowVersionStepMutation,
    CreateWorkflowVersionStepMutationVariables
  >(CREATE_WORKFLOW_VERSION_STEP, {
    client: apolloCoreClient,
  });

  const createWorkflowVersionStep = async (
    input: CreateWorkflowVersionStepInput,
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

    const workflowVersionStepChanges = result?.data?.createWorkflowVersionStep;

    applyWorkflowVersionStepChanges({
      workflowVersionStepChanges,
      workflowVersionId: input.workflowVersionId,
    });

    if (isCore) {
      await invalidateCoreWorkflowVersions(apolloCoreClient);
    }

    return result;
  };

  return { createWorkflowVersionStep };
};
