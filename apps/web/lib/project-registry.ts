import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  validateIssueTarget,
  type IssueProvider,
  type IssueCreationMode,
  type IssueTarget,
  type Site,
  type WidgetButtonPosition,
  type WidgetButtonVariant,
  type WidgetDisplayMode,
  type WidgetLocale,
  type WidgetMode,
  type WidgetReporterFields
} from "@changethis/shared";
import {
  demoProject,
  localWorkspace,
  workspaceDemoProjectKey,
  workspaceDemoProjectName,
  type ChangeThisProject
} from "./demo-project";
import { getInternalApiUrl, getInternalSessionCookieHeader } from "./internal-api";
import { getDataStoreMode } from "./runtime";

type StoredConnectedSite = Site & {
  issueTarget: IssueTarget;
};

type SiteRegistryStore = {
  sites: StoredConnectedSite[];
};

export type CreateConnectedSiteInput = {
  name?: string;
  allowedOrigin: string;
  provider: IssueProvider;
  repositoryUrl: string;
  integrationId?: string;
  externalProjectId?: string;
  workspaceId?: string;
  widgetLocale?: WidgetLocale;
  widgetButtonPosition?: WidgetButtonPosition;
  widgetButtonVariant?: WidgetButtonVariant;
  widgetDisplayMode?: WidgetDisplayMode;
  widgetReporterFields?: WidgetReporterFields;
  widgetTitle?: string;
  widgetModes?: WidgetMode[];
  issueCreationMode?: IssueCreationMode;
};

export type ProjectIssueTargetUpdate = {
  projectKey: string;
  provider: IssueProvider;
  repositoryUrl: string;
  integrationId?: string;
  externalProjectId?: string;
};

export type ProjectWidgetSettingsUpdate = {
  projectKey: string;
  name?: string;
  allowedOrigin?: string;
  widgetLocale: WidgetLocale;
  widgetButtonPosition: WidgetButtonPosition;
  widgetButtonVariant: WidgetButtonVariant;
  widgetDisplayMode: WidgetDisplayMode;
  widgetReporterFields: WidgetReporterFields;
  widgetTitle: string;
  widgetModes: WidgetMode[];
  issueCreationMode: IssueCreationMode;
};

export const defaultWidgetTitle = "Que faut-il changer ?";
export const maxWidgetTitleLength = 240;
export const defaultWidgetModes: WidgetMode[] = ["comment", "pin", "screenshot"];

const defaultStore: SiteRegistryStore = {
  sites: []
};

const localDataDir = process.env.CHANGETHIS_DATA_DIR ?? path.join(process.cwd(), ".changethis-data");
const localDataFile = path.join(localDataDir, "connected-sites.json");

let lock: Promise<unknown> = Promise.resolve();

export async function listConfiguredProjects(workspaceId?: string): Promise<ChangeThisProject[]> {
  if (usesInternalProjectRegistry()) {
    if (!workspaceId) {
      return [];
    }

    const rows = await internalRequest<InternalSiteRow[]>(`/sites?${new URLSearchParams({ workspace_id: workspaceId }).toString()}`);
    return rows.map(mapInternalSite);
  }

  const store = await readStore();
  return store.sites
    .filter((site) => !workspaceId || site.workspaceId === workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((site) => normalizeStoredSite(site));
}

export async function findConfiguredProjectByKey(
  projectKey: string,
  workspaceId?: string
): Promise<ChangeThisProject | undefined> {
  if (usesInternalProjectRegistry()) {
    if (workspaceId) {
      const project = (await listConfiguredProjects(workspaceId)).find((item) => item.publicKey === projectKey);
      return project ?? (projectKey === demoProject.publicKey ? demoProject : undefined);
    }

    const row = await internalRequest<InternalSiteRow>(`/public/projects/${encodeURIComponent(projectKey)}`, { auth: false, allow404: true });
    if (row) {
      return mapInternalSite(row);
    }

    return projectKey === demoProject.publicKey ? demoProject : undefined;
  }

  const project = (await listConfiguredProjects(workspaceId)).find((item) => item.publicKey === projectKey);
  if (project) {
    return project;
  }

  return !workspaceId && projectKey === demoProject.publicKey ? demoProject : undefined;
}

export async function ensureWorkspaceDemoProject(workspaceId: string, origin?: string | null): Promise<ChangeThisProject> {
  const normalizedOrigin = normalizeAllowedOrigin(origin ?? "") ?? demoProject.allowedOrigins[0];
  const allowedOrigins = [...new Set([normalizedOrigin, ...demoProject.allowedOrigins].filter((value): value is string => Boolean(value)))];

  return {
    ...demoProject,
    workspaceId,
    publicKey: workspaceDemoProjectKey(workspaceId),
    name: workspaceDemoProjectName,
    allowedOrigins
  };
}

export async function createConnectedSite(input: CreateConnectedSiteInput): Promise<ChangeThisProject> {
  const issueTarget = parseRepositoryUrl(input.repositoryUrl, input.provider, {
    externalProjectId: input.externalProjectId,
    integrationId: input.integrationId
  });

  if (!issueTarget) {
    throw new ProjectTargetValidationError("Repository URL must match the selected provider", 422);
  }

  const allowedOrigin = normalizeAllowedOrigin(input.allowedOrigin);
  if (!allowedOrigin) {
    throw new ProjectTargetValidationError("Site URL must be a valid HTTP origin", 422);
  }

  const workspaceId = input.workspaceId ?? localWorkspace.id;
  const publicKey = `ct_${crypto.randomUUID().replaceAll("-", "")}`;
  const name = normalizeSiteName(input.name) ?? issueTarget.project;
  const widgetLocale = input.widgetLocale ?? "fr";
  const widgetButtonPosition = input.widgetButtonPosition ?? "bottom-right";
  const widgetButtonVariant = input.widgetButtonVariant ?? "default";
  const widgetDisplayMode = input.widgetDisplayMode ?? widgetDisplayModeFromVariant(input.widgetButtonVariant);
  const widgetReporterFields = input.widgetReporterFields ?? "optional";
  const widgetTitle = normalizeWidgetTitle(input.widgetTitle);
  const widgetModes = normalizeWidgetModes(input.widgetModes);
  const issueCreationMode = input.issueCreationMode ?? "manual";

  if (usesInternalProjectRegistry()) {
    const row = await internalRequest<InternalSiteRow>("/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: workspaceId,
        public_key: publicKey,
        name,
        allowed_origins: [allowedOrigin],
        widget_locale: widgetLocale,
        widget_button_position: widgetButtonPosition,
        widget_button_variant: widgetButtonVariant,
        widget_display_mode: widgetDisplayMode,
        widget_reporter_fields: widgetReporterFields,
        widget_title: widgetTitle,
        widget_modes: widgetModes,
        issue_creation_mode: issueCreationMode,
        issue_target: {
          provider: issueTarget.provider,
          namespace: issueTarget.namespace,
          project_name: issueTarget.project,
          integration_id: issueTarget.integrationId,
          external_project_id: issueTarget.externalProjectId,
          web_url: issueTarget.webUrl
        }
      })
    });
    return mapInternalSite(row);
  }

  const now = new Date().toISOString();
  const site: StoredConnectedSite = {
    id: `site_${crypto.randomUUID()}`,
    workspaceId,
    publicKey,
    name,
    allowedOrigins: [allowedOrigin],
    widgetLocale,
    widgetButtonPosition,
    widgetButtonVariant,
    widgetDisplayMode,
    widgetReporterFields,
    widgetTitle,
    widgetModes,
    issueCreationMode,
    issueTarget,
    createdAt: now,
    updatedAt: now
  };

  await updateStore((store) => {
    store.sites = [site, ...store.sites];
  });

  return { ...site };
}

export async function updateProjectWidgetSettings(
  update: ProjectWidgetSettingsUpdate,
  workspaceId?: string
): Promise<ChangeThisProject> {
  const allowedOrigin = update.allowedOrigin === undefined
    ? undefined
    : normalizeAllowedOrigin(update.allowedOrigin);

  if (update.allowedOrigin !== undefined && !allowedOrigin) {
    throw new ProjectTargetValidationError("Site URL must be a valid HTTP origin", 422);
  }

  const name = update.name?.trim();
  if (update.name !== undefined && (!name || name.length > 120)) {
    throw new ProjectTargetValidationError("Project name must contain 1 to 120 characters", 422);
  }

  if (usesInternalProjectRegistry()) {
    const row = await internalRequest<InternalSiteRow>(`/sites/${encodeURIComponent(update.projectKey)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        widget_locale: update.widgetLocale,
        widget_button_position: update.widgetButtonPosition,
        widget_button_variant: update.widgetButtonVariant,
        widget_display_mode: update.widgetDisplayMode,
        widget_reporter_fields: update.widgetReporterFields,
        widget_title: normalizeWidgetTitle(update.widgetTitle),
        widget_modes: normalizeWidgetModes(update.widgetModes),
        issue_creation_mode: update.issueCreationMode,
        allowed_origin: allowedOrigin
      })
    });
    return mapInternalSite(row);
  }

  let updatedProject: ChangeThisProject | undefined;
  const now = new Date().toISOString();

  await updateStore((store) => {
    store.sites = store.sites.map((site) => {
      if (site.publicKey !== update.projectKey || (workspaceId && site.workspaceId !== workspaceId)) {
        return site;
      }

      const updatedSite = {
        ...site,
        name: name ?? site.name,
        widgetLocale: update.widgetLocale,
        widgetButtonPosition: update.widgetButtonPosition,
        widgetButtonVariant: update.widgetButtonVariant,
        widgetDisplayMode: update.widgetDisplayMode,
        widgetReporterFields: update.widgetReporterFields,
        widgetTitle: normalizeWidgetTitle(update.widgetTitle),
        widgetModes: normalizeWidgetModes(update.widgetModes),
        issueCreationMode: update.issueCreationMode,
        allowedOrigins: allowedOrigin ? [allowedOrigin] : site.allowedOrigins,
        updatedAt: now
      };

      updatedProject = { ...updatedSite };
      return updatedSite;
    });
  });

  if (!updatedProject) {
    throw new ProjectTargetValidationError("Unknown project", 404);
  }

  return updatedProject;
}

export async function deleteConnectedSite(projectKey: string, workspaceId?: string): Promise<boolean> {
  if (usesInternalProjectRegistry()) {
    const response = await internalFetch(`/sites/${encodeURIComponent(projectKey)}`, { method: "DELETE" });
    if (response.status === 404) {
      return false;
    }
    if (!response.ok) {
      throw new ProjectTargetValidationError(await readInternalErrorMessage(response), response.status);
    }
    return true;
  }

  let deleted = false;

  await updateStore((store) => {
    const nextSites = store.sites.filter((site) => {
      const shouldDelete = site.publicKey === projectKey && (!workspaceId || site.workspaceId === workspaceId);
      if (shouldDelete) {
        deleted = true;
      }
      return !shouldDelete;
    });

    store.sites = nextSites;
  });

  return deleted;
}

export async function clearConnectedSites(workspaceId: string): Promise<number> {
  if (usesInternalProjectRegistry()) {
    const result = await internalRequest<{ deleted: number }>(`/sites?${new URLSearchParams({ workspace_id: workspaceId }).toString()}`, {
      method: "DELETE"
    });
    return result.deleted;
  }

  let deleted = 0;

  await updateStore((store) => {
    const nextSites = store.sites.filter((site) => {
      if (site.workspaceId === workspaceId) {
        deleted += 1;
        return false;
      }

      return true;
    });

    store.sites = nextSites;
  });

  return deleted;
}

export async function saveProjectIssueTarget(update: ProjectIssueTargetUpdate, workspaceId?: string): Promise<ChangeThisProject> {
  const project = (await listConfiguredProjects(workspaceId)).find((item) => item.publicKey === update.projectKey);

  if (!project) {
    throw new ProjectTargetValidationError("Unknown project", 404);
  }

  const issueTarget = parseRepositoryUrl(update.repositoryUrl, update.provider, {
    externalProjectId: update.externalProjectId,
    integrationId: update.integrationId
  });

  if (!issueTarget) {
    throw new ProjectTargetValidationError("Repository URL must match the selected provider", 422);
  }

  if (usesInternalProjectRegistry()) {
    const row = await internalRequest<InternalSiteRow>(`/sites/${encodeURIComponent(update.projectKey)}/issue-target`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_key: update.projectKey,
        provider: issueTarget.provider,
        namespace: issueTarget.namespace,
        project_name: issueTarget.project,
        integration_id: issueTarget.integrationId,
        external_project_id: issueTarget.externalProjectId,
        web_url: issueTarget.webUrl
      })
    });
    return mapInternalSite(row);
  }

  await updateStore((store) => {
    store.sites = store.sites.map((site) => {
      if (site.publicKey !== update.projectKey || (workspaceId && site.workspaceId !== workspaceId)) {
        return site;
      }

      return {
        ...site,
        issueTarget,
        updatedAt: new Date().toISOString()
      };
    });
  });

  return {
    ...project,
    issueTarget
  };
}

export async function isKnownOrigin(origin: string | null): Promise<boolean> {
  if (!origin) {
    return false;
  }

  if (demoProject.allowedOrigins.includes(origin)) {
    return true;
  }

  if (usesInternalProjectRegistry()) {
    const result = await internalRequest<{ known: boolean }>(
      `/public/origins/known?${new URLSearchParams({ origin }).toString()}`,
      { auth: false }
    );
    return result.known;
  }

  const store = await readStore();
  return store.sites.some((site) => site.allowedOrigins.includes(origin));
}

export function ensureIssueTargetConfigured(project: ChangeThisProject): IssueTarget {
  const validation = validateIssueTarget(project.issueTarget);

  if (!validation.ok) {
    throw new ProjectTargetValidationError(`Project must be linked to a valid GitHub or GitLab issue destination: ${validation.error}`, 409);
  }

  return validation.value;
}

export function installSnippet(project: string | Pick<ChangeThisProject, "publicKey">): string {
  const projectKey = typeof project === "string" ? project : project.publicKey;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return `<script src="${appUrl}/widget-loader.js" data-project="${projectKey}"></script>`;
}

type InternalIssueTargetRow = {
  provider?: unknown;
  namespace?: unknown;
  project_name?: unknown;
  integration_id?: unknown;
  external_project_id?: unknown;
  web_url?: unknown;
};

type InternalSiteRow = {
  id?: unknown;
  workspace_id?: unknown;
  public_key?: unknown;
  name?: unknown;
  allowed_origins?: unknown;
  widget_locale?: unknown;
  widget_button_position?: unknown;
  widget_button_variant?: unknown;
  widget_display_mode?: unknown;
  widget_reporter_fields?: unknown;
  widget_title?: unknown;
  widget_modes?: unknown;
  issue_creation_mode?: unknown;
  issue_target?: InternalIssueTargetRow | null;
  created_at?: unknown;
  updated_at?: unknown;
};

function usesInternalProjectRegistry(): boolean {
  return getDataStoreMode() === "internal";
}

// Keep in sync with INTERNAL_API_TIMEOUT_MS in internal-api.ts: a stalled
// internal API must abort here rather than bubble up as an nginx 504.
const INTERNAL_API_TIMEOUT_MS = Number(process.env.INTERNAL_API_TIMEOUT_MS ?? 12_000);

async function internalFetch(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<Response> {
  const { auth = true, headers, signal, ...rest } = init;
  const requestHeaders: Record<string, string> = { Accept: "application/json", ...(headers as Record<string, string> | undefined) };

  if (auth) {
    const cookieHeader = await getInternalSessionCookieHeader();
    if (cookieHeader) {
      requestHeaders.Cookie = cookieHeader;
    }
  }

  return fetch(`${getInternalApiUrl()}${path}`, {
    ...rest,
    headers: requestHeaders,
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(INTERNAL_API_TIMEOUT_MS)
  });
}

async function readInternalErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown; error?: unknown };
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // Keep the generic message when the API does not return JSON.
  }
  return "Unable to complete the request";
}

async function internalRequest<T>(
  path: string,
  init: RequestInit & { auth?: boolean; allow404?: boolean } = {}
): Promise<T> {
  const { allow404 = false, ...requestInit } = init;
  const response = await internalFetch(path, requestInit);

  if (allow404 && response.status === 404) {
    return undefined as T;
  }

  if (!response.ok) {
    throw new ProjectTargetValidationError(await readInternalErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function mapInternalIssueTarget(row: InternalIssueTargetRow | null | undefined): IssueTarget | undefined {
  if (!row || typeof row.provider !== "string" || typeof row.namespace !== "string" || typeof row.project_name !== "string") {
    return undefined;
  }

  return {
    provider: row.provider as IssueProvider,
    namespace: row.namespace,
    project: row.project_name,
    externalProjectId: typeof row.external_project_id === "string" ? row.external_project_id : undefined,
    integrationId: typeof row.integration_id === "string" ? row.integration_id : undefined,
    webUrl: typeof row.web_url === "string" ? row.web_url : undefined
  };
}

function mapInternalSite(row: InternalSiteRow): ChangeThisProject {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    publicKey: String(row.public_key),
    name: String(row.name),
    allowedOrigins: Array.isArray(row.allowed_origins) ? row.allowed_origins.filter((origin): origin is string => typeof origin === "string") : [],
    widgetLocale: parseWidgetLocale(row.widget_locale),
    widgetButtonPosition: parseWidgetButtonPosition(row.widget_button_position),
    widgetButtonVariant: parseWidgetButtonVariant(row.widget_button_variant),
    widgetDisplayMode: parseWidgetDisplayMode(row.widget_display_mode),
    widgetReporterFields: parseWidgetReporterFields(row.widget_reporter_fields),
    widgetTitle: parseWidgetTitle(row.widget_title),
    widgetModes: parseWidgetModes(row.widget_modes),
    issueCreationMode: parseIssueCreationMode(row.issue_creation_mode),
    issueTarget: mapInternalIssueTarget(row.issue_target) ?? { provider: "github", namespace: "", project: "" },
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString()
  };
}

export class ProjectTargetValidationError extends Error {
  readonly status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = "ProjectTargetValidationError";
    this.status = status;
  }
}

function normalizeStoredSite(site: StoredConnectedSite): ChangeThisProject {
  return {
    ...site,
    widgetTitle: parseWidgetTitle(site.widgetTitle),
    widgetModes: parseWidgetModes(site.widgetModes),
    widgetDisplayMode: parseWidgetDisplayMode(site.widgetDisplayMode ?? site.widgetButtonVariant),
    issueCreationMode: parseIssueCreationMode(site.issueCreationMode)
  };
}

function parseRepositoryUrl(
  value: string,
  provider: IssueProvider,
  options: { externalProjectId?: string; integrationId?: string } = {}
): IssueTarget | undefined {
  try {
    const url = new URL(value.trim());
    const parts = url.pathname.split("/").filter(Boolean);

    if (provider === "github" && url.hostname === "github.com" && parts.length >= 2) {
      return validIssueTarget({
        provider,
        namespace: parts[0],
        project: parts[1],
        integrationId: options.integrationId,
        webUrl: `https://github.com/${parts[0]}/${parts[1]}`
      });
    }

    if (provider === "gitlab" && parts.length >= 2 && isAllowedGitLabRepositoryOrigin(url)) {
      const namespace = parts.slice(0, -1).join("/");
      const project = parts.at(-1);

      if (!namespace || !project) {
        return undefined;
      }

      return validIssueTarget({
        provider,
        namespace,
        project,
        externalProjectId: options.externalProjectId ?? encodeURIComponent(`${namespace}/${project}`),
        integrationId: options.integrationId,
        webUrl: `${url.origin}/${parts.join("/")}`
      });
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isAllowedGitLabRepositoryOrigin(url: URL): boolean {
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    return false;
  }

  if (url.hostname === "gitlab.com") {
    return true;
  }

  const configuredOrigin = normalizeGitLabBaseUrl(process.env.GITLAB_BASE_URL);

  if (configuredOrigin && url.origin === configuredOrigin) {
    return true;
  }

  return url.protocol === "https:";
}

function normalizeGitLabBaseUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function normalizeAllowedOrigin(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

function parseWidgetLocale(value: unknown): WidgetLocale {
  return value === "en" ? "en" : "fr";
}

function parseWidgetButtonPosition(value: unknown): WidgetButtonPosition {
  return value === "bottom-left" || value === "top-right" || value === "top-left" ? value : "bottom-right";
}

function parseWidgetButtonVariant(value: unknown): WidgetButtonVariant {
  return value === "subtle" ? "subtle" : "default";
}

function parseWidgetDisplayMode(value: unknown): WidgetDisplayMode {
  return value === "subtle" || value === "hidden" || value === "disabled" ? value : "standard";
}

function widgetDisplayModeFromVariant(value: unknown): WidgetDisplayMode {
  return parseWidgetButtonVariant(value) === "subtle" ? "subtle" : "standard";
}

function parseWidgetReporterFields(value: unknown): WidgetReporterFields {
  return value === "hidden" || value === "required" ? value : "optional";
}

function parseWidgetTitle(value: unknown): string {
  return normalizeWidgetTitle(typeof value === "string" ? value : undefined);
}

function normalizeWidgetTitle(value: string | undefined): string {
  const title = value?.trim();
  return title ? title.slice(0, maxWidgetTitleLength) : defaultWidgetTitle;
}

function parseWidgetModes(value: unknown): WidgetMode[] {
  return normalizeWidgetModes(Array.isArray(value) ? value : undefined);
}

function normalizeWidgetModes(value: unknown[] | undefined): WidgetMode[] {
  const modes = value?.filter((mode): mode is WidgetMode => mode === "comment" || mode === "pin" || mode === "screenshot") ?? defaultWidgetModes;
  const uniqueModes = defaultWidgetModes.filter((mode) => modes.includes(mode));
  return uniqueModes.length > 0 ? uniqueModes : defaultWidgetModes;
}

function parseIssueCreationMode(value: unknown): IssueCreationMode {
  return value === "automatic" ? "automatic" : "manual";
}

function hasOptionalWidgetPayloadColumns(payload: Record<string, unknown>): boolean {
  return ["widget_reporter_fields", "issue_creation_mode", "widget_title", "widget_modes"].some((column) => column in payload);
}

function normalizeSiteName(value: string | undefined): string | undefined {
  const name = value?.trim();
  return name ? name.slice(0, 120) : undefined;
}

async function readStore(): Promise<SiteRegistryStore> {
  try {
    const raw = await readFile(localDataFile, "utf8");
    return sanitizeStore(JSON.parse(raw));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return structuredClone(defaultStore);
    }

    throw error;
  }
}

async function updateStore(mutator: (store: SiteRegistryStore) => void): Promise<void> {
  const next = lock.then(async () => {
    const store = await readStore();
    mutator(store);
    await mkdir(path.dirname(localDataFile), { recursive: true });
    const tempPath = `${localDataFile}.${crypto.randomUUID()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(tempPath, localDataFile);
  });

  lock = next.catch(() => undefined);
  return next;
}

function validIssueTarget(value: IssueTarget): IssueTarget | undefined {
  const validation = validateIssueTarget(value);
  return validation.ok ? validation.value : undefined;
}

function sanitizeStore(value: unknown): SiteRegistryStore {
  if (!isRecord(value) || !Array.isArray(value.sites)) {
    return structuredClone(defaultStore);
  }

  return {
    sites: value.sites.flatMap((site) => {
      if (
        !isRecord(site)
        || typeof site.id !== "string"
        || typeof site.workspaceId !== "string"
        || typeof site.publicKey !== "string"
        || typeof site.name !== "string"
        || !Array.isArray(site.allowedOrigins)
        || typeof site.createdAt !== "string"
        || typeof site.updatedAt !== "string"
      ) {
        return [];
      }

      const issueTarget = validateIssueTarget(site.issueTarget);
      if (!issueTarget.ok) {
        return [];
      }

      const allowedOrigins = site.allowedOrigins.filter((origin) => typeof origin === "string" && normalizeAllowedOrigin(origin) === origin);
      if (allowedOrigins.length === 0) {
        return [];
      }

      return [{
        id: site.id,
        workspaceId: site.workspaceId,
        publicKey: site.publicKey,
        name: site.name,
        allowedOrigins,
        widgetLocale: parseWidgetLocale(site.widgetLocale),
        widgetButtonPosition: parseWidgetButtonPosition(site.widgetButtonPosition),
        widgetButtonVariant: parseWidgetButtonVariant(site.widgetButtonVariant),
        widgetDisplayMode: parseWidgetDisplayMode(site.widgetDisplayMode ?? site.widgetButtonVariant),
        widgetReporterFields: parseWidgetReporterFields(site.widgetReporterFields),
        widgetTitle: parseWidgetTitle(site.widgetTitle),
        widgetModes: parseWidgetModes(site.widgetModes),
        issueCreationMode: parseIssueCreationMode(site.issueCreationMode),
        issueTarget: issueTarget.value,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt
      }];
    })
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
