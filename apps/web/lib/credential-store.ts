import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { IssueProvider } from "@changethis/shared";

type StoredCredential = {
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

export type ProviderCredentialSecret = {
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
  return `local:${provider}:${integrationId}:${kind}`;
}

export function saveProviderCredentialSecret(secret: ProviderCredentialSecret): string {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret.value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const store = readStore();
  const reference = credentialStorageReference(secret.provider, secret.integrationId, secret.kind);

  store.credentials = [
    ...store.credentials.filter((credential) => credentialStorageReference(credential.provider, credential.integrationId, credential.kind) !== reference),
    {
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

export function getProviderCredentialSecret(provider: IssueProvider, integrationId: string | undefined, kind: string): string | undefined {
  const store = readStore();
  const credential = store.credentials.find((item) =>
    item.provider === provider
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

export function deleteProviderCredentialSecrets(provider: IssueProvider, integrationId: string): number {
  const store = readStore();
  const initialCount = store.credentials.length;

  store.credentials = store.credentials.filter((credential) =>
    credential.provider !== provider || credential.integrationId !== integrationId
  );

  if (store.credentials.length !== initialCount) {
    writeStore(store);
  }

  return initialCount - store.credentials.length;
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

function isIssueProvider(value: unknown): value is IssueProvider {
  return value === "github" || value === "gitlab";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
