import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET() {
  try {
    const swPath = join(process.cwd(), "public", "sw.js")
    const swContent = await readFile(swPath, "utf-8")
    
    return new NextResponse(swContent, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error serving service worker:", error)
    return new NextResponse("Service worker not found", { status: 404 })
  }
}
