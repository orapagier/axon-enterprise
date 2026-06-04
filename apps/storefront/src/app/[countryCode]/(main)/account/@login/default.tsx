import LoginTemplate from "@modules/account/templates/login-template"

/**
 * Parallel-route fallback for the `@login` slot.
 *
 * The account layout renders two parallel slots (`@dashboard` / `@login`) but
 * only `@login/page.tsx` (the index) exists in this slot. Without a default,
 * a hard navigation to any deeper account route (e.g. /account/orders) leaves
 * the `@login` slot unmatched and Next.js 404s the whole route. Rendering the
 * login template here means logged-out visitors landing on a deep account URL
 * still get the sign-in screen; for logged-in users the layout discards this
 * slot in favor of `@dashboard`.
 */
export default function LoginDefault() {
  return <LoginTemplate />
}
