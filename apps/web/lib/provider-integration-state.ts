import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { IssueProvider } from "@changethis/shared";

type DisabledProviderIntegration = {
  provider: IssueProvider;
  integrationId: string;
  disabledAt: string;
};

type ProviderIntegrationStateStore = {
  disabledIntegrations: DisabledProviderIntegration[];
};

const localDataDir = process.env.CHANGETHIS_DATA_DIR ?? path.join(process.cwd(), ".changethis-data");
const providerIntegrationStatePath = path.join(localDataDir, "provider-integrations.json");

export function isProviderIntegrationDisabled(provider: IssueProvider, integrationId: string): boolean {
  return readStore().disabledIntegrations.some((integration) =>
    integration.provider === provider && integration.integrationId === integrationId
  );
}

export function disableProviderIntegration(provider: IssueProvider, integrationId: string): void {
  const store = readStore();

  store.disabledIntegrations = [
    ...store.disabledIntegrations.filter((integration) =>
      integration.provider !== provider || integration.integrationId !== integrationId
    ),
    {
      provider,
      integrationId,
      disabledAt: new Date().toISOString()
    }
  ];

  writeStore(store);
}

export function enableProviderIntegration(provider: IssueProvider, integrationId: string): void {
  const store = readStore();

  store.disabledIntegrations = store.disabledIntegrations.filter((integration) =>
    integration.provider !== provider || integration.integrationId !== integrationId
  );

  writeStore(store);
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
