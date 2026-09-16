import { useWorkflowEditorMutationErrorHandler } from '@/workflow/hooks/useWorkflowEditorMutationErrorHandler';
import { useIsWorkflowCoreEnabled } from '@/workflow/hooks/useIsWorkflowCoreEnabled';
import { invalidateCoreWorkflowVersions } from '@/object-core/workflows/versions/utils/invalidateCoreWorkflowVersions';
import {
  CreateCoreWorkflowVersionEdgeDocument,
  type CreateWorkflowVersionEdgeMutation,
  type CreateWorkflowVersionEdgeMutationVariables,
  type CreateWorkflowVersionEdgeInput,
} from '~/generated/graphql';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useMutation } from '@apollo/client/react';
import { CREATE_WORKFLOW_VERSION_EDGE } from '@/workflow/graphql/mutations/createWorkflowVersionEdge';
import { useApplyWorkflowVersionStepChanges } from '@/workflow/workflow-steps/hooks/useApplyWorkflowVersionStepChanges';

export const useCreateWorkflowVersionEdge = () => {
  const apolloCoreClient = useApolloCoreClient();
  const isCore = useIsWorkflowCoreEnabled();
  const handleCoreMutationError = useWorkflowEditorMutationErrorHandler();
  const [mutateCore] = useMutation(CreateCoreWorkflowVersionEdgeDocument, {
    client: apolloCoreClient,
    onError: handleCoreMutationError,
  });

  const { applyWorkflowVersionStepChanges } =
    useApplyWorkflowVersionStepChanges();
  const { enqueueErrorSnackBar } = useSnackBar();

  const [mutate] = useMutation<
    CreateWorkflowVersionEdgeMutation,
    CreateWorkflowVersionEdgeMutationVariables
  >(CREATE_WORKFLOW_VERSION_EDGE, { client: apolloCoreClient });

  const createWorkflowVersionEdge = async (
    input: CreateWorkflowVersionEdgeInput,
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

    const workflowVersionStepChanges = result?.data?.createWorkflowVersionEdge;

    applyWorkflowVersionStepChanges({
      workflowVersionStepChanges,
      workflowVersionId: input.workflowVersionId,
    });

    if (isCore) {
      await invalidateCoreWorkflowVersions(apolloCoreClient);
    }

    return result;
  };

  return { createWorkflowVersionEdge };
};
