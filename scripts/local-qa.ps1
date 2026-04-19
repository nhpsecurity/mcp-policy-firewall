$ErrorActionPreference = "Stop"

Write-Host "[1/4] Run CI quality gates"
npm run qa:ci | Out-Host

Write-Host "[2/4] Start mcp-firewall mock server"
$server = Start-Process -FilePath "node" -ArgumentList "dist/cli.js", "start", "--config", "./examples/config.mock-local.json" -PassThru

try {
  Write-Host "[3/4] Wait for health endpoint"
  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -Method Get
      if ($health.status -eq "ok") {
        $ready = $true
        break
      }
    }
    catch {
      # keep retrying until timeout
    }
  }

  if (-not $ready) {
    throw "mcp-firewall did not become ready on /health"
  }

  Write-Host "[4/4] Run smoke test"
  powershell -ExecutionPolicy Bypass -File ./scripts/smoke-test.ps1 | Out-Host

  Write-Host "Local QA completed successfully." -ForegroundColor Green
}
finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
