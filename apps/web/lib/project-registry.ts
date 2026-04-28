import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateIssueTarget, type IssueProvider, type IssueTarget } from "@changethis/shared";
import { changeThisProjects, type ChangeThisProject } from "./demo-project";

type StoredProjectTarget = {
  projectKey: string;
  issueTarget: IssueTarget;
  updatedAt: string;
};

type ProjectTargetStore = {
  targets: StoredProjectTarget[];
};

export type ProjectIssueTargetUpdate = {
  projectKey: string;
  provider: IssueProvider;
  repositoryUrl: string;
};

const defaultStore: ProjectTargetStore = {
  targets: []
};

const localDataDir = process.env.CHANGETHIS_DATA_DIR ?? path.join(process.cwd(), ".changethis-data");
const localDataFile = path.join(localDataDir, "project-targets.json");

let lock: Promise<unknown> = Promise.resolve();

export async function listConfiguredProjects(workspaceId?: string): Promise<ChangeThisProject[]> {
  const store = await readStore();
  const configuredProjects = workspaceId
    ? changeThisProjects.filter((project) => project.workspaceId === workspaceId)
    : changeThisProjects;

  return configuredProjects.map((project) => ({
    ...project,
    issueTarget: store.targets.find((target) => target.projectKey === project.publicKey)?.issueTarget ?? project.issueTarget
  }));
}

export async function findConfiguredProjectByKey(
  projectKey: string,
  workspaceId?: string
): Promise<ChangeThisProject | undefined> {
  return (await listConfiguredProjects(workspaceId)).find((project) => project.publicKey === projectKey);
}

export async function saveProjectIssueTarget(update: ProjectIssueTargetUpdate, workspaceId?: string): Promise<ChangeThisProject> {
  const project = (await listConfiguredProjects(workspaceId)).find((item) => item.publicKey === update.projectKey);

  if (!project) {
    throw new ProjectTargetValidationError("Unknown project", 404);
  }

  const issueTarget = parseRepositoryUrl(update.repositoryUrl, update.provider);

  if (!issueTarget) {
    throw new ProjectTargetValidationError("Repository URL must match the selected provider", 422);
  }

  await updateStore((store) => {
    const nextTarget: StoredProjectTarget = {
      projectKey: update.projectKey,
      issueTarget,
      updatedAt: new Date().toISOString()
    };

    store.targets = [
      ...store.targets.filter((target) => target.projectKey !== update.projectKey),
      nextTarget
    ];
  });

  return {
    ...project,
    issueTarget
  };
}

export function ensureIssueTargetConfigured(project: ChangeThisProject): IssueTarget {
  const validation = validateIssueTarget(project.issueTarget);

  if (!validation.ok) {
    throw new ProjectTargetValidationError(`Project must be linked to a valid GitHub or GitLab issue destination: ${validation.error}`, 409);
  }

  return validation.value;
}

export class ProjectTargetValidationError extends Error {
  readonly status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = "ProjectTargetValidationError";
    this.status = status;
  }
}

function parseRepositoryUrl(value: string, provider: IssueProvider): IssueTarget | undefined {
  try {
    const url = new URL(value.trim());
    const parts = url.pathname.split("/").filter(Boolean);

    if (provider === "github" && url.hostname === "github.com" && parts.length >= 2) {
      return validIssueTarget({
        provider,
        namespace: parts[0],
        project: parts[1],
        webUrl: `https://github.com/${parts[0]}/${parts[1]}`
      });
    }

    if (provider === "gitlab" && url.hostname.includes("gitlab") && parts.length >= 2) {
      const namespace = parts.slice(0, -1).join("/");
      const project = parts.at(-1);

      if (!namespace || !project) {
        return undefined;
      }

      return validIssueTarget({
        provider,
        namespace,
        project,
        externalProjectId: encodeURIComponent(`${namespace}/${project}`),
        webUrl: `${url.origin}/${parts.join("/")}`
      });
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function readStore(): Promise<ProjectTargetStore> {
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

async function updateStore(mutator: (store: ProjectTargetStore) => void): Promise<void> {
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

function sanitizeStore(value: unknown): ProjectTargetStore {
  if (!isRecord(value) || !Array.isArray(value.targets)) {
    return structuredClone(defaultStore);
  }

  return {
    targets: value.targets.flatMap((target) => {
      if (!isRecord(target) || typeof target.projectKey !== "string" || typeof target.updatedAt !== "string") {
        return [];
      }

      const validation = validateIssueTarget(target.issueTarget);
      if (!validation.ok || !changeThisProjects.some((project) => project.publicKey === target.projectKey)) {
        return [];
      }

      return [{
        projectKey: target.projectKey,
        issueTarget: validation.value,
        updatedAt: target.updatedAt
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

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
