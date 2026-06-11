import { defineMiddlewares } from "@medusajs/framework/http"
import { authenticate } from "@medusajs/framework/http"
import multer from "multer"
import { authenticateRider } from "../lib/rider-auth"

/**
 * MFH custom API middlewares.
 *
 * Seller endpoints require a logged-in customer + (in the route handler) the
 * customer must have `account_type=seller`. Admin endpoints require a logged-in
 * admin user.
 *
 * The `/store/seller/uploads` route also runs multer (in-memory storage) so
 * the upload-files workflow receives parsed multipart files at `req.files`.
 */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,
    fileSize: 4 * 1024 * 1024, // 4 MB per file
  },
})

export default defineMiddlewares({
  routes: [
    {
      // Multer must be paired with auth in the same entry: when a more
      // specific matcher (this one) overlaps a broader one, Medusa applies
      // only the more specific entry's middlewares to that exact path. So
      // we re-declare authenticate here, otherwise the upload route lands
      // without `req.auth_context` and returns 401.
      matcher: "/store/seller/uploads",
      method: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        upload.array("files"),
      ],
    },
    {
      matcher: "/store/seller*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/admin/sellers*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/memberships*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/hubs*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/listings*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/pickup-windows*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/dispatch*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/cod-reconcile*",
      method: ["GET"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/dispatch-orders/*/refusal",
      method: ["POST"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/disputes*",
      method: ["GET", "POST"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/store/customer/disputes*",
      method: ["GET", "POST"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/admin/orders/*/cod-collected",
      method: ["POST"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/orders/*/cod-remitted",
      method: ["POST"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/orders/*/otc-collected",
      method: ["POST"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/orders/*/cash-state",
      method: ["GET"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/riders*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/traders*",
      method: ["GET", "POST"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/store/trader-pricing",
      method: ["GET"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/admin/dispatch-orders/*/delivered",
      method: ["POST"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      // All rider endpoints require a valid rider token. The public login
      // route (POST /rider/auth/login) is exempted *inside* authenticateRider,
      // because Medusa applies matching middlewares cumulatively — a separate
      // empty-middlewares entry for the login path does NOT override this one.
      matcher: "/rider/*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticateRider],
    },
    {
      matcher: "/store/customers/me/hub",
      method: ["POST", "DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      // Self-service permanent account deletion.
      matcher: "/store/customers/me/account",
      method: ["DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      // Rider session exchange + registration ride on the CUSTOMER session:
      // riders sign in on the storefront like any user, then these endpoints
      // match customer.email ↔ rider.email (see /store/riders/* routes).
      matcher: "/store/riders*",
      method: ["GET", "POST"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})