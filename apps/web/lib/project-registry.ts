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
