import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ["yjs", "y-protocols"],
};

export default nextConfig;
