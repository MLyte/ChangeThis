import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { IssueProvider } from "@changethis/shared";
import { getDataStoreMode } from "./runtime";
import { isSupabaseServiceConfigured, supabaseServiceRest } from "./supabase-server";

type DisabledProviderIntegration = {
  workspaceId?: string;
  provider: IssueProvider;
  integrationId: string;
  disabledAt: string;
};

type ProviderIntegrationStateStore = {
  disabledIntegrations: DisabledProviderIntegration[];
};

const localDataDir = process.env.CHANGETHIS_DATA_DIR ?? path.join(process.cwd(), ".changethis-data");
const providerIntegrationStatePath = path.join(localDataDir, "provider-integrations.json");

export function isProviderIntegrationDisabled(provider: IssueProvider, integrationId: string, workspaceId?: string): boolean {
  if (getDataStoreMode() === "supabase" && isUuid(integrationId) && isSupabaseServiceConfigured()) {
    throw new Error("Use isProviderIntegrationDisabledAsync when DATA_STORE=supabase");
  }

  return readStore().disabledIntegrations.some((integration) =>
    integration.workspaceId === workspaceId && integration.provider === provider && integration.integrationId === integrationId
  );
}

export async function isProviderIntegrationDisabledAsync(provider: IssueProvider, integrationId: string, workspaceId?: string): Promise<boolean> {
  if (getDataStoreMode() !== "supabase" || !isUuid(integrationId) || !isSupabaseServiceConfigured()) {
    return isProviderIntegrationDisabled(provider, integrationId, workspaceId);
  }

  const params = new URLSearchParams({
    id: `eq.${integrationId}`,
    provider: `eq.${provider}`,
    status: "eq.disabled",
    select: "id",
    limit: "1"
  });

  if (workspaceId && isUuid(workspaceId)) {
    params.set("organization_id", `eq.${workspaceId}`);
  }

  const rows = await supabaseServiceRest<Array<{ id: string }>>(`/rest/v1/provider_integrations?${params.toString()}`);
  return rows.length > 0;
}

export function disableProviderIntegration(provider: IssueProvider, integrationId: string, workspaceId?: string): void {
  if (getDataStoreMode() === "supabase" && isUuid(integrationId) && isSupabaseServiceConfigured()) {
    throw new Error("Use disableProviderIntegrationAsync when DATA_STORE=supabase");
  }

  const store = readStore();

  store.disabledIntegrations = [
    ...store.disabledIntegrations.filter((integration) =>
      integration.workspaceId !== workspaceId || integration.provider !== provider || integration.integrationId !== integrationId
    ),
    {
      workspaceId,
      provider,
      integrationId,
      disabledAt: new Date().toISOString()
    }
  ];

  writeStore(store);
}

export async function disableProviderIntegrationAsync(provider: IssueProvider, integrationId: string, workspaceId?: string): Promise<void> {
  if (getDataStoreMode() !== "supabase" || !isUuid(integrationId) || !isSupabaseServiceConfigured()) {
    disableProviderIntegration(provider, integrationId, workspaceId);
    return;
  }

  const params = providerIntegrationPatchParams(provider, integrationId, workspaceId);
  await supabaseServiceRest(`/rest/v1/provider_integrations?${params.toString()}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ status: "disabled" })
  });
}

export function enableProviderIntegration(provider: IssueProvider, integrationId: string, workspaceId?: string): void {
  if (getDataStoreMode() === "supabase" && isUuid(integrationId) && isSupabaseServiceConfigured()) {
    throw new Error("Use enableProviderIntegrationAsync when DATA_STORE=supabase");
  }

  const store = readStore();

  store.disabledIntegrations = store.disabledIntegrations.filter((integration) =>
    integration.workspaceId !== workspaceId || integration.provider !== provider || integration.integrationId !== integrationId
  );

  writeStore(store);
}

export async function enableProviderIntegrationAsync(provider: IssueProvider, integrationId: string, workspaceId?: string): Promise<void> {
  if (getDataStoreMode() !== "supabase" || !isUuid(integrationId) || !isSupabaseServiceConfigured()) {
    enableProviderIntegration(provider, integrationId, workspaceId);
    return;
  }

  const params = providerIntegrationPatchParams(provider, integrationId, workspaceId);
  await supabaseServiceRest(`/rest/v1/provider_integrations?${params.toString()}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ status: "connected" })
  });
}

function readStore(): ProviderIntegrationStateStore {
  try {
    return sanitizeStore(JSON.parse(readFileSync(providerIntegrationStatePath, "utf8")));
  } catch {
    return { disabledIntegrations: [] };
  }
}

function writeStore(store: ProviderIntegrationStateStore): void {
  mkdirSync(path.dirname(providerIntegrationStatePath), { recursive: true });
  const tempPath = `${providerIntegrationStatePath}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  renameSync(tempPath, providerIntegrationStatePath);
}

function sanitizeStore(value: unknown): ProviderIntegrationStateStore {
  if (!isRecord(value) || !Array.isArray(value.disabledIntegrations)) {
    return { disabledIntegrations: [] };
  }

  return {
    disabledIntegrations: value.disabledIntegrations.flatMap((integration) => {
      if (!isRecord(integration)
        || !isIssueProvider(integration.provider)
        || typeof integration.integrationId !== "string"
        || typeof integration.disabledAt !== "string") {
        return [];
      }

      return [{
        workspaceId: typeof integration.workspaceId === "string" ? integration.workspaceId : undefined,
        provider: integration.provider,
        integrationId: integration.integrationId,
        disabledAt: integration.disabledAt
      }];
    })
  };
}

function isIssueProvider(value: unknown): value is IssueProvider {
  return value === "github" || value === "gitlab";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function providerIntegrationPatchParams(provider: IssueProvider, integrationId: string, workspaceId?: string): URLSearchParams {
  const params = new URLSearchParams({
    id: `eq.${integrationId}`,
    provider: `eq.${provider}`
  });

  if (workspaceId && isUuid(workspaceId)) {
    params.set("organization_id", `eq.${workspaceId}`);
  }

  return params;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
