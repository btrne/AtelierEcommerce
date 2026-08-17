import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";
const API_PROXY_ORIGIN = process.env.API_PROXY_ORIGIN;

function getApiOrigin(apiBase: string, proxyOrigin?: string) {
  if (proxyOrigin) {
    return proxyOrigin.replace(/\/$/, "");
  }

  if (apiBase.startsWith("/")) {
    return "";
  }

  return apiBase.replace(/\/api\/?$/, "");
}

const API_ORIGIN = getApiOrigin(API_BASE, API_PROXY_ORIGIN);

const nextConfig: NextConfig = {
  async rewrites() {
    const rewrites: { source: string; destination: string }[] = [];

    if (API_BASE.startsWith("/") && API_ORIGIN) {
      rewrites.push({
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      });
    }

    if (API_ORIGIN) {
      rewrites.push({
        source: "/uploads/:path*",
        destination: `${API_ORIGIN}/uploads/:path*`,
      });
    }

    return rewrites;
  },
};

export default nextConfig;
