import { NextResponse } from "next/server"

export function GET() {
  return NextResponse.json({
    resend: Boolean(process.env.RESEND_API_KEY),
    from: process.env.EMAIL_FROM ?? null,
  })
}
