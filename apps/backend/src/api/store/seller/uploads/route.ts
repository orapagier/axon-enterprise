import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { hasRole } from "../../../../lib/roles"

/**
 * POST /store/seller/uploads
 *
 * Multipart upload — the `files` field accepts one or more image files.
 * The file goes through Medusa's standard upload workflow so the storage
 * provider (file-local in dev, file-s3 in prod) handles it. Returns the
 * public URLs which the storefront then stores as the product's
 * `thumbnail` / image list.
 *
 * Auth: requires a logged-in customer with account_type=seller.
 * The multer middleware that populates `req.files` is registered in
 * src/api/middlewares.ts.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" })
    return
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "metadata"],
  })
  if (!customer) {
    res.status(401).json({ error: "Customer not found" })
    return
  }
  const meta = (customer.metadata as Record<string, unknown> | null) ?? {}
  if (meta.account_type !== "producer" && meta.account_type !== "seller") {
    res.status(403).json({ error: "Producer account required" })
    return
  }

  type UploadedFile = {
    originalname: string
    mimetype: string
    size: number
    buffer: Buffer
  }
  const files = (req as unknown as { files?: UploadedFile[] }).files
  if (!files?.length) {
    res.status(400).json({ error: "No files were uploaded." })
    return
  }

  // Defensive caps — the multer middleware also enforces these, but keep a
  // belt-and-braces guard here in case the limits change.
  const MAX_FILES = 5
  const MAX_BYTES = 4 * 1024 * 1024 // 4 MB / file
  const MIME_BY_EXT: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  }
  const ALLOWED = new Set(Object.values(MIME_BY_EXT))

  if (files.length > MAX_FILES) {
    res.status(400).json({ error: `Max ${MAX_FILES} files per upload.` })
    return
  }

  // Some browsers (notably Safari and certain mobile browsers) report webp
  // as `application/octet-stream` or an empty string. Fall back to the file
  // extension when the reported mime type is unknown so legitimate webp
  // uploads aren't rejected.
  const resolveMime = (f: UploadedFile): string | null => {
    if (ALLOWED.has(f.mimetype)) return f.mimetype
    const ext = f.originalname.split(".").pop()?.toLowerCase() ?? ""
    return MIME_BY_EXT[ext] ?? null
  }

  // Strip directories, spaces, and characters that would break the static
  // URL path. Keeps the extension so the file resolves with the right
  // Content-Type when served.
  const sanitizeName = (name: string): string => {
    const base = name.split(/[\\/]/).pop() ?? "upload"
    const cleaned = base
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
    return cleaned.length ? cleaned : "upload"
  }

  const prepared: Array<{
    filename: string
    mimeType: string
    content: string
    access: "public"
  }> = []

  for (const f of files) {
    const mimeType = resolveMime(f)
    if (!mimeType) {
      res
        .status(400)
        .json({ error: `${f.originalname}: only JPG, PNG, WebP or AVIF.` })
      return
    }
    if (f.size > MAX_BYTES) {
      res.status(400).json({ error: `${f.originalname}: too large (max 4 MB).` })
      return
    }
    prepared.push({
      filename: sanitizeName(f.originalname),
      mimeType,
      content: f.buffer.toString("base64"),
      access: "public",
    })
  }

  try {
    const { result } = await uploadFilesWorkflow(req.scope).run({
      input: { files: prepared },
    })
    res.status(200).json({ files: result })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed."
    // eslint-disable-next-line no-console
    console.error("[seller uploads] workflow failed:", message)
    res.status(500).json({ error: message })
  }
}
