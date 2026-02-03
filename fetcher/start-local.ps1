# Start-local script for tulotero-proxy (PowerShell)
# - Generates a secure PROXY_KEY and writes a .env file (backups existing .env)
# - Runs `docker compose up -d` to build & start the service

Set-StrictMode -Version Latest
$envFile = Join-Path -Path $PSScriptRoot -ChildPath ".env"
if (Test-Path $envFile) {
  Write-Host "Found existing .env, backing up to .env.bak" -ForegroundColor Yellow
  Copy-Item -Path $envFile -Destination "$envFile.bak" -Force
}

# Generate a key (GUID)
$key = [guid]::NewGuid().ToString()

$contents = @"
PROXY_KEY=$key
ALLOWED_ORIGINS=*
CACHE_TTL=600
"@

$contents | Out-File -FilePath $envFile -Encoding UTF8 -Force

Write-Host "Created .env with PROXY_KEY: $key" -ForegroundColor Green

# Check Docker
$dockerOutput = & docker version --format '{{.Client.Version}}' 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker not found or not running. Output:" -ForegroundColor Red
  Write-Host $dockerOutput -ForegroundColor Red
  Write-Host "Please ensure Docker Desktop / Engine is installed and running." -ForegroundColor Red
  exit 1
}

# Start the service
Push-Location $PSScriptRoot
try {
  $composeOutput = & docker compose up -d 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "docker compose failed (see output below)." -ForegroundColor Red
    Write-Host $composeOutput -ForegroundColor Red
    Write-Host "Ensure Docker Desktop is running or your Docker Engine is available (WSL2 backend on Windows)." -ForegroundColor Red
    exit 1
  }
  Write-Host "Proxy started (exposed on port 3003)." -ForegroundColor Green
  Write-Host "Test with: curl 'http://localhost:3003/fetch?key=$key'" -ForegroundColor Gray
  Write-Host "Then put Proxy URL = http://localhost:3003/fetch and Clave = $key in the app Ajustes." -ForegroundColor Gray
} finally {
  Pop-Location
}
