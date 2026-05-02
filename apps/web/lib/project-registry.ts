import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  validateIssueTarget,
  type IssueProvider,
  type IssueTarget,
  type Site,
  type WidgetButtonPosition,
  type WidgetButtonVariant,
  type WidgetLocale
} from "@changethis/shared";
import { demoProject, localWorkspace, type ChangeThisProject } from "./demo-project";
import { getDataStoreMode } from "./runtime";
import { isSupabaseServiceConfigured, supabaseServiceRest } from "./supabase-server";

type StoredConnectedSite = Site & {
  issueTarget: IssueTarget;
};

type SiteRegistryStore = {
  sites: StoredConnectedSite[];
};

type SupabaseProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  public_key: string;
  allowed_origins: string[];
  widget_locale: unknown;
  widget_button_position: unknown;
  widget_button_variant: unknown;
  created_at: string;
  updated_at: string;
};

type SupabaseProjectPublicKeyRow = {
  project_id: string;
  public_key: string;
};

type SupabaseIssueTargetRow = {
  project_id: string;
  integration_id?: string | null;
  provider: IssueProvider;
  namespace: string;
  project_name: string;
  external_project_id?: string | null;
  web_url?: string | null;
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
  widgetLocale: WidgetLocale;
  widgetButtonPosition: WidgetButtonPosition;
  widgetButtonVariant: WidgetButtonVariant;
};

const defaultStore: SiteRegistryStore = {
  sites: []
};

const localDataDir = process.env.CHANGETHIS_DATA_DIR ?? path.join(process.cwd(), ".changethis-data");
const localDataFile = path.join(localDataDir, "connected-sites.json");

let lock: Promise<unknown> = Promise.resolve();

export async function listConfiguredProjects(workspaceId?: string): Promise<ChangeThisProject[]> {
  if (usesSupabaseProjectRegistry()) {
    return listSupabaseConfiguredProjects(workspaceId);
  }

  const store = await readStore();
  return store.sites
    .filter((site) => !workspaceId || site.workspaceId === workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((site) => ({ ...site }));
}

export async function findConfiguredProjectByKey(
  projectKey: string,
  workspaceId?: string
): Promise<ChangeThisProject | undefined> {
  if (usesSupabaseProjectRegistry()) {
    return findSupabaseConfiguredProjectByKey(projectKey, workspaceId);
  }

  const project = (await listConfiguredProjects(workspaceId)).find((item) => item.publicKey === projectKey);
  if (project) {
    return project;
  }

  return !workspaceId && projectKey === demoProject.publicKey ? demoProject : undefined;
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

  if (usesSupabaseProjectRegistry()) {
    return createSupabaseConnectedSite(input, issueTarget, allowedOrigin);
  }

  const workspaceId = input.workspaceId ?? localWorkspace.id;
  const now = new Date().toISOString();
  const site: StoredConnectedSite = {
    id: `site_${crypto.randomUUID()}`,
    workspaceId,
    publicKey: `ct_${crypto.randomUUID().replaceAll("-", "")}`,
    name: normalizeSiteName(input.name) ?? issueTarget.project,
    allowedOrigins: [allowedOrigin],
    widgetLocale: input.widgetLocale ?? "fr",
    widgetButtonPosition: input.widgetButtonPosition ?? "bottom-right",
    widgetButtonVariant: input.widgetButtonVariant ?? "default",
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
  if (usesSupabaseProjectRegistry()) {
    return updateSupabaseProjectWidgetSettings(update, workspaceId);
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
        widgetLocale: update.widgetLocale,
        widgetButtonPosition: update.widgetButtonPosition,
        widgetButtonVariant: update.widgetButtonVariant,
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
  if (usesSupabaseProjectRegistry()) {
    return deleteSupabaseConnectedSite(projectKey, workspaceId);
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
  if (usesSupabaseProjectRegistry()) {
    return clearSupabaseConnectedSites(workspaceId);
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
  if (usesSupabaseProjectRegistry()) {
    return saveSupabaseProjectIssueTarget(update, workspaceId);
  }

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

  if (usesSupabaseProjectRegistry()) {
    return isKnownSupabaseOrigin(origin);
  }

  const store = await readStore();
  return demoProject.allowedOrigins.includes(origin) || store.sites.some((site) => site.allowedOrigins.includes(origin));
}

export function ensureIssueTargetConfigured(project: ChangeThisProject): IssueTarget {
  const validation = validateIssueTarget(project.issueTarget);

  if (!validation.ok) {
    throw new ProjectTargetValidationError(`Project must be linked to a valid GitHub or GitLab issue destination: ${validation.error}`, 409);
  }

  return validation.value;
}

export function installSnippet(project: string | Pick<ChangeThisProject, "publicKey" | "widgetLocale" | "widgetButtonPosition" | "widgetButtonVariant">): string {
  const projectKey = typeof project === "string" ? project : project.publicKey;
  const locale = typeof project === "string" ? undefined : project.widgetLocale;
  const position = typeof project === "string" ? undefined : project.widgetButtonPosition;
  const variant = typeof project === "string" ? undefined : project.widgetButtonVariant;
  const attributes = [
    `src="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/widget.js"`,
    `data-project="${projectKey}"`,
    locale ? `data-locale="${locale}"` : undefined,
    position ? `data-position="${position}"` : undefined,
    variant && variant !== "default" ? `data-button-variant="${variant}"` : undefined
  ].filter(Boolean).join(" ");

  return `<script ${attributes}></script>`;
}

export class ProjectTargetValidationError extends Error {
  readonly status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = "ProjectTargetValidationError";
    this.status = status;
  }
}

function usesSupabaseProjectRegistry(): boolean {
  return getDataStoreMode() === "supabase";
}

function ensureSupabaseProjectRegistryConfigured(): void {
  if (!isSupabaseServiceConfigured()) {
    throw new Error("DATA_STORE=supabase requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
}

async function listSupabaseConfiguredProjects(workspaceId?: string): Promise<ChangeThisProject[]> {
  ensureSupabaseProjectRegistryConfigured();

  if (workspaceId && !isUuid(workspaceId)) {
    return [];
  }

  const params = new URLSearchParams({
    select: supabaseProjectSelect(),
    order: "created_at.desc"
  });

  if (workspaceId) {
    params.set("organization_id", `eq.${workspaceId}`);
  }

  const projectRows = await supabaseServiceRest<SupabaseProjectRow[]>(`/rest/v1/projects?${params.toString()}`);
  return hydrateSupabaseProjects(projectRows);
}

async function findSupabaseConfiguredProjectByKey(
  projectKey: string,
  workspaceId?: string
): Promise<ChangeThisProject | undefined> {
  ensureSupabaseProjectRegistryConfigured();

  if (!projectKey || (workspaceId && !isUuid(workspaceId))) {
    return undefined;
  }

  const keyParams = new URLSearchParams({
    public_key: `eq.${projectKey}`,
    status: "eq.active",
    select: "project_id,public_key",
    limit: "1"
  });
  const keyRows = await supabaseServiceRest<SupabaseProjectPublicKeyRow[]>(`/rest/v1/project_public_keys?${keyParams.toString()}`);
  const activeKey = keyRows[0];

  if (!activeKey) {
    return undefined;
  }

  const projectParams = new URLSearchParams({
    id: `eq.${activeKey.project_id}`,
    select: supabaseProjectSelect(),
    limit: "1"
  });

  if (workspaceId) {
    projectParams.set("organization_id", `eq.${workspaceId}`);
  }

  const projectRows = await supabaseServiceRest<SupabaseProjectRow[]>(`/rest/v1/projects?${projectParams.toString()}`);
  return (await hydrateSupabaseProjects(projectRows, [activeKey]))[0];
}

async function createSupabaseConnectedSite(
  input: CreateConnectedSiteInput,
  issueTarget: IssueTarget,
  allowedOrigin: string
): Promise<ChangeThisProject> {
  ensureSupabaseProjectRegistryConfigured();

  if (!input.workspaceId || !isUuid(input.workspaceId)) {
    throw new ProjectTargetValidationError("Workspace is required for Supabase project registry", 422);
  }

  const publicKey = `ct_${crypto.randomUUID().replaceAll("-", "")}`;
  const projectRows = await supabaseServiceRest<SupabaseProjectRow[]>("/rest/v1/projects", {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      organization_id: input.workspaceId,
      name: normalizeSiteName(input.name) ?? issueTarget.project,
      public_key: publicKey,
      allowed_origins: [allowedOrigin],
      widget_locale: input.widgetLocale ?? "fr",
      widget_button_position: input.widgetButtonPosition ?? "bottom-right",
      widget_button_variant: input.widgetButtonVariant ?? "default"
    })
  });
  const projectRow = projectRows[0];

  if (!projectRow) {
    throw new Error("Supabase did not return the created project");
  }

  await supabaseServiceRest("/rest/v1/project_public_keys", {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      project_id: projectRow.id,
      public_key: publicKey,
      status: "active",
      activated_at: projectRow.created_at
    })
  });

  const issueTargetRows = await supabaseServiceRest<SupabaseIssueTargetRow[]>("/rest/v1/issue_targets", {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      project_id: projectRow.id,
      ...toSupabaseIssueTargetPayload(issueTarget)
    })
  });
  const project = mapSupabaseProject(projectRow, publicKey, issueTargetRows[0]);

  if (!project) {
    throw new Error("Supabase returned an invalid project registry row");
  }

  return project;
}

async function updateSupabaseProjectWidgetSettings(
  update: ProjectWidgetSettingsUpdate,
  workspaceId?: string
): Promise<ChangeThisProject> {
  const project = await findSupabaseConfiguredProjectByKey(update.projectKey, workspaceId);

  if (!project || !isUuid(project.id)) {
    throw new ProjectTargetValidationError("Unknown project", 404);
  }

  const params = new URLSearchParams({
    id: `eq.${project.id}`,
    select: supabaseProjectSelect(),
    limit: "1"
  });

  if (workspaceId) {
    params.set("organization_id", `eq.${workspaceId}`);
  }

  const projectRows = await supabaseServiceRest<SupabaseProjectRow[]>(`/rest/v1/projects?${params.toString()}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      widget_locale: update.widgetLocale,
      widget_button_position: update.widgetButtonPosition,
      widget_button_variant: update.widgetButtonVariant
    })
  });
  const updatedProject = mapSupabaseProject(projectRows[0], project.publicKey, toSupabaseIssueTargetRow(project.id, project.issueTarget));

  if (!updatedProject) {
    throw new ProjectTargetValidationError("Unknown project", 404);
  }

  return updatedProject;
}

async function deleteSupabaseConnectedSite(projectKey: string, workspaceId?: string): Promise<boolean> {
  const project = await findSupabaseConfiguredProjectByKey(projectKey, workspaceId);

  if (!project || !isUuid(project.id)) {
    return false;
  }

  const params = new URLSearchParams({
    id: `eq.${project.id}`
  });

  if (workspaceId) {
    params.set("organization_id", `eq.${workspaceId}`);
  }

  await supabaseServiceRest(`/rest/v1/projects?${params.toString()}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });

  return true;
}

async function clearSupabaseConnectedSites(workspaceId: string): Promise<number> {
  if (!isUuid(workspaceId)) {
    return 0;
  }

  const projects = await listSupabaseConfiguredProjects(workspaceId);

  if (projects.length === 0) {
    return 0;
  }

  const params = new URLSearchParams({
    organization_id: `eq.${workspaceId}`
  });
  await supabaseServiceRest(`/rest/v1/projects?${params.toString()}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal"
    }
  });

  return projects.length;
}

async function saveSupabaseProjectIssueTarget(update: ProjectIssueTargetUpdate, workspaceId?: string): Promise<ChangeThisProject> {
  const project = await findSupabaseConfiguredProjectByKey(update.projectKey, workspaceId);

  if (!project || !isUuid(project.id)) {
    throw new ProjectTargetValidationError("Unknown project", 404);
  }

  const issueTarget = parseRepositoryUrl(update.repositoryUrl, update.provider, {
    externalProjectId: update.externalProjectId,
    integrationId: update.integrationId
  });

  if (!issueTarget) {
    throw new ProjectTargetValidationError("Repository URL must match the selected provider", 422);
  }

  const params = new URLSearchParams({
    on_conflict: "project_id"
  });
  const issueTargetRows = await supabaseServiceRest<SupabaseIssueTargetRow[]>(`/rest/v1/issue_targets?${params.toString()}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      project_id: project.id,
      ...toSupabaseIssueTargetPayload(issueTarget)
    })
  });
  const updatedIssueTarget = mapSupabaseIssueTarget(issueTargetRows[0]) ?? issueTarget;

  return {
    ...project,
    issueTarget: updatedIssueTarget
  };
}

async function isKnownSupabaseOrigin(origin: string): Promise<boolean> {
  const normalizedOrigin = normalizeAllowedOrigin(origin);

  if (normalizedOrigin !== origin) {
    return false;
  }

  const projects = await listSupabaseConfiguredProjects();
  return projects.some((project) => project.allowedOrigins.includes(origin));
}

async function hydrateSupabaseProjects(
  projectRows: SupabaseProjectRow[],
  activeKeyRows?: SupabaseProjectPublicKeyRow[]
): Promise<ChangeThisProject[]> {
  const projectIds = projectRows.map((project) => project.id).filter(isUuid);

  if (projectIds.length === 0) {
    return [];
  }

  const [keyRows, issueTargetRows] = await Promise.all([
    activeKeyRows ?? listSupabaseActiveProjectKeys(projectIds),
    listSupabaseIssueTargets(projectIds)
  ]);
  const keysByProjectId = new Map(keyRows.map((key) => [key.project_id, key.public_key]));
  const issueTargetsByProjectId = new Map(issueTargetRows.map((target) => [target.project_id, target]));

  return projectRows.flatMap((projectRow) => {
    const publicKey = keysByProjectId.get(projectRow.id);

    if (!publicKey) {
      return [];
    }

    const project = mapSupabaseProject(projectRow, publicKey, issueTargetsByProjectId.get(projectRow.id));
    return project ? [project] : [];
  });
}

async function listSupabaseActiveProjectKeys(projectIds: string[]): Promise<SupabaseProjectPublicKeyRow[]> {
  const params = new URLSearchParams({
    project_id: inFilter(projectIds),
    status: "eq.active",
    select: "project_id,public_key"
  });

  return supabaseServiceRest<SupabaseProjectPublicKeyRow[]>(`/rest/v1/project_public_keys?${params.toString()}`);
}

async function listSupabaseIssueTargets(projectIds: string[]): Promise<SupabaseIssueTargetRow[]> {
  const params = new URLSearchParams({
    project_id: inFilter(projectIds),
    select: "project_id,integration_id,provider,namespace,project_name,external_project_id,web_url",
    order: "created_at.desc"
  });

  return supabaseServiceRest<SupabaseIssueTargetRow[]>(`/rest/v1/issue_targets?${params.toString()}`);
}

function mapSupabaseProject(
  projectRow: SupabaseProjectRow | undefined,
  publicKey: string | undefined,
  issueTargetRow: SupabaseIssueTargetRow | undefined
): ChangeThisProject | undefined {
  if (!projectRow || !publicKey || !Array.isArray(projectRow.allowed_origins)) {
    return undefined;
  }

  const issueTarget = mapSupabaseIssueTarget(issueTargetRow);

  if (!issueTarget) {
    return undefined;
  }

  return {
    id: projectRow.id,
    workspaceId: projectRow.organization_id,
    publicKey,
    name: projectRow.name,
    allowedOrigins: projectRow.allowed_origins.filter((origin) => typeof origin === "string" && normalizeAllowedOrigin(origin) === origin),
    widgetLocale: parseWidgetLocale(projectRow.widget_locale),
    widgetButtonPosition: parseWidgetButtonPosition(projectRow.widget_button_position),
    widgetButtonVariant: parseWidgetButtonVariant(projectRow.widget_button_variant),
    issueTarget,
    createdAt: projectRow.created_at,
    updatedAt: projectRow.updated_at
  };
}

function mapSupabaseIssueTarget(row: SupabaseIssueTargetRow | undefined): IssueTarget | undefined {
  if (!row) {
    return undefined;
  }

  return validIssueTarget({
    provider: row.provider,
    namespace: row.namespace,
    project: row.project_name,
    externalProjectId: row.external_project_id ?? undefined,
    integrationId: row.integration_id ?? undefined,
    webUrl: row.web_url ?? undefined
  });
}

function toSupabaseIssueTargetPayload(issueTarget: IssueTarget): Record<string, string | null> {
  return {
    provider: issueTarget.provider,
    namespace: issueTarget.namespace,
    project_name: issueTarget.project,
    external_project_id: issueTarget.externalProjectId ?? null,
    integration_id: issueTarget.integrationId && isUuid(issueTarget.integrationId) ? issueTarget.integrationId : null,
    web_url: issueTarget.webUrl ?? null
  };
}

function toSupabaseIssueTargetRow(projectId: string, issueTarget: IssueTarget): SupabaseIssueTargetRow {
  return {
    project_id: projectId,
    provider: issueTarget.provider,
    namespace: issueTarget.namespace,
    project_name: issueTarget.project,
    external_project_id: issueTarget.externalProjectId,
    integration_id: issueTarget.integrationId,
    web_url: issueTarget.webUrl
  };
}

function supabaseProjectSelect(): string {
  return [
    "id",
    "organization_id",
    "name",
    "public_key",
    "allowed_origins",
    "widget_locale",
    "widget_button_position",
    "widget_button_variant",
    "created_at",
    "updated_at"
  ].join(",");
}

function inFilter(values: string[]): string {
  return `in.(${values.join(",")})`;
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
  const gitlabBaseUrl = process.env.GITLAB_BASE_URL;

  if (gitlabBaseUrl) {
    try {
      return url.origin === new URL(gitlabBaseUrl).origin;
    } catch {
      return false;
    }
  }

  return url.hostname.includes("gitlab");
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
