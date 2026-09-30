import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: false,
	serverExternalPackages: [
		"ffmpeg-static",
		"fluent-ffmpeg",
		"ffprobe-static",
		"sharp"
	]
};

export default nextConfig;