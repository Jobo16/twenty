import { Field, InputType } from '@nestjs/graphql';

import graphqlTypeJson from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class RunCoreWorkflowVersionInput {
  @Field(() => UUIDScalarType)
  coreWorkflowVersionId: string;

  @Field(() => UUIDScalarType, { nullable: true })
  workflowRunId?: string | null;

  @Field(() => graphqlTypeJson, { nullable: true })
  payload?: JSON;
}
