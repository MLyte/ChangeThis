type SupabaseUser = {
  id: string;
  email?: string;
};

type SupabaseAuthUserRow = {
  id?: unknown;
  email?: unknown;
};

type WorkspaceMemberRow = {
  user_id?: string;
  organization_id: string;
  role: string;
  status?: string;
  created_at?: string;
};

type OrganizationRow = {
  id: string;
  name: string;
};

const DEFAULT_SUPABASE_REST_TIMEOUT_MS = 10_000;

type SupabaseAuthTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  error?: unknown;
  error_description?: unknown;
};

type SupabaseSignUpResponse = SupabaseAuthTokenResponse & {
  user?: {
    id?: unknown;
    email?: unknown;
  };
};

export type WorkspaceMemberSummary = {
  userId: string;
  email: string;
  role: string;
  status: string;
  joinedAt?: string;
};

export type WorkspaceMemberStatus = "invited" | "active" | "disabled";

export type WorkspaceMemberUpsertResult = WorkspaceMemberSummary & {
  status: WorkspaceMemberStatus;
};

type InviteWorkspaceMemberResult =
  | { ok: true; member: WorkspaceMemberUpsertResult }
  | { ok: false; reason: "invitee_not_found" | "already_active" | "invalid_role" | "invalid_inviter" };

export type SupabasePasswordSignInResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
    }
  | {
      ok: false;
      error: "invalid" | "unavailable" | "missing";
    };

export type SupabaseSignUpResult =
  | {
      ok: true;
      userId: string;
      email: string;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    }
  | {
      ok: false;
      error: "invalid" | "unavailable" | "missing";
    };

export type SupabaseEmailSignUpResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: "invalid" | "unavailable" | "missing";
    };

function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseRestTimeoutMs(): number {
  const rawValue = process.env.SUPABASE_REST_TIMEOUT_MS;
  if (!rawValue) {
    return DEFAULT_SUPABASE_REST_TIMEOUT_MS;
  }

  const timeoutMs = Number(rawValue);
  return Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.floor(timeoutMs)
    : DEFAULT_SUPABASE_REST_TIMEOUT_MS;
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export async function getSupabaseUser(accessToken: string): Promise<SupabaseUser | null> {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    return null;
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: getSupabaseAnonKey()!,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const body = await response.json() as { id?: unknown; email?: unknown };

  if (typeof body.id !== "string") {
    return null;
  }

  return {
    id: body.id,
    email: typeof body.email === "string" ? body.email : undefined
  };
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<SupabasePasswordSignInResult> {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    return {
      ok: false,
      error: "unavailable"
    };
  }

  if (!input.email || !input.password) {
    return {
      ok: false,
      error: "missing"
    };
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: getSupabaseAnonKey()!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      grant_type: "password"
    }),
    cache: "no-store"
  });

  const body = await response.json() as SupabaseAuthTokenResponse;

  if (!response.ok) {
    return {
      ok: false,
      error: "invalid"
    };
  }

  if (typeof body.access_token !== "string") {
    return {
      ok: false,
      error: "invalid"
    };
  }

  const expiresIn = typeof body.expires_in === "number" && Number.isFinite(body.expires_in)
    ? body.expires_in
    : undefined;

  return {
    ok: true,
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : undefined,
    expiresIn
  };
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
}): Promise<SupabaseSignUpResult> {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    return {
      ok: false,
      error: "unavailable"
    };
  }

  if (!input.email || !input.password) {
    return {
      ok: false,
      error: "missing"
    };
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: getSupabaseAnonKey()!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password
    }),
    cache: "no-store"
  });

  const body = await response.json() as SupabaseSignUpResponse;
  const userId = typeof body.user?.id === "string" ? body.user.id : undefined;
  const email = typeof body.user?.email === "string" ? body.user.email : input.email;

  if (!response.ok || !userId) {
    return {
      ok: false,
      error: "invalid"
    };
  }

  const expiresIn = typeof body.expires_in === "number" && Number.isFinite(body.expires_in)
    ? body.expires_in
    : undefined;

  return {
    ok: true,
    userId,
    email,
    accessToken: typeof body.access_token === "string" ? body.access_token : undefined,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : undefined,
    expiresIn
  };
}

export async function requestSignUpEmail(input: {
  email: string;
  redirectTo: string;
}): Promise<SupabaseEmailSignUpResult> {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    return {
      ok: false,
      error: "unavailable"
    };
  }

  if (!input.email) {
    return {
      ok: false,
      error: "missing"
    };
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: getSupabaseAnonKey()!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      should_create_user: true,
      email_redirect_to: input.redirectTo
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return {
      ok: false,
      error: "invalid"
    };
  }

  return {
    ok: true
  };
}

export async function updateSupabasePassword(input: {
  accessToken: string;
  password: string;
}): Promise<SupabaseEmailSignUpResult> {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    return {
      ok: false,
      error: "unavailable"
    };
  }

  if (!input.accessToken || input.password.length < 8) {
    return {
      ok: false,
      error: "missing"
    };
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: getSupabaseAnonKey()!,
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      password: input.password
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return {
      ok: false,
      error: "invalid"
    };
  }

  return {
    ok: true
  };
}

export async function createWorkspaceForUser(input: {
  userId: string;
  organizationName?: string;
  email?: string;
}): Promise<{ id: string; name: string } | null> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey() || !isUuid(input.userId)) {
    return null;
  }

  const name = input.organizationName?.trim() || workspaceNameFromEmail(input.email);
  const organizations = await supabaseRest<OrganizationRow[]>("/rest/v1/organizations?select=id,name", {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      name,
      owner_id: input.userId,
      plan: "free"
    })
  });
  const organization = organizations[0];

  if (!organization) {
    return null;
  }

  await supabaseRest("/rest/v1/workspace_members", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      organization_id: organization.id,
      user_id: input.userId,
      role: "owner",
      status: "active",
      joined_at: new Date().toISOString()
    })
  });

  return organization;
}

function workspaceNameFromEmail(email?: string): string {
  const domain = email?.split("@")[1]?.trim().toLowerCase();

  if (!domain) {
    return "Workspace ChangeThis";
  }

  return `Espace ${domain}`;
}

export async function getFirstWorkspaceForUser(userId: string): Promise<{ id: string; name: string; role: string } | null> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey()) {
    return null;
  }

  const memberRows = await supabaseRest<WorkspaceMemberRow[]>(
    `/rest/v1/workspace_members?user_id=eq.${encodeURIComponent(userId)}&status=eq.active&select=organization_id,role&limit=1`
  );
  const organizationId = memberRows[0]?.organization_id;

  if (!organizationId) {
    return null;
  }

  const organizationRows = await supabaseRest<OrganizationRow[]>(
    `/rest/v1/organizations?id=eq.${encodeURIComponent(organizationId)}&select=id,name&limit=1`
  );
  const organization = organizationRows[0];

  return organization ? { id: organization.id, name: organization.name, role: memberRows[0].role } : null;
}

export async function listWorkspaceMembers(organizationId: string): Promise<WorkspaceMemberSummary[]> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey()) {
    return [];
  }

  const memberRows = await supabaseRest<WorkspaceMemberRow[]>(
    `/rest/v1/workspace_members?organization_id=eq.${encodeURIComponent(organizationId)}&select=user_id,role,status,created_at&order=created_at.asc`
  );

  const members = await Promise.all(
    memberRows
      .filter((member): member is WorkspaceMemberRow & { user_id: string } => typeof member.user_id === "string")
      .map((member) => toWorkspaceMemberSummary(member))
  );

  return members;
}

export async function getWorkspaceUserByEmail(email: string): Promise<SupabaseUser | null> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey()) {
    return null;
  }

  if (!email) {
    return null;
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/admin/users?email=eq.${encodeURIComponent(email)}&select=id,email&limit=1`, {
    headers: {
      apikey: getSupabaseServiceRoleKey()!,
      Authorization: `Bearer ${getSupabaseServiceRoleKey()!}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const users = await response.json() as SupabaseAuthUserRow[];
  const user = users[0];

  if (typeof user?.id !== "string") {
    return null;
  }

  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : email
  };
}

export async function getWorkspaceMember(organizationId: string, userId: string): Promise<WorkspaceMemberUpsertResult | null> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey() || !isUuid(organizationId) || !isUuid(userId)) {
    return null;
  }

  const members = await supabaseRest<Array<WorkspaceMemberRow & { user_id: string }>>(
    `/rest/v1/workspace_members?organization_id=eq.${encodeURIComponent(organizationId)}&user_id=eq.${encodeURIComponent(userId)}&select=organization_id,user_id,role,status,created_at`
  );
  const row = members[0];

  if (!row) {
    return null;
  }

  const email = await getSupabaseUserEmail(row.user_id);

  return {
    userId: row.user_id,
    email: email ?? row.user_id,
    role: row.role,
    status: normalizeWorkspaceMemberStatus(row.status),
    joinedAt: row.created_at
  };
}

export async function inviteWorkspaceMember(input: {
  organizationId: string;
  email: string;
  role: string;
  invitedBy: string;
}): Promise<InviteWorkspaceMemberResult> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey() || !isUuid(input.organizationId) || !isUuid(input.invitedBy)) {
    return { ok: false, reason: "invalid_inviter" };
  }

  const role = normalizeWorkspaceRole(input.role);
  if (!role) {
    return { ok: false, reason: "invalid_role" };
  }

  const user = await getWorkspaceUserByEmail(input.email);
  if (!user) {
    return { ok: false, reason: "invitee_not_found" };
  }

  const existing = await getWorkspaceMember(input.organizationId, user.id);
  if (existing?.status === "active") {
    return { ok: false, reason: "already_active" };
  }

  const now = new Date().toISOString();
  const payload = {
    organization_id: input.organizationId,
    user_id: user.id,
    role,
    status: "invited",
    invited_by: input.invitedBy,
    invited_at: now
  };

  if (existing) {
    const updated = await updateWorkspaceMember(input.organizationId, user.id, {
      role,
      status: "invited",
      invited_by: input.invitedBy,
      invited_at: now
    });
    return updated ? { ok: true, member: { ...updated, status: "invited" } } : { ok: false, reason: "invitee_not_found" };
  }

  await supabaseRest("/rest/v1/workspace_members", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify(payload)
  });

  const member = await getWorkspaceMember(input.organizationId, user.id);
  return member ? { ok: true, member } : { ok: false, reason: "invitee_not_found" };
}

export async function updateWorkspaceMemberStatus(input: {
  organizationId: string;
  userId: string;
  status: WorkspaceMemberStatus;
  role?: string;
}): Promise<WorkspaceMemberUpsertResult | null> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey() || !isUuid(input.organizationId) || !isUuid(input.userId)) {
    return null;
  }

  const update: Record<string, string> = {
    status: input.status
  };

  if (input.role) {
    const role = normalizeWorkspaceRole(input.role);
    if (role) {
      update.role = role;
    }
  }

  const row = await updateWorkspaceMember(input.organizationId, input.userId, update);
  return row;
}

export async function updateWorkspaceMember(
  organizationId: string,
  userId: string,
  patch: Record<string, string>
): Promise<WorkspaceMemberUpsertResult | null> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey() || !isUuid(organizationId) || !isUuid(userId)) {
    return null;
  }

  const encodedOrg = encodeURIComponent(organizationId);
  const encodedUser = encodeURIComponent(userId);
  const patchedRows = await supabaseRest<Array<WorkspaceMemberRow>>(
    `/rest/v1/workspace_members?organization_id=eq.${encodedOrg}&user_id=eq.${encodedUser}&limit=1`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation"
      },
      body: JSON.stringify(patch)
    }
  );

  const row = patchedRows[0];
  if (!row || row.user_id !== userId) {
    return null;
  }

  const email = await getSupabaseUserEmail(row.user_id);

  return {
    userId: row.user_id,
    email: email ?? row.user_id,
    role: row.role,
    status: normalizeWorkspaceMemberStatus(row.status),
    joinedAt: row.created_at
  };
}

export async function insertProviderCredentialMetadata(input: {
  integrationId: string;
  credentialKind: string;
  storageReference: string;
  displayName?: string;
  scopes?: string[];
  expiresAt?: string;
}): Promise<void> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey() || !isUuid(input.integrationId)) {
    return;
  }

  const existing = await supabaseRest<Array<{ id: string }>>(
    `/rest/v1/provider_integration_credentials?integration_id=eq.${encodeURIComponent(input.integrationId)}&credential_kind=eq.${encodeURIComponent(input.credentialKind)}&status=eq.active&select=id&limit=1`
  );
  const body = {
    integration_id: input.integrationId,
    credential_kind: input.credentialKind,
    storage_reference: input.storageReference,
    display_name: input.displayName,
    scopes: input.scopes ?? [],
    expires_at: input.expiresAt,
    status: "active",
    rotated_at: new Date().toISOString()
  };

  if (existing[0]?.id) {
    await supabaseRest(`/rest/v1/provider_integration_credentials?id=eq.${encodeURIComponent(existing[0].id)}`, {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify(body)
    });
    return;
  }

  await supabaseRest("/rest/v1/provider_integration_credentials", {
    method: "POST",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify(body)
  });
}

async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey()) {
    throw new Error("Supabase service role is not configured");
  }

  const response = await fetchSupabaseRest(`${getSupabaseUrl()}${path}`, {
    ...init,
    headers: {
      apikey: getSupabaseServiceRoleKey()!,
      Authorization: `Bearer ${getSupabaseServiceRoleKey()!}`,
      "Content-Type": "application/json",
      ...init.headers
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Supabase REST request failed with HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

export async function supabaseServiceRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return supabaseRest<T>(path, init);
}

async function fetchSupabaseRest(input: string, init: RequestInit): Promise<Response> {
  const timeoutMs = getSupabaseRestTimeoutMs();
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const inputSignal = init.signal;
  const abortFromInputSignal = () => controller.abort(inputSignal?.reason);
  if (inputSignal?.aborted) {
    clearTimeout(timeout);
    throw new Error("Supabase REST request was aborted");
  }
  inputSignal?.addEventListener("abort", abortFromInputSignal, { once: true });

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (timedOut) {
      throw new Error(`Supabase REST request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    inputSignal?.removeEventListener("abort", abortFromInputSignal);
  }
}

async function toWorkspaceMemberSummary(member: WorkspaceMemberRow & { user_id: string }): Promise<WorkspaceMemberSummary> {
  return {
    userId: member.user_id,
    email: await getSupabaseUserEmail(member.user_id) ?? member.user_id,
    role: member.role,
    status: member.status ?? "active",
    joinedAt: member.created_at
  };
}

async function getSupabaseUserEmail(userId: string): Promise<string | undefined> {
  if (!getSupabaseUrl() || !getSupabaseServiceRoleKey()) {
    return undefined;
  }

  const response = await fetch(`${getSupabaseUrl()}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: {
      apikey: getSupabaseServiceRoleKey()!,
      Authorization: `Bearer ${getSupabaseServiceRoleKey()!}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return undefined;
  }

  const body = await response.json() as { email?: unknown };
  return typeof body.email === "string" ? body.email : undefined;
}

function normalizeWorkspaceRole(value: string): string | undefined {
  return value === "viewer" || value === "member" || value === "admin" || value === "owner" ? value : undefined;
}

function normalizeWorkspaceMemberStatus(value: string | undefined): WorkspaceMemberStatus {
  if (value === "invited" || value === "active" || value === "disabled") {
    return value;
  }

  return "active";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
