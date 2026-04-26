const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "https://andenne-bears.be",
  "https://www.andenne-bears.be"
];

function getAllowedOrigins(): string[] {
  const configuredOrigins = process.env.DEMO_PROJECT_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins?.length ? configuredOrigins : defaultAllowedOrigins;
}

function getDemoProjectKey(): string {
  const projectKey = process.env.NEXT_PUBLIC_DEMO_PROJECT_KEY;

  if (projectKey) {
    return projectKey;
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error("NEXT_PUBLIC_DEMO_PROJECT_KEY must be configured in production");
  }

  return "demo_project_key";
}

export const demoProject = {
  publicKey: getDemoProjectKey(),
  name: "ChangeThis Demo",
  allowedOrigins: getAllowedOrigins(),
  github: {
    owner: "MLyte",
    repo: "ChangeThis"
  }
};
