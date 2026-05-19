import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

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
  if (meta.account_type !== "seller") {
    res.status(403).json({ error: "Seller account required" })
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
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "No files were uploaded")
  }

  // Defensive caps — the multer middleware also enforces these, but keep a
  // belt-and-braces guard here in case the limits change.
  const MAX_FILES = 5
  const MAX_BYTES = 4 * 1024 * 1024 // 4 MB / file
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"]

  if (files.length > MAX_FILES) {
    res.status(400).json({ error: `Max ${MAX_FILES} files per upload.` })
    return
  }
  for (const f of files) {
    if (!ALLOWED.includes(f.mimetype)) {
      res
        .status(400)
        .json({ error: `${f.originalname}: only JPG, PNG, WebP or AVIF.` })
      return
    }
    if (f.size > MAX_BYTES) {
      res.status(400).json({ error: `${f.originalname}: too large (max 4 MB).` })
      return
    }
  }

  const { result } = await uploadFilesWorkflow(req.scope).run({
    input: {
      files: files.map((f) => ({
        filename: f.originalname,
        mimeType: f.mimetype,
        content: f.buffer.toString("base64"),
        access: "public",
      })),
    },
  })

  res.status(200).json({ files: result })
}
