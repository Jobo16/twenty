import { WorkspaceMigrationRunnerModule } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-runner/workspace-migration-runner.module';
import { BackfillWorkflowExecutionCoreIdsCommand } from 'src/database/commands/upgrade-version-command/2-42/2-42-workspace-command-1789593132221-backfill-workflow-execution-core-ids.command';
import { MakeWorkflowRunProjectionRelationsNullableCommand } from 'src/database/commands/upgrade-version-command/2-42/2-42-workspace-command-1789593132222-make-workflow-run-projection-relations-nullable.command';
import { Module } from '@nestjs/common';

import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { RelinkWorkflowVersionsToCoreWorkflowsCommand } from 'src/database/commands/upgrade-version-command/2-42/2-42-workspace-command-1789566000000-relink-workflow-versions-to-core-workflows.command';

@Module({
  imports: [WorkspaceIteratorModule, WorkspaceMigrationRunnerModule],
  providers: [
    BackfillWorkflowExecutionCoreIdsCommand,
    MakeWorkflowRunProjectionRelationsNullableCommand,
RelinkWorkflowVersionsToCoreWorkflowsCommand],
  exports: [RelinkWorkflowVersionsToCoreWorkflowsCommand],
})
export class V2_42_UpgradeVersionCommandModule {}
