import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { IssueProvider } from "@changethis/shared";
import { getInternalApiUrl, getInternalSessionCookieHeader } from "./internal-api";
import { getDataStoreMode } from "./runtime";

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
  return readStore().disabledIntegrations.some((integration) =>
    integration.workspaceId === workspaceId && integration.provider === provider && integration.integrationId === integrationId
  );
}

export async function isProviderIntegrationDisabledAsync(provider: IssueProvider, integrationId: string, workspaceId?: string): Promise<boolean> {
  if (usesInternalProviderIntegrationState()) {
    const integration = await internalIntegrationRequest<{ status: string } | undefined>(
      `/integrations/${provider}?${new URLSearchParams({ integration_id: integrationId }).toString()}`,
      { allow404: true }
    );
    return integration?.status === "disabled";
  }

  return isProviderIntegrationDisabled(provider, integrationId, workspaceId);
}

export function disableProviderIntegration(provider: IssueProvider, integrationId: string, workspaceId?: string): void {
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
  if (usesInternalProviderIntegrationState()) {
    await setInternalIntegrationStatus(provider, integrationId, "disabled");
    return;
  }

  disableProviderIntegration(provider, integrationId, workspaceId);
}

export function enableProviderIntegration(provider: IssueProvider, integrationId: string, workspaceId?: string): void {
  const store = readStore();

  store.disabledIntegrations = store.disabledIntegrations.filter((integration) =>
    integration.workspaceId !== workspaceId || integration.provider !== provider || integration.integrationId !== integrationId
  );

  writeStore(store);
}

export async function enableProviderIntegrationAsync(provider: IssueProvider, integrationId: string, workspaceId?: string): Promise<void> {
  if (usesInternalProviderIntegrationState()) {
    await setInternalIntegrationStatus(provider, integrationId, "connected");
    return;
  }

  enableProviderIntegration(provider, integrationId, workspaceId);
}

function usesInternalProviderIntegrationState(): boolean {
  return getDataStoreMode() === "internal";
}

async function setInternalIntegrationStatus(provider: IssueProvider, integrationId: string, status: "connected" | "disabled"): Promise<void> {
  await internalIntegrationRequest(`/integrations/${provider}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ integration_id: integrationId, status })
  });
}

async function internalIntegrationRequest<T>(path: string, init: RequestInit & { allow404?: boolean } = {}): Promise<T> {
  const { allow404 = false, ...requestInit } = init;
  const cookieHeader = await getInternalSessionCookieHeader();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(requestInit.headers as Record<string, string> | undefined)
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const response = await fetch(`${getInternalApiUrl()}${path}`, { ...requestInit, headers, cache: "no-store" });

  if (allow404 && response.status === 404) {
    return undefined as T;
  }

  if (!response.ok) {
    let message = `Provider integration request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: unknown; error?: unknown };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // Keep the generic message when the API does not return JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
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
