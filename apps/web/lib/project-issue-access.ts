import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuthFailure, AuthSession } from "./auth";
import { hasWorkspaceRole } from "./auth";
import type { ChangeThisProject } from "./demo-project";
import type { StoredFeedback } from "./feedback-repository";
import { getInternalApiUrl, getInternalSessionCookieHeader } from "./internal-api";
import { getDataStoreMode } from "./runtime";

export type ProjectIssueAccessRole = "issue_member";

export type ProjectIssueAccess = {
  projectKey: string;
  userId: string;
  email?: string;
  role: ProjectIssueAccessRole;
  status: "active" | "disabled";
  createdAt?: string;
  updatedAt?: string;
};

export type IssueAccessScope =
  | { kind: "global" }
  | { kind: "project"; projectKeys: string[] };

type ProjectIssueAccessStore = {
  accesses: ProjectIssueAccess[];
};

type InternalProjectIssueMemberRow = {
  project_key?: unknown;
  user_id?: unknown;
  email?: unknown;
  role?: unknown;
  status?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

const defaultStore: ProjectIssueAccessStore = {
  accesses: []
};

const localDataDir = process.env.CHANGETHIS_DATA_DIR ?? path.join(process.cwd(), ".changethis-data");
const localDataFile = path.join(localDataDir, "project-issue-members.json");
let lock: Promise<unknown> = Promise.resolve();

export async function getIssueAccessScope(session: AuthSession): Promise<IssueAccessScope> {
  if (hasWorkspaceRole(session, "member")) {
    return { kind: "global" };
  }

  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { kind: "project", projectKeys: [] };
  }

  const accesses = await listProjectIssueAccesses({ workspaceId, userId: session.user.id });
  return {
    kind: "project",
    projectKeys: accesses.filter((access) => access.status === "active").map((access) => access.projectKey)
  };
}

export function filterProjectsForIssueAccess(projects: ChangeThisProject[], scope: IssueAccessScope): ChangeThisProject[] {
  if (scope.kind === "global") {
    return projects;
  }

  const allowed = new Set(scope.projectKeys);
  return projects.filter((project) => allowed.has(project.publicKey));
}

export function filterFeedbacksForIssueAccess(feedbacks: StoredFeedback[], scope: IssueAccessScope): StoredFeedback[] {
  if (scope.kind === "global") {
    return feedbacks;
  }

  const allowed = new Set(scope.projectKeys);
  return feedbacks.filter((feedback) => allowed.has(feedback.projectKey));
}

export function hasFeedbackIssueAccess(scope: IssueAccessScope, feedback: Pick<StoredFeedback, "projectKey">): boolean {
  return scope.kind === "global" || scope.projectKeys.includes(feedback.projectKey);
}

export function issueAccessFailure(): AuthFailure {
  return { error: "Insufficient project issue access", status: 403 };
}

export async function listProjectIssueAccesses(filters: {
  workspaceId: string;
  projectKey?: string;
  userId?: string;
}): Promise<ProjectIssueAccess[]> {
  if (usesInternalProjectIssueAccess()) {
    return listInternalProjectIssueAccesses(filters);
  }

  const store = await readStore();
  return store.accesses
    .filter((access) => !filters.projectKey || access.projectKey === filters.projectKey)
    .filter((access) => !filters.userId || access.userId === filters.userId);
}

export async function replaceProjectIssueAccesses(input: {
  workspaceId: string;
  projectKey: string;
  userIds: string[];
  userEmails?: string[];
}): Promise<ProjectIssueAccess[]> {
  if (usesInternalProjectIssueAccess()) {
    return replaceInternalProjectIssueAccesses(input);
  }

  const now = new Date().toISOString();
  const userIds = [...new Set(input.userIds.filter(Boolean))];
  let nextAccesses: ProjectIssueAccess[] = [];

  await updateStore((store) => {
    store.accesses = [
      ...store.accesses.filter((access) => access.projectKey !== input.projectKey),
      ...userIds.map((userId) => ({
        projectKey: input.projectKey,
        userId,
        role: "issue_member" as const,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }))
    ];
    nextAccesses = store.accesses.filter((access) => access.projectKey === input.projectKey);
  });

  return nextAccesses;
}

function usesInternalProjectIssueAccess(): boolean {
  return getDataStoreMode() === "internal";
}

async function listInternalProjectIssueAccesses(filters: {
  workspaceId: string;
  projectKey?: string;
  userId?: string;
}): Promise<ProjectIssueAccess[]> {
  const cookieHeader = await getInternalSessionCookieHeader();
  if (!cookieHeader) {
    return [];
  }

  const params = new URLSearchParams({
    workspace_id: filters.workspaceId
  });

  if (filters.userId) {
    params.set("user_id", filters.userId);
  }

  if (filters.projectKey) {
    params.set("project_key", filters.projectKey);
  }

  const response = await fetch(`${getInternalApiUrl()}/project-issue-members?${params.toString()}`, {
    headers: {
      Cookie: cookieHeader,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const rows = await response.json() as InternalProjectIssueMemberRow[];
  return rows.flatMap(mapInternalProjectIssueMember);
}

async function replaceInternalProjectIssueAccesses(input: {
  workspaceId: string;
  projectKey: string;
  userIds: string[];
  userEmails?: string[];
}): Promise<ProjectIssueAccess[]> {
  const cookieHeader = await getInternalSessionCookieHeader();
  if (!cookieHeader) {
    return [];
  }

  const response = await fetch(`${getInternalApiUrl()}/project-issue-members`, {
    method: "PUT",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      workspace_id: input.workspaceId,
      project_key: input.projectKey,
      user_ids: [...new Set(input.userIds.filter(Boolean))],
      user_emails: [...new Set((input.userEmails ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean))]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    let message = "Unable to update project issue access";
    try {
      const body = await response.json() as { detail?: unknown; error?: unknown };
      message = typeof body.detail === "string"
        ? body.detail
        : typeof body.error === "string"
          ? body.error
          : message;
    } catch {
      // Keep the generic message when the API does not return JSON.
    }
    throw new Error(message);
  }

  const rows = await response.json() as InternalProjectIssueMemberRow[];
  return rows.flatMap(mapInternalProjectIssueMember);
}

function mapInternalProjectIssueMember(row: InternalProjectIssueMemberRow): ProjectIssueAccess[] {
  if (
    typeof row.project_key !== "string"
    || typeof row.user_id !== "string"
    || row.role !== "issue_member"
    || (row.status !== "active" && row.status !== "disabled")
  ) {
    return [];
  }

  return [{
    projectKey: row.project_key,
    userId: row.user_id,
    email: typeof row.email === "string" ? row.email : undefined,
    role: "issue_member",
    status: row.status,
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined
  }];
}

async function readStore(): Promise<ProjectIssueAccessStore> {
  try {
    const content = await readFile(localDataFile, "utf8");
    const parsed = JSON.parse(content) as Partial<ProjectIssueAccessStore>;
    return {
      accesses: Array.isArray(parsed.accesses) ? parsed.accesses.filter(isProjectIssueAccess) : []
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...defaultStore };
    }

    throw error;
  }
}

async function updateStore(mutator: (store: ProjectIssueAccessStore) => void): Promise<void> {
  lock = lock.then(async () => {
    const store = await readStore();
    mutator(store);
    await mkdir(localDataDir, { recursive: true });
    const tempFile = `${localDataFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(tempFile, localDataFile);
  });
  await lock;
}

function isProjectIssueAccess(value: unknown): value is ProjectIssueAccess {
  if (!value || typeof value !== "object") {
    return false;
  }

  const access = value as Partial<ProjectIssueAccess>;
  return typeof access.projectKey === "string"
    && typeof access.userId === "string"
    && access.role === "issue_member"
    && (access.status === "active" || access.status === "disabled");
}
