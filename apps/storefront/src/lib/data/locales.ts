"use server"

export type Locale = {
  code: string
  name: string
}

/**
 * Locales aren't configured on the backend — there's no `/store/locales`
 * route, and the storefront is single-language (English) at launch. We
 * keep this function so callers compile, but return `null` so the
 * language picker stays hidden and we don't spam 404s in dev logs.
 */
export const listLocales = async (): Promise<Locale[] | null> => {
  return null
}
