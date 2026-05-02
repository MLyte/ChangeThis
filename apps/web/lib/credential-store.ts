import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { IssueProvider } from "@changethis/shared";
import { getDataStoreMode } from "./runtime";
import { supabaseServiceRest } from "./supabase-server";

type StoredCredential = {
  workspaceId?: string;
  provider: IssueProvider;
  integrationId: string;
  kind: string;
  iv: string;
  tag: string;
  ciphertext: string;
  updatedAt: string;
  expiresAt?: string;
  scopes?: string[];
};

type CredentialStore = {
  credentials: StoredCredential[];
};

type SupabaseCredentialRow = {
  id: string;
  integration_id: string;
  credential_kind: string;
  storage_reference: string;
  scopes?: string[] | null;
  expires_at?: string | null;
  ciphertext?: string | null;
  iv?: string | null;
  tag?: string | null;
  updated_at: string;
};

export type ProviderCredentialSecret = {
  workspaceId?: string;
  provider: IssueProvider;
  integrationId: string;
  kind: string;
  value: string;
  expiresAt?: string;
  scopes?: string[];
};

const localDataDir = process.env.CHANGETHIS_DATA_DIR ?? path.join(process.cwd(), ".changethis-data");
const credentialStorePath = path.join(localDataDir, "provider-credentials.json");

export function credentialStorageReference(provider: IssueProvider, integrationId: string, kind: string): string {
  return `${getDataStoreMode() === "supabase" ? "supabase" : "local"}:${provider}:${integrationId}:${kind}`;
}

export function saveProviderCredentialSecret(secret: ProviderCredentialSecret): string {
  if (getDataStoreMode() === "supabase" && isUuid(secret.integrationId)) {
    throw new Error("Use saveProviderCredentialSecretAsync when DATA_STORE=supabase");
  }

  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret.value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const store = readStore();
  const reference = credentialStorageReference(secret.provider, secret.integrationId, secret.kind);

  store.credentials = [
    ...store.credentials.filter((credential) =>
      credential.workspaceId !== secret.workspaceId
      || credentialStorageReference(credential.provider, credential.integrationId, credential.kind) !== reference),
    {
      workspaceId: secret.workspaceId,
      provider: secret.provider,
      integrationId: secret.integrationId,
      kind: secret.kind,
      iv: iv.toString("base64url"),
      tag: tag.toString("base64url"),
      ciphertext: ciphertext.toString("base64url"),
      updatedAt: new Date().toISOString(),
      expiresAt: secret.expiresAt,
      scopes: secret.scopes
    }
  ];

  writeStore(store);
  return reference;
}

export async function saveProviderCredentialSecretAsync(secret: ProviderCredentialSecret): Promise<string> {
  if (getDataStoreMode() !== "supabase") {
    return saveProviderCredentialSecret(secret);
  }

  const encrypted = encryptSecret(secret.value);
  const credentialKind = toSupabaseCredentialKind(secret.provider, secret.kind);
  const storageReference = credentialStorageReference(secret.provider, secret.integrationId, secret.kind);
  const existing = await supabaseServiceRest<SupabaseCredentialRow[]>(
    `/rest/v1/provider_integration_credentials?integration_id=eq.${encodeURIComponent(secret.integrationId)}&credential_kind=eq.${encodeURIComponent(credentialKind)}&status=eq.active&select=id&limit=1`
  );
  const row = {
    integration_id: secret.integrationId,
    credential_kind: credentialKind,
    storage_reference: storageReference,
    display_name: displayNameForCredential(secret.provider, secret.kind),
    scopes: secret.scopes ?? [],
    expires_at: secret.expiresAt,
    status: "active",
    rotated_at: new Date().toISOString(),
    algorithm: "aes-256-gcm",
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    tag: encrypted.tag
  };

  if (existing[0]?.id) {
    await supabaseServiceRest(`/rest/v1/provider_integration_credentials?id=eq.${encodeURIComponent(existing[0].id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    });
  } else {
    await supabaseServiceRest("/rest/v1/provider_integration_credentials", {
      method: "POST",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    });
  }

  return storageReference;
}

export function getProviderCredentialSecret(
  provider: IssueProvider,
  integrationId: string | undefined,
  kind: string,
  workspaceId?: string
): string | undefined {
  if (getDataStoreMode() === "supabase" && integrationId && isUuid(integrationId)) {
    throw new Error("Use getProviderCredentialSecretAsync when DATA_STORE=supabase");
  }

  const store = readStore();
  const credential = store.credentials.find((item) =>
    item.workspaceId === workspaceId
    && item.provider === provider
    && item.kind === kind
    && (!integrationId || item.integrationId === integrationId)
  ) ?? store.credentials.find((item) =>
    workspaceId === undefined
    && item.provider === provider
    && item.kind === kind
    && (!integrationId || item.integrationId === integrationId)
  );

  if (!credential) {
    return undefined;
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(credential.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(credential.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(credential.ciphertext, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export async function getProviderCredentialSecretAsync(
  provider: IssueProvider,
  integrationId: string | undefined,
  kind: string,
  workspaceId?: string
): Promise<string | undefined> {
  if (getDataStoreMode() !== "supabase" || !integrationId) {
    return getProviderCredentialSecret(provider, integrationId, kind, workspaceId);
  }

  const credentialKind = toSupabaseCredentialKind(provider, kind);
  const rows = await supabaseServiceRest<SupabaseCredentialRow[]>(
    `/rest/v1/provider_integration_credentials?integration_id=eq.${encodeURIComponent(integrationId)}&credential_kind=eq.${encodeURIComponent(credentialKind)}&status=eq.active&select=id,integration_id,credential_kind,storage_reference,scopes,expires_at,ciphertext,iv,tag,updated_at&limit=1`
  );
  const credential = rows[0];

  if (!credential?.ciphertext || !credential.iv || !credential.tag) {
    return undefined;
  }

  return decryptSecret({
    ciphertext: credential.ciphertext,
    iv: credential.iv,
    tag: credential.tag
  });
}

export function deleteProviderCredentialSecrets(provider: IssueProvider, integrationId: string, workspaceId?: string): number {
  if (getDataStoreMode() === "supabase" && isUuid(integrationId)) {
    throw new Error("Use deleteProviderCredentialSecretsAsync when DATA_STORE=supabase");
  }

  const store = readStore();
  const initialCount = store.credentials.length;

  store.credentials = store.credentials.filter((credential) =>
    credential.workspaceId !== workspaceId || credential.provider !== provider || credential.integrationId !== integrationId
  );

  if (store.credentials.length !== initialCount) {
    writeStore(store);
  }

  return initialCount - store.credentials.length;
}

export async function deleteProviderCredentialSecretsAsync(provider: IssueProvider, integrationId: string, workspaceId?: string): Promise<number> {
  if (getDataStoreMode() !== "supabase") {
    return deleteProviderCredentialSecrets(provider, integrationId, workspaceId);
  }

  const rows = await supabaseServiceRest<Array<{ id: string }>>(
    `/rest/v1/provider_integration_credentials?integration_id=eq.${encodeURIComponent(integrationId)}&select=id`
  );

  if (rows.length === 0) {
    return 0;
  }

  await supabaseServiceRest(`/rest/v1/provider_integration_credentials?integration_id=eq.${encodeURIComponent(integrationId)}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });

  return rows.length;
}

function readStore(): CredentialStore {
  try {
    return sanitizeStore(JSON.parse(readFileSync(credentialStorePath, "utf8")));
  } catch {
    return { credentials: [] };
  }
}

function writeStore(store: CredentialStore): void {
  mkdirSync(path.dirname(credentialStorePath), { recursive: true });
  const tempPath = `${credentialStorePath}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  renameSync(tempPath, credentialStorePath);
}

function sanitizeStore(value: unknown): CredentialStore {
  if (!isRecord(value) || !Array.isArray(value.credentials)) {
    return { credentials: [] };
  }

  return {
    credentials: value.credentials.flatMap((credential) => {
      if (!isRecord(credential)
        || !isIssueProvider(credential.provider)
        || typeof credential.integrationId !== "string"
        || typeof credential.kind !== "string"
        || typeof credential.iv !== "string"
        || typeof credential.tag !== "string"
        || typeof credential.ciphertext !== "string"
        || typeof credential.updatedAt !== "string") {
        return [];
      }

      return [{
        workspaceId: typeof credential.workspaceId === "string" ? credential.workspaceId : undefined,
        provider: credential.provider,
        integrationId: credential.integrationId,
        kind: credential.kind,
        iv: credential.iv,
        tag: credential.tag,
        ciphertext: credential.ciphertext,
        updatedAt: credential.updatedAt,
        expiresAt: typeof credential.expiresAt === "string" ? credential.expiresAt : undefined,
        scopes: Array.isArray(credential.scopes) ? credential.scopes.filter((scope): scope is string => typeof scope === "string") : undefined
      }];
    })
  };
}

function encryptionKey(): Buffer {
  const configuredKey = process.env.CHANGETHIS_SECRET_KEY;

  if (!configuredKey && process.env.NODE_ENV === "production") {
    throw new Error("CHANGETHIS_SECRET_KEY is required to store provider credentials in production");
  }

  return createHash("sha256").update(configuredKey ?? "changethis-local-development-secret").digest();
}

function encryptSecret(value: string): { iv: string; tag: string; ciphertext: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    ciphertext: ciphertext.toString("base64url")
  };
}

function decryptSecret(secret: { iv: string; tag: string; ciphertext: string }): string {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(secret.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(secret.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function toSupabaseCredentialKind(provider: IssueProvider, kind: string): string {
  if (provider === "github" && kind === "installation_id") {
    return "github_app_installation";
  }

  if (kind === "access_token") {
    return "oauth_token";
  }

  if (kind === "refresh_token") {
    return "oauth_refresh_token";
  }

  return kind;
}

function displayNameForCredential(provider: IssueProvider, kind: string): string {
  if (provider === "github" && kind === "installation_id") {
    return "GitHub App installation";
  }

  if (provider === "gitlab" && kind === "access_token") {
    return "GitLab OAuth token";
  }

  if (provider === "gitlab" && kind === "refresh_token") {
    return "GitLab OAuth refresh token";
  }

  return `${provider} ${kind}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function isIssueProvider(value: unknown): value is IssueProvider {
  return value === "github" || value === "gitlab";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
