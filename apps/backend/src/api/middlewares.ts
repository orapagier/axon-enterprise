import { defineMiddlewares } from "@medusajs/framework/http"
import { authenticate } from "@medusajs/framework/http"
import multer from "multer"

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
      matcher: "/store/seller*",
      method: ["GET", "POST", "PATCH", "DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/seller/uploads",
      method: ["POST"],
      middlewares: [upload.array("files")],
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
      matcher: "/store/customers/me/hub",
      method: ["POST", "DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})