import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProduction = process.env.NODE_ENV === 'production'
const REDIS_URL = process.env.REDIS_URL

/**
 * Secrets must never fall back to a shared default in production. In dev we
 * allow the placeholder so a fresh checkout boots, but we refuse to start a
 * production server with a guessable JWT/cookie secret.
 */
function requireSecret(name: 'JWT_SECRET' | 'COOKIE_SECRET'): string {
  const value = process.env[name]
  if (!value || value === 'supersecret') {
    if (isProduction) {
      throw new Error(
        `${name} must be set to a strong, unique value in production ` +
          '(generate one with `openssl rand -base64 32`).'
      )
    }
    return value || 'supersecret-dev-only'
  }
  return value
}

/**
 * Infrastructure modules.
 *
 * Medusa ships in-memory implementations of the event bus, cache, workflow
 * engine, and locking modules. They are convenient for local dev but are NOT
 * production-safe: events are dropped on restart, nothing is shared across
 * instances, and there is no distributed lock. When REDIS_URL is present we
 * swap in the Redis-backed versions; in production REDIS_URL is mandatory.
 */
const infraModules: Record<string, unknown>[] = []

if (REDIS_URL) {
  infraModules.push(
    {
      key: Modules.EVENT_BUS,
      resolve: '@medusajs/event-bus-redis',
      options: { redisUrl: REDIS_URL },
    },
    {
      key: Modules.CACHE,
      resolve: '@medusajs/cache-redis',
      options: { redisUrl: REDIS_URL },
    },
    {
      key: Modules.WORKFLOW_ENGINE,
      resolve: '@medusajs/workflow-engine-redis',
      options: { redis: { url: REDIS_URL } },
    },
    {
      key: Modules.LOCKING,
      resolve: '@medusajs/locking',
      options: {
        providers: [
          {
            resolve: '@medusajs/locking-redis',
            id: 'locking-redis',
            is_default: true,
            options: { redisUrl: REDIS_URL },
          },
        ],
      },
    }
  )
} else if (isProduction) {
  throw new Error(
    'REDIS_URL is required in production. The default in-memory event bus, ' +
      'cache, and workflow engine lose state on restart and cannot scale ' +
      'beyond a single instance.'
  )
}

/**
 * File storage. The default file-local provider writes to the container disk,
 * which is ephemeral and per-instance — uploaded seller photos would vanish on
 * redeploy. Use S3 (or any S3-compatible store) when configured; require it in
 * production.
 */
const hasS3 =
  !!process.env.S3_BUCKET &&
  !!process.env.S3_ACCESS_KEY_ID &&
  !!process.env.S3_SECRET_ACCESS_KEY

if (hasS3) {
  infraModules.push({
    key: Modules.FILE,
    resolve: '@medusajs/file',
    options: {
      providers: [
        {
          resolve: '@medusajs/file-s3',
          id: 's3',
          options: {
            file_url: process.env.S3_FILE_URL,
            access_key_id: process.env.S3_ACCESS_KEY_ID,
            secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
            region: process.env.S3_REGION,
            bucket: process.env.S3_BUCKET,
            endpoint: process.env.S3_ENDPOINT,
            // Allow S3-compatible providers (e.g. Cloudflare R2, MinIO).
            additional_client_config: process.env.S3_FORCE_PATH_STYLE
              ? { forcePathStyle: true }
              : undefined,
          },
        },
      ],
    },
  })
} else if (isProduction) {
  throw new Error(
    'S3 file storage (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, ' +
      'S3_REGION, S3_FILE_URL) is required in production. Local file storage ' +
      'is ephemeral and not shared across instances.'
  )
}

const customModules: Record<string, unknown>[] = [
  { resolve: './src/modules/hub' },
  { resolve: './src/modules/listing' },
  { resolve: './src/modules/pickup' },
  { resolve: './src/modules/dispatch' },
  { resolve: './src/modules/cod-ledger' },
  { resolve: './src/modules/accountability' },
  { resolve: './src/modules/delivery-fees' },
  {
    resolve: '@medusajs/medusa/payment',
    options: {
      providers: [
        {
          resolve: './src/modules/payment-cod',
          id: 'freshhub',
        },
      ],
    },
  },
]

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: requireSecret('JWT_SECRET'),
      cookieSecret: requireSecret('COOKIE_SECRET'),
    },
  },
  modules: [...customModules, ...infraModules],
})
