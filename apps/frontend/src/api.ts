export type Session = {
  authenticated: boolean;
  user?: {
    id: number;
    email: string;
  };
  workspace?: {
    id: string;
    name: string;
    role: string;
  };
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    },
    ...init
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed with HTTP ${response.status}`);
  }

  return await response.json() as T;
}
