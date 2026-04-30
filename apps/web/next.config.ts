import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: fileURLToPath(new URL("../..", import.meta.url))
  },
  transpilePackages: ["@changethis/shared"]
};

export default nextConfig;
