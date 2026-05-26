import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: "/organization/:id/resources",
        destination: "/organization/:id/resource_summary",
        permanent: false,
      },
      {
        source: "/organization/:id/resources/db",
        destination: "/organization/:id/resource_summary/resources",
        permanent: false,
      },
      {
        source: "/organization/:id/resources/:summary_id",
        destination: "/organization/:id/resource_summary/:summary_id",
        permanent: false,
      },
      {
        source: "/organization/:id/scheduler",
        destination: "/organization/:id/schedular",
        permanent: false,
      },
      {
        source: "/organization/:id/scheduler/:schedularId",
        destination: "/organization/:id/schedular/:schedularId",
        permanent: false,
      },
      {
        source: "/organization/:id/scheduler/details/:schId",
        destination: "/organization/:id/schedular/details/:schId",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.BACKEND_INTERNAL_URL || "http://localhost:8000"}/:path*`,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions ?? {}),
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
};

export default nextConfig;
