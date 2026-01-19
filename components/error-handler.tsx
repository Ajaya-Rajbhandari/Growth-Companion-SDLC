"use client"

import { useEffect } from "react"

export function ErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Log the error properly
      const error = event.reason
      
      if (error instanceof Error) {
        console.error("Unhandled promise rejection:", error.message, error)
        // Let Next.js handle Error objects normally
        return
      } else if (typeof error === "string") {
        console.error("Unhandled promise rejection:", error)
        // Prevent default and log - the error should already be converted to Error in the code
      } else if (error && typeof error === "object") {
        // Extract message from Supabase or other error objects
        const errorMessage = error.message || error.error_description || error.error || JSON.stringify(error)
        console.error("Unhandled promise rejection:", errorMessage, error)
        // Log the full error object for debugging
        console.error("Full error object:", error)
      }
      
      // Prevent the default browser console error for non-Error objects
      // This helps avoid [object Object] messages
      if (!(error instanceof Error)) {
        event.preventDefault()
      }
    }

    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      // Log the error
      console.error("Unhandled error:", event.error || event.message)
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
    }
  }, [])

  return null
}
