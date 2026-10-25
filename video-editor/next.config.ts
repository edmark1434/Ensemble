import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ["yjs", "y-protocols", "ffprobe-static"],
};

export default nextConfig;
