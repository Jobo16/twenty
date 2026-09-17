import { requireIsoTimestamp } from './wecom-time';

export type WecomAccessMode = 'self-built' | 'provider';

export type WecomConnection = {
  // Internal handle for the stored connection record.
  connectionId: string;
  workspaceId: string;
  // Trusted WeCom corp identity. Callbacks resolve a workspace from this;
  // it is never supplied by a callback client.
  corpId: string;
  accessMode: WecomAccessMode;
  // Third-party provider mode carries the provider suite; self-built is null.
  suiteId: string | null;
  // Agent id; self-built apps target one agent, provider may be null.
  agentId: string | null;
  boundAt: string;
};

export type WecomConnectionInput = {
  connectionId: string;
  workspaceId: string;
  corpId: string;
  accessMode: WecomAccessMode;
  suiteId?: string | null;
  agentId?: string | null;
  boundAt: string;
};

// Trusted registrations index a corp -> exactly one connection and give each
// workspace exactly one connection, so per-tenant data is isolated.
export type WecomConnectionRegistry = {
  byConnectionId: ReadonlyMap<string, WecomConnection>;
  byCorpId: ReadonlyMap<string, WecomConnection>;
  byWorkspaceId: ReadonlyMap<string, WecomConnection>;
};

export type RegisterWecomConnectionOutcome =
  | { status: 'bound'; registry: WecomConnectionRegistry }
  | {
      status: 'conflict';
      reason: 'corp-already-bound' | 'workspace-already-connected';
      existing: WecomConnection;
      registry: WecomConnectionRegistry;
    };

export function createWecomConnectionRegistry(
  inputs: readonly WecomConnectionInput[] = [],
): WecomConnectionRegistry {
  return inputs.reduce<WecomConnectionRegistry>(
    (registry, input) => registerWecomConnection(registry, input).registry,
    { byConnectionId: new Map(), byCorpId: new Map(), byWorkspaceId: new Map() },
  );
}

export function registerWecomConnection(
  registry: WecomConnectionRegistry,
  input: WecomConnectionInput,
): RegisterWecomConnectionOutcome {
  const boundAt = requireIsoTimestamp(input.boundAt, 'boundAt');

  if (input.corpId.trim().length === 0) {
    throw new Error('corpId is required');
  }

  if (input.workspaceId.trim().length === 0) {
    throw new Error('workspaceId is required');
  }

  const existingById = registry.byConnectionId.get(input.connectionId);

  // Re-registering the same binding is idempotent.
  if (
    existingById !== undefined &&
    existingById.corpId === input.corpId &&
    existingById.workspaceId === input.workspaceId
  ) {
    return { status: 'bound', registry };
  }

  const existingByCorp = registry.byCorpId.get(input.corpId);

  if (existingByCorp !== undefined) {
    return {
      status: 'conflict',
      reason: 'corp-already-bound',
      existing: existingByCorp,
      registry,
    };
  }

  const existingByWorkspace = registry.byWorkspaceId.get(input.workspaceId);

  if (existingByWorkspace !== undefined) {
    return {
      status: 'conflict',
      reason: 'workspace-already-connected',
      existing: existingByWorkspace,
      registry,
    };
  }

  const connection: WecomConnection = {
    connectionId: input.connectionId,
    workspaceId: input.workspaceId,
    corpId: input.corpId,
    accessMode: input.accessMode,
    suiteId: input.suiteId ?? null,
    agentId: input.agentId ?? null,
    boundAt,
  };

  const nextRegistry: WecomConnectionRegistry = {
    byConnectionId: new Map(registry.byConnectionId).set(
      input.connectionId,
      connection,
    ),
    byCorpId: new Map(registry.byCorpId).set(input.corpId, connection),
    byWorkspaceId: new Map(registry.byWorkspaceId).set(
      input.workspaceId,
      connection,
    ),
  };

  return { status: 'bound', registry: nextRegistry };
}

export function resolveWecomConnectionByCorpId(
  registry: WecomConnectionRegistry,
  corpId: string,
): WecomConnection | null {
  const connection = registry.byCorpId.get(corpId);

  return connection === undefined ? null : connection;
}

export function resolveWecomConnectionByWorkspaceId(
  registry: WecomConnectionRegistry,
  workspaceId: string,
): WecomConnection | null {
  const connection = registry.byWorkspaceId.get(workspaceId);

  return connection === undefined ? null : connection;
}