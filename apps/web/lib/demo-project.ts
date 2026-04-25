export const demoProject = {
  publicKey: process.env.NEXT_PUBLIC_DEMO_PROJECT_KEY ?? "demo_project_key",
  name: "ChangeThis Demo",
  allowedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
  github: {
    owner: "MLyte",
    repo: "ChangeThis"
  }
};
