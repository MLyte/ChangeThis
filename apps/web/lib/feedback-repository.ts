import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildIssueDraft, validateFeedbackPayload, validateIssueTarget } from "@changethis/shared";
import type {
  ExternalIssueRef,
  FeedbackPayload,
  FeedbackType,
  FeedbackStatus,
  IssueDraft,
  IssueProvider,
  IssueTarget
} from "@changethis/shared";
import { getDataStoreMode } from "./runtime";
import { isSupabaseServiceConfigured, supabaseServiceRest } from "./supabase-server";

export type StoredFeedback = {
  id: string;
  projectKey: string;
  workspaceId?: string;
  projectName: string;
  issueTarget: IssueTarget;
  payload: FeedbackPayload;
  issueDraft: IssueDraft;
  status: FeedbackStatus;
  screenshotAsset?: StoredAsset;
  externalIssue?: ExternalIssueRef;
  lastError?: string;
  retryCount: number;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredAsset = {
  id: string;
  feedbackId: string;
  mimeType: string;
  bytes: number;
  dataUrl: string;
  createdAt: string;
};

export type FeedbackEvent = {
  id: string;
  feedbackId: string;
  fromStatus?: FeedbackStatus;
  toStatus: FeedbackStatus;
  reason?: string;
  provider?: IssueProvider;
  externalUrl?: string;
  createdAt: string;
};

type DataStore = {
  feedbacks: StoredFeedback[];
  events: FeedbackEvent[];
};

type SupabaseProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  public_key: string;
};

type SupabaseProjectPublicKeyRow = {
  project_id: string;
  public_key: string;
};

type SupabaseIssueTargetRow = {
  id: string;
  project_id: string;
  integration_id?: string | null;
  provider: IssueProvider;
  namespace: string;
  project_name: string;
  external_project_id?: string | null;
  web_url?: string | null;
};

type SupabaseFeedbackRow = {
  id: string;
  project_id: string;
  issue_target_id: string;
  status: string;
  type: string;
  message: string;
  page_url: string;
  page_title?: string | null;
  browser?: string | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
  device_pixel_ratio?: number | string | null;
  pin_x?: number | null;
  pin_y?: number | null;
  element_selector?: string | null;
  element_text?: string | null;
  screenshot_path?: string | null;
  payload?: unknown;
  issue_draft_title?: string | null;
  issue_draft_description?: string | null;
  issue_draft_labels?: string[] | null;
  screenshot_data_url?: string | null;
  screenshot_mime_type?: string | null;
  screenshot_bytes?: number | null;
  created_at: string;
  updated_at?: string | null;
};

type SupabaseFeedbackEventRow = {
  id: string;
  feedback_id: string;
  from_status?: string | null;
  to_status: string;
  reason?: string | null;
  provider?: string | null;
  external_url?: string | null;
  created_at: string;
};

type SupabaseProviderIssueAttemptRow = {
  feedback_id: string;
  idempotency_key: string;
  status: string;
  retry_count: number;
  next_retry_at?: string | null;
  last_error?: string | null;
  raw_payload?: unknown;
  updated_at: string;
  created_at: string;
};

type SupabaseExternalIssueRow = {
  feedback_id: string;
  provider: IssueProvider;
  external_id?: string | null;
  external_iid?: number | null;
  external_number?: number | null;
  url: string;
  state?: string | null;
  updated_at: string;
};

export type CreateFeedbackInput = {
  projectKey: string;
  projectName: string;
  issueTarget: IssueTarget;
  payload: FeedbackPayload;
  issueDraft: IssueDraft;
  screenshotDataUrl?: string;
  workspaceId?: string;
};

export type IssueAttemptResult =
  | { ok: true; externalIssue: ExternalIssueRef }
  | { ok: false; error: string; retryable: boolean; nextRetryAt?: string };

export type FeedbackRepository = {
  create(input: CreateFeedbackInput): Promise<StoredFeedback>;
  list(filters?: { projectKey?: string; status?: FeedbackStatus; workspaceId?: string }): Promise<StoredFeedback[]>;
  get(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback | undefined>;
  updateIssueDraft(id: string, issueDraft: IssueDraft, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  markIssueCreationPending(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  recordIssueAttempt(id: string, result: IssueAttemptResult, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  recordExternalIssueState(id: string, externalIssue: ExternalIssueRef, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  markKept(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  markResolved(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  markIgnored(id: string, filters?: { workspaceId?: string }): Promise<StoredFeedback>;
  dueForRetry(filters?: Date | { workspaceId?: string; now?: Date }): Promise<StoredFeedback[]>;
  events(feedbackId: string, filters?: { workspaceId?: string }): Promise<FeedbackEvent[]>;
  clearWorkspace(workspaceId: string): Promise<{ feedbacks: number; events: number }>;
};

const defaultStore: DataStore = {
  feedbacks: [],
  events: []
};

const localDataDir = process.env.CHANGETHIS_DATA_DIR ?? path.join(process.cwd(), ".changethis-data");
const localDataFile = path.join(localDataDir, "feedback-store.json");

let repository: FeedbackRepository | undefined;
let fileLock: Promise<unknown> = Promise.resolve();

export function getFeedbackRepository(): FeedbackRepository {
  repository ??= getDataStoreMode() === "supabase"
    ? new SupabaseFeedbackRepository()
    : new FileFeedbackRepository(localDataFile);
  return repository;
}

export class FileFeedbackRepository implements FeedbackRepository {
  constructor(private readonly filePath: string) {}

  async create(input: CreateFeedbackInput): Promise<StoredFeedback> {
    const issueTargetValidation = validateIssueTarget(input.issueTarget);

    if (!issueTargetValidation.ok) {
      throw new Error(`Cannot store feedback without a valid issue target: ${issueTargetValidation.error}`);
    }

    return this.update((store) => {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const screenshotAsset = input.screenshotDataUrl
        ? createScreenshotAsset(id, input.screenshotDataUrl, now)
        : undefined;
      const feedback: StoredFeedback = {
        id,
        projectKey: input.projectKey,
        workspaceId: input.workspaceId,
        projectName: input.projectName,
        issueTarget: issueTargetValidation.value,
        payload: {
          ...input.payload,
          screenshotDataUrl: undefined
        },
        issueDraft: input.issueDraft,
        status: "raw",
        screenshotAsset,
        retryCount: 0,
        createdAt: now,
        updatedAt: now
      };

      store.feedbacks.unshift(feedback);
      store.events.unshift(createEvent(id, undefined, "raw", "feedback_received", undefined, undefined, now));
      return feedback;
    });
  }

  async list(filters: { projectKey?: string; status?: FeedbackStatus; workspaceId?: string } = {}): Promise<StoredFeedback[]> {
    const store = await this.read();
    return store.feedbacks
      .filter((feedback) => {
        if (!filters.workspaceId) {
          return true;
        }

        return feedback.workspaceId === filters.workspaceId;
      })
      .filter((feedback) => !filters.projectKey || feedback.projectKey === filters.projectKey)
      .filter((feedback) => !filters.status || feedback.status === filters.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback | undefined> {
    const store = await this.read();
    return store.feedbacks.find((feedback) => feedback.id === id && belongsToWorkspace(feedback, filters.workspaceId));
  }

  async updateIssueDraft(id: string, issueDraft: IssueDraft, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      feedback.issueDraft = {
        title: issueDraft.title,
        description: issueDraft.description,
        labels: [...issueDraft.labels]
      };
      feedback.updatedAt = new Date().toISOString();
      return feedback;
    });
  }

  async markIssueCreationPending(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "issue_creation_pending";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "issue_creation_pending", "provider_issue_creation_started", feedback.issueTarget.provider, undefined, now));
      return feedback;
    });
  }

  async recordIssueAttempt(id: string, result: IssueAttemptResult, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      if (result.ok) {
        feedback.status = "sent_to_provider";
        feedback.externalIssue = result.externalIssue;
        feedback.lastError = undefined;
        feedback.nextRetryAt = undefined;
        feedback.updatedAt = now;
        store.events.unshift(
          createEvent(id, fromStatus, "sent_to_provider", "provider_issue_created", result.externalIssue.provider, result.externalIssue.url, now)
        );
        return feedback;
      }

      feedback.retryCount += 1;
      feedback.status = result.retryable ? "retrying" : "failed";
      feedback.lastError = result.error;
      feedback.nextRetryAt = result.nextRetryAt;
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, feedback.status, result.error, feedback.issueTarget.provider, undefined, now));
      return feedback;
    });
  }

  async recordExternalIssueState(id: string, externalIssue: ExternalIssueRef, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.externalIssue = externalIssue;
      feedback.status = externalIssue.state === "closed" ? "resolved" : "sent_to_provider";
      feedback.updatedAt = now;
      store.events.unshift(
        createEvent(id, fromStatus, feedback.status, "provider_issue_state_synced", externalIssue.provider, externalIssue.url, now)
      );
      return feedback;
    });
  }

  async markKept(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "kept";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "kept", "kept_without_issue", undefined, undefined, now));
      return feedback;
    });
  }

  async markResolved(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "resolved";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "resolved", "provider_issue_closed", feedback.issueTarget.provider, feedback.externalIssue?.url, now));
      return feedback;
    });
  }

  async markIgnored(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.update((store) => {
      const feedback = findFeedback(store, id, filters.workspaceId);
      const now = new Date().toISOString();
      const fromStatus = feedback.status;

      feedback.status = "ignored";
      feedback.updatedAt = now;
      store.events.unshift(createEvent(id, fromStatus, "ignored", "ignored_from_inbox", undefined, undefined, now));
      return feedback;
    });
  }

  async dueForRetry(filters: Date | { workspaceId?: string; now?: Date } = {}): Promise<StoredFeedback[]> {
    const store = await this.read();
    const normalizedFilters = filters instanceof Date ? { now: filters } : filters;
    const now = normalizedFilters.now ?? new Date();
    return store.feedbacks.filter((feedback) => {
      return belongsToWorkspace(feedback, normalizedFilters.workspaceId)
        && feedback.status === "retrying"
        && feedback.nextRetryAt !== undefined
        && Date.parse(feedback.nextRetryAt) <= now.getTime();
    });
  }

  async events(feedbackId: string, filters: { workspaceId?: string } = {}): Promise<FeedbackEvent[]> {
    const store = await this.read();
    const feedback = store.feedbacks.find((item) => item.id === feedbackId && belongsToWorkspace(item, filters.workspaceId));
    if (!feedback) {
      return [];
    }

    return store.events.filter((event) => event.feedbackId === feedbackId);
  }

  async clearWorkspace(workspaceId: string): Promise<{ feedbacks: number; events: number }> {
    return this.update((store) => {
      const feedbackIds = new Set(store.feedbacks.filter((feedback) => feedback.workspaceId === workspaceId).map((feedback) => feedback.id));
      const feedbacks = feedbackIds.size;
      const events = store.events.filter((event) => feedbackIds.has(event.feedbackId)).length;

      store.feedbacks = store.feedbacks.filter((feedback) => feedback.workspaceId !== workspaceId);
      store.events = store.events.filter((event) => !feedbackIds.has(event.feedbackId));

      return { feedbacks, events };
    });
  }

  private async read(): Promise<DataStore> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as DataStore;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return structuredClone(defaultStore);
      }

      throw error;
    }
  }

  private async update<T>(mutate: (store: DataStore) => T): Promise<T> {
    const next = fileLock.then(async () => {
      const store = await this.read();
      const result = mutate(store);
      await writeStore(this.filePath, store);
      return result;
    });

    fileLock = next.catch(() => undefined);
    return next;
  }
}

export class SupabaseFeedbackRepository implements FeedbackRepository {
  async create(input: CreateFeedbackInput): Promise<StoredFeedback> {
    ensureSupabaseFeedbackRepositoryConfigured();

    const issueTargetValidation = validateIssueTarget(input.issueTarget);
    if (!issueTargetValidation.ok) {
      throw new Error(`Cannot store feedback without a valid issue target: ${issueTargetValidation.error}`);
    }

    const project = await findSupabaseProjectForKey(input.projectKey, input.workspaceId);
    if (!project) {
      throw new Error(`Project ${input.projectKey} was not found`);
    }

    const issueTarget = await findSupabaseIssueTarget(project.id);
    if (!issueTarget) {
      throw new Error(`Project ${input.projectKey} does not have an issue target`);
    }

    const feedbackRows = await supabaseServiceRest<SupabaseFeedbackRow[]>("/rest/v1/feedbacks", {
      method: "POST",
      headers: {
        Prefer: "return=representation"
      },
      body: JSON.stringify(toSupabaseFeedbackInsert(input, project.id, issueTarget.id))
    });
    const feedbackRow = feedbackRows[0];

    if (!feedbackRow) {
      throw new Error("Supabase did not return the created feedback");
    }

    await insertSupabaseFeedbackEvent(feedbackRow.id, undefined, "raw", "feedback_received");

    const screenshotAsset = input.screenshotDataUrl
      ? createScreenshotAsset(feedbackRow.id, input.screenshotDataUrl, feedbackRow.created_at)
      : undefined;
    const feedback = mapSupabaseFeedback(
      feedbackRow,
      project,
      issueTarget,
      undefined,
      undefined,
      undefined,
      undefined
    );

    return {
      ...feedback,
      projectName: input.projectName || feedback.projectName,
      issueDraft: input.issueDraft,
      screenshotAsset
    };
  }

  async list(filters: { projectKey?: string; status?: FeedbackStatus; workspaceId?: string } = {}): Promise<StoredFeedback[]> {
    ensureSupabaseFeedbackRepositoryConfigured();

    if (filters.workspaceId && !isUuid(filters.workspaceId)) {
      return [];
    }

    const params = new URLSearchParams({
      select: supabaseFeedbackSelect(),
      order: "created_at.desc"
    });

    if (filters.status) {
      params.set("status", `eq.${filters.status}`);
    }

    let projects: SupabaseProjectRow[];
    if (filters.projectKey) {
      const project = await findSupabaseProjectForKey(filters.projectKey, filters.workspaceId);
      if (!project) {
        return [];
      }

      projects = [project];
      params.set("project_id", `eq.${project.id}`);
    } else {
      projects = await listSupabaseProjects(filters.workspaceId);
      if (projects.length === 0) {
        return [];
      }

      params.set("project_id", inFilter(projects.map((project) => project.id)));
    }

    const rows = await supabaseServiceRest<SupabaseFeedbackRow[]>(`/rest/v1/feedbacks?${params.toString()}`);
    return hydrateSupabaseFeedbacks(rows, projects);
  }

  async get(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback | undefined> {
    const feedbacks = await this.getManyById([id], filters);
    return feedbacks[0];
  }

  async updateIssueDraft(id: string, issueDraft: IssueDraft, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    const feedback = await this.requireFeedback(id, filters);
    const draft = cloneIssueDraft(issueDraft);
    const now = new Date().toISOString();

    await supabaseServiceRest(`/rest/v1/feedbacks?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        issue_draft_title: draft.title,
        issue_draft_description: draft.description,
        issue_draft_labels: draft.labels
      })
    });

    return {
      ...feedback,
      issueDraft: draft,
      updatedAt: now
    };
  }

  async markIssueCreationPending(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.updateStatus(id, "issue_creation_pending", "provider_issue_creation_started", filters);
  }

  async recordIssueAttempt(id: string, result: IssueAttemptResult, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    const feedback = await this.requireFeedback(id, filters);
    const now = new Date().toISOString();

    if (result.ok) {
      await upsertSupabaseExternalIssue(feedback, result.externalIssue);
      await insertSupabaseProviderAttempt(feedback, {
        status: "succeeded",
        retryCount: feedback.retryCount,
        rawPayload: { externalIssue: result.externalIssue },
        now
      });
      return this.updateStatus(id, "sent_to_provider", "provider_issue_created", filters, {
        provider: result.externalIssue.provider,
        externalUrl: result.externalIssue.url,
        externalIssue: result.externalIssue,
        lastError: null,
        nextRetryAt: null,
        retryCount: feedback.retryCount,
        now
      });
    }

    const retryCount = feedback.retryCount + 1;
    const status = result.retryable ? "retrying" : "failed";
    await insertSupabaseProviderAttempt(feedback, {
      status,
      retryCount,
      lastError: result.error,
      nextRetryAt: result.nextRetryAt,
      now
    });
    return this.updateStatus(id, status, result.error, filters, {
      provider: feedback.issueTarget.provider,
      lastError: result.error,
      nextRetryAt: result.nextRetryAt,
      retryCount,
      now
    });
  }

  async recordExternalIssueState(id: string, externalIssue: ExternalIssueRef, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    const feedback = await this.requireFeedback(id, filters);
    const status = externalIssue.state === "closed" ? "resolved" : "sent_to_provider";

    await upsertSupabaseExternalIssue(feedback, externalIssue);
    return this.updateStatus(id, status, "provider_issue_state_synced", filters, {
      provider: externalIssue.provider,
      externalUrl: externalIssue.url,
      externalIssue,
      now: new Date().toISOString()
    });
  }

  async markKept(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.updateStatus(id, "kept", "kept_without_issue", filters);
  }

  async markResolved(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    const feedback = await this.requireFeedback(id, filters);
    return this.updateStatus(id, "resolved", "provider_issue_closed", filters, {
      provider: feedback.issueTarget.provider,
      externalUrl: feedback.externalIssue?.url
    });
  }

  async markIgnored(id: string, filters: { workspaceId?: string } = {}): Promise<StoredFeedback> {
    return this.updateStatus(id, "ignored", "ignored_from_inbox", filters);
  }

  async dueForRetry(filters: Date | { workspaceId?: string; now?: Date } = {}): Promise<StoredFeedback[]> {
    const normalizedFilters = filters instanceof Date ? { now: filters } : filters;
    const now = (normalizedFilters.now ?? new Date()).toISOString();
    const feedbacks = await this.list({ status: "retrying", workspaceId: normalizedFilters.workspaceId });

    return feedbacks.filter((feedback) => feedback.nextRetryAt !== undefined && feedback.nextRetryAt <= now);
  }

  async events(feedbackId: string, filters: { workspaceId?: string } = {}): Promise<FeedbackEvent[]> {
    const feedback = await this.get(feedbackId, filters);
    if (!feedback) {
      return [];
    }

    const params = new URLSearchParams({
      feedback_id: `eq.${feedbackId}`,
      select: supabaseFeedbackEventSelect(),
      order: "created_at.desc"
    });
    const rows = await supabaseServiceRest<SupabaseFeedbackEventRow[]>(`/rest/v1/feedback_status_events?${params.toString()}`);
    return rows.flatMap(mapSupabaseFeedbackEvent);
  }

  async clearWorkspace(workspaceId: string): Promise<{ feedbacks: number; events: number }> {
    ensureSupabaseFeedbackRepositoryConfigured();

    if (!isUuid(workspaceId)) {
      return { feedbacks: 0, events: 0 };
    }

    const projects = await listSupabaseProjects(workspaceId);
    if (projects.length === 0) {
      return { feedbacks: 0, events: 0 };
    }

    const feedbackRows = await supabaseServiceRest<Array<Pick<SupabaseFeedbackRow, "id">>>(
      `/rest/v1/feedbacks?project_id=${encodeURIComponent(inFilter(projects.map((project) => project.id)))}&select=id`
    );
    const feedbackIds = feedbackRows.map((feedback) => feedback.id).filter(isUuid);

    if (feedbackIds.length === 0) {
      return { feedbacks: 0, events: 0 };
    }

    const eventRows = await supabaseServiceRest<Array<Pick<SupabaseFeedbackEventRow, "id">>>(
      `/rest/v1/feedback_status_events?feedback_id=${encodeURIComponent(inFilter(feedbackIds))}&select=id`
    );

    await supabaseServiceRest(`/rest/v1/feedbacks?id=${encodeURIComponent(inFilter(feedbackIds))}`, {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal"
      }
    });

    return {
      feedbacks: feedbackIds.length,
      events: eventRows.length
    };
  }

  private async requireFeedback(id: string, filters: { workspaceId?: string }): Promise<StoredFeedback> {
    const feedback = await this.get(id, filters);
    if (!feedback) {
      throw new Error(`Feedback ${id} was not found`);
    }

    return feedback;
  }

  private async getManyById(ids: string[], filters: { workspaceId?: string }): Promise<StoredFeedback[]> {
    ensureSupabaseFeedbackRepositoryConfigured();

    const validIds = ids.filter(isUuid);
    if (validIds.length === 0 || (filters.workspaceId && !isUuid(filters.workspaceId))) {
      return [];
    }

    const params = new URLSearchParams({
      id: inFilter(validIds),
      select: supabaseFeedbackSelect()
    });
    const rows = await supabaseServiceRest<SupabaseFeedbackRow[]>(`/rest/v1/feedbacks?${params.toString()}`);
    const projectIds = unique(rows.map((row) => row.project_id).filter(isUuid));
    const projects = await listSupabaseProjectsByIds(projectIds, filters.workspaceId);
    return hydrateSupabaseFeedbacks(rows, projects);
  }

  private async updateStatus(
    id: string,
    status: FeedbackStatus,
    reason: string,
    filters: { workspaceId?: string },
    options: {
      provider?: IssueProvider;
      externalUrl?: string;
      externalIssue?: ExternalIssueRef;
      lastError?: string | null;
      nextRetryAt?: string | null;
      retryCount?: number;
      now?: string;
    } = {}
  ): Promise<StoredFeedback> {
    const feedback = await this.requireFeedback(id, filters);
    const now = options.now ?? new Date().toISOString();

    await supabaseServiceRest(`/rest/v1/feedbacks?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ status })
    });
    await insertSupabaseFeedbackEvent(id, feedback.status, status, reason, options.provider, options.externalUrl, now);

    return {
      ...feedback,
      status,
      externalIssue: options.externalIssue ?? feedback.externalIssue,
      lastError: Object.hasOwn(options, "lastError")
        ? options.lastError ?? undefined
        : feedback.lastError,
      retryCount: options.retryCount ?? feedback.retryCount,
      nextRetryAt: Object.hasOwn(options, "nextRetryAt")
        ? options.nextRetryAt ?? undefined
        : feedback.nextRetryAt,
      updatedAt: now
    };
  }
}

function ensureSupabaseFeedbackRepositoryConfigured(): void {
  if (!isSupabaseServiceConfigured()) {
    throw new Error("DATA_STORE=supabase requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
}

async function findSupabaseProjectForKey(projectKey: string, workspaceId?: string): Promise<SupabaseProjectRow | undefined> {
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
  return projectRows[0];
}

async function listSupabaseProjects(workspaceId?: string): Promise<SupabaseProjectRow[]> {
  if (workspaceId && !isUuid(workspaceId)) {
    return [];
  }

  const params = new URLSearchParams({
    select: supabaseProjectSelect()
  });

  if (workspaceId) {
    params.set("organization_id", `eq.${workspaceId}`);
  }

  return supabaseServiceRest<SupabaseProjectRow[]>(`/rest/v1/projects?${params.toString()}`);
}

async function listSupabaseProjectsByIds(ids: string[], workspaceId?: string): Promise<SupabaseProjectRow[]> {
  const validIds = ids.filter(isUuid);
  if (validIds.length === 0 || (workspaceId && !isUuid(workspaceId))) {
    return [];
  }

  const params = new URLSearchParams({
    id: inFilter(validIds),
    select: supabaseProjectSelect()
  });

  if (workspaceId) {
    params.set("organization_id", `eq.${workspaceId}`);
  }

  return supabaseServiceRest<SupabaseProjectRow[]>(`/rest/v1/projects?${params.toString()}`);
}

async function findSupabaseIssueTarget(projectId: string): Promise<SupabaseIssueTargetRow | undefined> {
  const issueTargets = await listSupabaseIssueTargets([projectId]);
  return issueTargets[0];
}

async function listSupabaseIssueTargets(projectIds: string[]): Promise<SupabaseIssueTargetRow[]> {
  const validIds = projectIds.filter(isUuid);
  if (validIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    project_id: inFilter(validIds),
    select: supabaseIssueTargetSelect(),
    order: "created_at.desc"
  });

  return supabaseServiceRest<SupabaseIssueTargetRow[]>(`/rest/v1/issue_targets?${params.toString()}`);
}

async function hydrateSupabaseFeedbacks(rows: SupabaseFeedbackRow[], projectRows: SupabaseProjectRow[]): Promise<StoredFeedback[]> {
  const projectsById = new Map(projectRows.map((project) => [project.id, project]));
  const feedbackRows = rows.filter((row) => projectsById.has(row.project_id));
  const feedbackIds = feedbackRows.map((row) => row.id).filter(isUuid);
  const issueTargetIds = unique(feedbackRows.map((row) => row.issue_target_id).filter(isUuid));

  if (feedbackRows.length === 0) {
    return [];
  }

  const [issueTargets, attempts, externalIssues, latestEvents] = await Promise.all([
    listSupabaseIssueTargetsByIds(issueTargetIds),
    listSupabaseProviderAttempts(feedbackIds),
    listSupabaseExternalIssues(feedbackIds),
    listSupabaseFeedbackEvents(feedbackIds)
  ]);
  const issueTargetsById = new Map(issueTargets.map((issueTarget) => [issueTarget.id, issueTarget]));
  const attemptsByFeedbackId = groupLatestByFeedbackId(attempts.filter((attempt) => !attempt.idempotency_key.endsWith(":draft")));
  const draftAttemptsByFeedbackId = groupLatestByFeedbackId(attempts.filter((attempt) => attempt.idempotency_key.endsWith(":draft")));
  const externalIssuesByFeedbackId = new Map(externalIssues.map((externalIssue) => [externalIssue.feedback_id, externalIssue]));
  const eventsByFeedbackId = groupLatestByFeedbackId(latestEvents);

  return feedbackRows.flatMap((row) => {
    const project = projectsById.get(row.project_id);
    const issueTarget = issueTargetsById.get(row.issue_target_id);
    const feedback = mapSupabaseFeedback(
      row,
      project,
      issueTarget,
      attemptsByFeedbackId.get(row.id),
      draftAttemptsByFeedbackId.get(row.id),
      externalIssuesByFeedbackId.get(row.id),
      eventsByFeedbackId.get(row.id)
    );

    return feedback ? [feedback] : [];
  });
}

async function listSupabaseIssueTargetsByIds(ids: string[]): Promise<SupabaseIssueTargetRow[]> {
  const validIds = ids.filter(isUuid);
  if (validIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    id: inFilter(validIds),
    select: supabaseIssueTargetSelect()
  });

  return supabaseServiceRest<SupabaseIssueTargetRow[]>(`/rest/v1/issue_targets?${params.toString()}`);
}

async function listSupabaseProviderAttempts(feedbackIds: string[]): Promise<SupabaseProviderIssueAttemptRow[]> {
  const validIds = feedbackIds.filter(isUuid);
  if (validIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    feedback_id: inFilter(validIds),
    select: "feedback_id,idempotency_key,status,retry_count,next_retry_at,last_error,raw_payload,updated_at,created_at",
    order: "updated_at.desc"
  });

  return supabaseServiceRest<SupabaseProviderIssueAttemptRow[]>(`/rest/v1/provider_issue_attempts?${params.toString()}`);
}

async function listSupabaseExternalIssues(feedbackIds: string[]): Promise<SupabaseExternalIssueRow[]> {
  const validIds = feedbackIds.filter(isUuid);
  if (validIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    feedback_id: inFilter(validIds),
    select: "feedback_id,provider,external_id,external_iid,external_number,url,state,updated_at"
  });

  return supabaseServiceRest<SupabaseExternalIssueRow[]>(`/rest/v1/external_issues?${params.toString()}`);
}

async function listSupabaseFeedbackEvents(feedbackIds: string[]): Promise<SupabaseFeedbackEventRow[]> {
  const validIds = feedbackIds.filter(isUuid);
  if (validIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    feedback_id: inFilter(validIds),
    select: supabaseFeedbackEventSelect(),
    order: "created_at.desc"
  });

  return supabaseServiceRest<SupabaseFeedbackEventRow[]>(`/rest/v1/feedback_status_events?${params.toString()}`);
}

function mapSupabaseFeedback(
  row: SupabaseFeedbackRow | undefined,
  project: SupabaseProjectRow | undefined,
  issueTargetRow: SupabaseIssueTargetRow | undefined,
  attempt: SupabaseProviderIssueAttemptRow | undefined,
  draftAttempt: SupabaseProviderIssueAttemptRow | undefined,
  externalIssueRow: SupabaseExternalIssueRow | undefined,
  latestEvent: SupabaseFeedbackEventRow | undefined
): StoredFeedback {
  if (!row || !project || !issueTargetRow) {
    throw new Error("Supabase returned an invalid feedback row");
  }

  const issueTarget = mapSupabaseIssueTarget(issueTargetRow);
  if (!issueTarget) {
    throw new Error("Supabase returned an invalid issue target row");
  }

  const payload = mapSupabaseStoredPayload(row.payload, project.public_key) ?? mapSupabaseFeedbackPayload(row, project.public_key);
  const issueDraft = mapSupabaseIssueDraft(row) ?? getIssueDraftFromAttempt(draftAttempt) ?? buildIssueDraft(payload);
  const externalIssue = mapSupabaseExternalIssue(externalIssueRow);
  const screenshotAsset = mapSupabaseScreenshotAsset(row);
  const updatedAt = maxIsoDate([
    row.created_at,
    row.updated_at ?? undefined,
    latestEvent?.created_at,
    attempt?.updated_at,
    externalIssueRow?.updated_at
  ]);

  return {
    id: row.id,
    projectKey: project.public_key,
    workspaceId: project.organization_id,
    projectName: project.name,
    issueTarget,
    payload,
    issueDraft,
    status: parseFeedbackStatus(row.status),
    screenshotAsset,
    externalIssue,
    lastError: attempt?.last_error ?? undefined,
    retryCount: attempt?.retry_count ?? 0,
    nextRetryAt: attempt?.next_retry_at ?? undefined,
    createdAt: row.created_at,
    updatedAt
  };
}

function toSupabaseFeedbackInsert(input: CreateFeedbackInput, projectId: string, issueTargetId: string): Record<string, unknown> {
  const pin = input.payload.pin ?? input.payload.pins?.[0];
  const screenshotMimeType = input.screenshotDataUrl ? parseDataUrlMimeType(input.screenshotDataUrl) : undefined;
  const screenshotBytes = input.screenshotDataUrl ? estimateDataUrlBytes(input.screenshotDataUrl) : undefined;

  return {
    project_id: projectId,
    issue_target_id: issueTargetId,
    status: "raw",
    payload: sanitizeFeedbackPayload(input.payload),
    issue_draft_title: input.issueDraft.title,
    issue_draft_description: input.issueDraft.description,
    issue_draft_labels: input.issueDraft.labels,
    type: input.payload.type,
    message: input.payload.message,
    page_url: input.payload.metadata.url,
    page_title: input.payload.metadata.title,
    browser: input.payload.metadata.userAgent,
    viewport_width: input.payload.metadata.viewport.width,
    viewport_height: input.payload.metadata.viewport.height,
    device_pixel_ratio: input.payload.metadata.devicePixelRatio,
    pin_x: pin?.x,
    pin_y: pin?.y,
    element_selector: pin?.selector,
    element_text: pin?.text,
    screenshot_data_url: input.screenshotDataUrl,
    screenshot_mime_type: screenshotMimeType,
    screenshot_bytes: screenshotBytes
  };
}

function sanitizeFeedbackPayload(payload: FeedbackPayload): FeedbackPayload {
  return {
    ...payload,
    screenshotDataUrl: undefined
  };
}

function mapSupabaseStoredPayload(value: unknown, projectKey: string): FeedbackPayload | undefined {
  const validation = validateFeedbackPayload(value);
  if (!validation.ok) {
    return undefined;
  }

  return {
    ...validation.value,
    projectKey,
    screenshotDataUrl: undefined
  };
}

function mapSupabaseFeedbackPayload(row: SupabaseFeedbackRow, projectKey: string): FeedbackPayload {
  const url = parseUrl(row.page_url);
  const viewport = {
    width: typeof row.viewport_width === "number" && row.viewport_width > 0 ? row.viewport_width : 1,
    height: typeof row.viewport_height === "number" && row.viewport_height > 0 ? row.viewport_height : 1
  };
  const pin = typeof row.pin_x === "number" && typeof row.pin_y === "number"
    ? {
        x: row.pin_x,
        y: row.pin_y,
        selector: row.element_selector ?? undefined,
        text: row.element_text ?? undefined
      }
    : undefined;

  return {
    projectKey,
    type: parseFeedbackType(row.type),
    message: row.message,
    metadata: {
      url: row.page_url,
      origin: url?.origin,
      path: `${url?.pathname ?? "/"}${url?.search ?? ""}`,
      title: row.page_title ?? "",
      userAgent: row.browser ?? "unknown",
      viewport,
      devicePixelRatio: parsePositiveNumber(row.device_pixel_ratio) ?? 1,
      language: "und",
      createdAt: row.created_at
    },
    pin,
    pins: pin ? [pin] : undefined,
    screenshotDataUrl: undefined
  };
}

function mapSupabaseIssueTarget(row: SupabaseIssueTargetRow | undefined): IssueTarget | undefined {
  if (!row) {
    return undefined;
  }

  const validation = validateIssueTarget({
    provider: row.provider,
    namespace: row.namespace,
    project: row.project_name,
    externalProjectId: row.external_project_id ?? undefined,
    integrationId: row.integration_id ?? undefined,
    webUrl: row.web_url ?? undefined
  });

  return validation.ok ? validation.value : undefined;
}

function mapSupabaseExternalIssue(row: SupabaseExternalIssueRow | undefined): ExternalIssueRef | undefined {
  if (!row) {
    return undefined;
  }

  return {
    provider: row.provider,
    id: row.external_id ?? undefined,
    iid: row.external_iid ?? undefined,
    number: row.external_number ?? undefined,
    url: row.url,
    state: row.state === "closed" ? "closed" : "open"
  };
}

function mapSupabaseIssueDraft(row: SupabaseFeedbackRow): IssueDraft | undefined {
  if (
    typeof row.issue_draft_title !== "string"
    || typeof row.issue_draft_description !== "string"
    || !Array.isArray(row.issue_draft_labels)
    || !row.issue_draft_labels.every((label) => typeof label === "string")
  ) {
    return undefined;
  }

  return {
    title: row.issue_draft_title,
    description: row.issue_draft_description,
    labels: [...row.issue_draft_labels]
  };
}

function mapSupabaseScreenshotAsset(row: SupabaseFeedbackRow): StoredAsset | undefined {
  if (typeof row.screenshot_data_url !== "string" || row.screenshot_data_url.length === 0) {
    return undefined;
  }

  return {
    id: `screenshot_${row.id}`,
    feedbackId: row.id,
    mimeType: row.screenshot_mime_type ?? parseDataUrlMimeType(row.screenshot_data_url),
    bytes: row.screenshot_bytes ?? estimateDataUrlBytes(row.screenshot_data_url),
    dataUrl: row.screenshot_data_url,
    createdAt: row.created_at
  };
}

function mapSupabaseFeedbackEvent(row: SupabaseFeedbackEventRow): FeedbackEvent[] {
  const toStatus = parseFeedbackStatus(row.to_status);
  const fromStatus = row.from_status ? parseFeedbackStatus(row.from_status) : undefined;
  const provider = parseIssueProvider(row.provider);

  return [{
    id: row.id,
    feedbackId: row.feedback_id,
    fromStatus,
    toStatus,
    reason: row.reason ?? undefined,
    provider,
    externalUrl: row.external_url ?? undefined,
    createdAt: row.created_at
  }];
}

async function insertSupabaseFeedbackEvent(
  feedbackId: string,
  fromStatus: FeedbackStatus | undefined,
  toStatus: FeedbackStatus,
  reason: string,
  provider?: IssueProvider,
  externalUrl?: string,
  now?: string
): Promise<void> {
  await supabaseServiceRest("/rest/v1/feedback_status_events", {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      feedback_id: feedbackId,
      from_status: fromStatus,
      to_status: toStatus,
      reason,
      provider,
      external_url: externalUrl,
      created_at: now
    })
  });
}

async function insertSupabaseProviderAttempt(
  feedback: StoredFeedback,
  input: {
    status: "retrying" | "succeeded" | "failed";
    retryCount: number;
    lastError?: string;
    nextRetryAt?: string;
    rawPayload?: unknown;
    now: string;
  }
): Promise<void> {
  await supabaseServiceRest("/rest/v1/provider_issue_attempts", {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      feedback_id: feedback.id,
      provider: feedback.issueTarget.provider,
      idempotency_key: `changethis:${feedback.id}:${crypto.randomUUID()}`,
      status: input.status,
      retry_count: input.retryCount,
      next_retry_at: input.nextRetryAt,
      last_error: input.lastError,
      raw_payload: input.rawPayload,
      updated_at: input.now
    })
  });
}

async function upsertSupabaseExternalIssue(feedback: StoredFeedback, externalIssue: ExternalIssueRef): Promise<void> {
  await supabaseServiceRest("/rest/v1/external_issues?on_conflict=feedback_id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      feedback_id: feedback.id,
      issue_target_id: undefined,
      provider: externalIssue.provider,
      external_id: externalIssue.id,
      external_iid: externalIssue.iid,
      external_number: externalIssue.number,
      url: externalIssue.url,
      state: externalIssue.state ?? "open",
      updated_at: new Date().toISOString()
    })
  });
}

function getIssueDraftFromAttempt(attempt: SupabaseProviderIssueAttemptRow | undefined): IssueDraft | undefined {
  const rawPayload = attempt?.raw_payload;
  if (!isRecord(rawPayload)) {
    return undefined;
  }

  const value = rawPayload.issueDraft;
  if (
    !isRecord(value)
    || typeof value.title !== "string"
    || typeof value.description !== "string"
    || !Array.isArray(value.labels)
    || !value.labels.every((label: unknown) => typeof label === "string")
  ) {
    return undefined;
  }

  return {
    title: value.title,
    description: value.description,
    labels: [...value.labels]
  };
}

function supabaseProjectSelect(): string {
  return "id,organization_id,name,public_key";
}

function supabaseIssueTargetSelect(): string {
  return "id,project_id,integration_id,provider,namespace,project_name,external_project_id,web_url";
}

function supabaseFeedbackSelect(): string {
  return [
    "id",
    "project_id",
    "issue_target_id",
    "status",
    "type",
    "message",
    "page_url",
    "page_title",
    "browser",
    "viewport_width",
    "viewport_height",
    "device_pixel_ratio",
    "pin_x",
    "pin_y",
    "element_selector",
    "element_text",
    "screenshot_path",
    "payload",
    "issue_draft_title",
    "issue_draft_description",
    "issue_draft_labels",
    "screenshot_data_url",
    "screenshot_mime_type",
    "screenshot_bytes",
    "created_at",
    "updated_at"
  ].join(",");
}

function supabaseFeedbackEventSelect(): string {
  return "id,feedback_id,from_status,to_status,reason,provider,external_url,created_at";
}

function parseFeedbackStatus(value: string): FeedbackStatus {
  if (
    value === "raw"
    || value === "issue_creation_pending"
    || value === "retrying"
    || value === "sent_to_provider"
    || value === "failed"
    || value === "kept"
    || value === "resolved"
    || value === "ignored"
  ) {
    return value;
  }

  return "raw";
}

function parseFeedbackType(value: string): FeedbackType {
  if (value === "comment" || value === "pin" || value === "screenshot") {
    return value;
  }

  return "comment";
}

function parseIssueProvider(value: unknown): IssueProvider | undefined {
  return value === "github" || value === "gitlab" ? value : undefined;
}

function parsePositiveNumber(value: number | string | null | undefined): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function inFilter(values: string[]): string {
  return `in.(${values.join(",")})`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function groupLatestByFeedbackId<T extends { feedback_id: string; updated_at?: string; created_at: string }>(rows: T[]): Map<string, T> {
  const items = new Map<string, T>();

  for (const row of rows) {
    const current = items.get(row.feedback_id);
    const rowDate = row.updated_at ?? row.created_at;
    const currentDate = current ? current.updated_at ?? current.created_at : undefined;

    if (!current || rowDate > (currentDate ?? "")) {
      items.set(row.feedback_id, row);
    }
  }

  return items;
}

function maxIsoDate(values: Array<string | undefined>): string {
  return values.filter((value): value is string => typeof value === "string").sort().at(-1) ?? new Date().toISOString();
}

function cloneIssueDraft(issueDraft: IssueDraft): IssueDraft {
  return {
    title: issueDraft.title,
    description: issueDraft.description,
    labels: [...issueDraft.labels]
  };
}

function createScreenshotAsset(feedbackId: string, dataUrl: string, now: string): StoredAsset {
  return {
    id: crypto.randomUUID(),
    feedbackId,
    mimeType: parseDataUrlMimeType(dataUrl),
    bytes: estimateDataUrlBytes(dataUrl),
    dataUrl,
    createdAt: now
  };
}

function createEvent(
  feedbackId: string,
  fromStatus: FeedbackStatus | undefined,
  toStatus: FeedbackStatus,
  reason: string,
  provider?: IssueProvider,
  externalUrl?: string,
  now = new Date().toISOString()
): FeedbackEvent {
  return {
    id: crypto.randomUUID(),
    feedbackId,
    fromStatus,
    toStatus,
    reason,
    provider,
    externalUrl,
    createdAt: now
  };
}

async function writeStore(filePath: string, store: DataStore): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

function findFeedback(store: DataStore, id: string, workspaceId?: string): StoredFeedback {
  const feedback = store.feedbacks.find((item) => item.id === id && belongsToWorkspace(item, workspaceId));

  if (!feedback) {
    throw new Error(`Feedback ${id} was not found`);
  }

  return feedback;
}

function belongsToWorkspace(feedback: StoredFeedback, workspaceId?: string): boolean {
  return !workspaceId || feedback.workspaceId === workspaceId;
}

function parseDataUrlMimeType(value: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(value);
  return match?.[1] ?? "application/octet-stream";
}

function estimateDataUrlBytes(value: string): number {
  const commaIndex = value.indexOf(",");
  return commaIndex === -1 ? value.length : Math.ceil((value.length - commaIndex - 1) * 0.75);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
