type SupabaseUser = {
  id: string;
  email?: string;
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export async function getSupabaseUser(accessToken: string): Promise<SupabaseUser | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
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
  if (!supabaseUrl || !supabaseAnonKey) {
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

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
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
  if (!supabaseUrl || !supabaseAnonKey) {
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

  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
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

export async function createWorkspaceForUser(input: {
  userId: string;
  organizationName: string;
}): Promise<{ id: string; name: string } | null> {
  if (!supabaseUrl || !supabaseServiceRoleKey || !isUuid(input.userId)) {
    return null;
  }

  const name = input.organizationName.trim() || "Workspace ChangeThis";
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

export async function getFirstWorkspaceForUser(userId: string): Promise<{ id: string; name: string; role: string } | null> {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
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
  if (!supabaseUrl || !supabaseServiceRoleKey) {
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

export async function insertProviderCredentialMetadata(input: {
  integrationId: string;
  credentialKind: string;
  storageReference: string;
  displayName?: string;
  scopes?: string[];
  expiresAt?: string;
}): Promise<void> {
  if (!supabaseUrl || !supabaseServiceRoleKey || !isUuid(input.integrationId)) {
    return;
  }

  await supabaseRest("/rest/v1/provider_integration_credentials", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      integration_id: input.integrationId,
      credential_kind: input.credentialKind,
      storage_reference: input.storageReference,
      display_name: input.displayName,
      scopes: input.scopes ?? [],
      expires_at: input.expiresAt,
      status: "active",
      rotated_at: new Date().toISOString()
    })
  });
}

async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service role is not configured");
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
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

  return await response.json() as T;
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
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return undefined;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return undefined;
  }

  const body = await response.json() as { email?: unknown };
  return typeof body.email === "string" ? body.email : undefined;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
