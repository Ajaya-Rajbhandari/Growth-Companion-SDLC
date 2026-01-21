import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET() {
  try {
    const manifestPath = join(process.cwd(), "public", "manifest.json")
    const manifestContent = await readFile(manifestPath, "utf-8")
    
    return new NextResponse(manifestContent, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error serving manifest:", error)
    return new NextResponse("Manifest not found", { status: 404 })
  }
}
