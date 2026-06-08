// Shared Jest setup, referenced by jest.config.js `setupFiles`.
// Intentionally minimal so pure unit tests run without a database — the test
// environment variables are already loaded in jest.config.js via
// loadEnv("test"). Integration suites bring up their own Medusa app.
