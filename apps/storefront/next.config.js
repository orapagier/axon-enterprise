const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    // ESLint is run as a separate (non-blocking) CI step rather than gating the
    // build: the legacy lint backlog hasn't been triaged yet, and the toolchain
    // needs the scoped `ajv` override in the root package.json to even run.
    // Flip this to `false` once `npm run lint` is clean.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors now fail the build. The codebase typechecks clean today
    // (`tsc --noEmit`), so keep this honest — a broken type is a broken build.
    ignoreBuildErrors: false,
  },
  experimental: {
    // Seller listing photos are forwarded through a server action; the
    // default 1 MB cap rejects most phone photos before they reach the
    // backend (which enforces its own 4 MB / file limit).
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
