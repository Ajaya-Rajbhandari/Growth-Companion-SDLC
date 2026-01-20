# Clear Next.js build cache
Write-Host "Clearing Next.js build cache..."

# Stop any running Node processes (optional - uncomment if needed)
# Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Remove .next directory
if (Test-Path .next) {
    Write-Host "Removing .next directory..."
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    # Try again if it still exists
    if (Test-Path .next) {
        Write-Host "Retrying removal of .next directory..."
        Get-ChildItem .next -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        Remove-Item .next -Force -ErrorAction SilentlyContinue
    }
    Write-Host ".next directory cleared"
} else {
    Write-Host ".next directory not found"
}

# Remove node_modules cache if it exists
if (Test-Path node_modules\.cache) {
    Write-Host "Removing node_modules cache..."
    Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
    Write-Host "node_modules cache cleared"
}

Write-Host "Cache cleared! You can now restart the dev server with: pnpm dev"
