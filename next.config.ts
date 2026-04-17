import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/logo.svg",
      },
    ];
  },
};

export default nextConfig;
