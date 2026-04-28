type SupabaseUser = {
  id: string;
  email?: string;
};

type WorkspaceMemberRow = {
  organization_id: string;
  role: string;
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
