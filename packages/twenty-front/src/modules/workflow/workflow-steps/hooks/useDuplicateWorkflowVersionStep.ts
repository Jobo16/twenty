import { useIsWorkflowCoreEnabled } from '@/workflow/hooks/useIsWorkflowCoreEnabled';
import { invalidateCoreWorkflowVersions } from '@/object-core/workflows/versions/utils/invalidateCoreWorkflowVersions';
import {
  DuplicateCoreWorkflowVersionStepDocument,
  type DuplicateWorkflowVersionStepInput,
  type DuplicateWorkflowVersionStepMutation,
  type DuplicateWorkflowVersionStepMutationVariables,
} from '~/generated/graphql';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { DUPLICATE_WORKFLOW_VERSION_STEP } from '@/workflow/graphql/mutations/duplicateWorkflowVersionStep';
import { useApplyWorkflowVersionStepChanges } from '@/workflow/workflow-steps/hooks/useApplyWorkflowVersionStepChanges';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useMutation } from '@apollo/client/react';

export const useDuplicateWorkflowVersionStep = () => {
  const apolloCoreClient = useApolloCoreClient();
  const isCore = useIsWorkflowCoreEnabled();
  const [mutateCore] = useMutation(DuplicateCoreWorkflowVersionStepDocument, {
    client: apolloCoreClient,
  });

  const { applyWorkflowVersionStepChanges } =
    useApplyWorkflowVersionStepChanges();

  const { enqueueErrorSnackBar } = useSnackBar();

  const [mutate] = useMutation<
    DuplicateWorkflowVersionStepMutation,
    DuplicateWorkflowVersionStepMutationVariables
  >(DUPLICATE_WORKFLOW_VERSION_STEP, {
    client: apolloCoreClient,
  });

  const duplicateWorkflowVersionStep = async (
    input: DuplicateWorkflowVersionStepInput,
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

    const workflowVersionStepChanges =
      result?.data?.duplicateWorkflowVersionStep;

    applyWorkflowVersionStepChanges({
      workflowVersionStepChanges,
      workflowVersionId: input.workflowVersionId,
    });

    if (isCore) {
      await invalidateCoreWorkflowVersions(apolloCoreClient);
    }

    return result;
  };

  return { duplicateWorkflowVersionStep };
};
