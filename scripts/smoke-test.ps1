Param(
  [string]$BaseUrl = "http://127.0.0.1:8787",
  [switch]$Strict
)

$ErrorActionPreference = "Stop"

if (-not $PSBoundParameters.ContainsKey("Strict")) {
  $Strict = $true
}

function Invoke-JsonRpc {
  Param(
    [string]$Method,
    [int]$Id,
    [hashtable]$Params = @{}
  )

  $body = @{
    jsonrpc = "2.0"
    id      = $Id
    method  = $Method
    params  = $Params
  } | ConvertTo-Json -Depth 8

  return Invoke-RestMethod -Uri "$BaseUrl/mcp" -Method Post -ContentType "application/json" -Body $body
}

Write-Host "Running mcp-firewall smoke test against $BaseUrl"

$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
Write-Host "Health status: $($health.status)"
Write-Host "Connected servers: $($health.connectedCount)/$($health.totalConfiguredServers)"

$listTools = Invoke-JsonRpc -Method "tools/list" -Id 1
$tools = @($listTools.result.tools)
Write-Host "tools/list returned $($tools.Count) tools"

if ($tools.Count -eq 0) {
  if ($Strict) {
    throw "No tools available. Ensure at least one downstream server is connected."
  }

  Write-Host "No tools available. Ensure at least one downstream server is connected." -ForegroundColor Yellow
  exit 0
}

$readTool = $tools | Where-Object { $_.name -like "*read*" } | Select-Object -First 1
if ($null -eq $readTool) {
  if ($Strict) {
    throw "No read-like tool found. Unable to verify safe allow behavior."
  }

  Write-Host "No read-like tool found. Skipping safe allow behavior check." -ForegroundColor Yellow
}
else {
  $safeCall = Invoke-JsonRpc -Method "tools/call" -Id 2 -Params @{ name = $readTool.name; arguments = @{ path = "README.md" } }
  if (-not $safeCall.result) {
    throw "Safe call did not return a result payload."
  }

  Write-Host "Safe call succeeded with tool: $($readTool.name)" -ForegroundColor Green
}

$deleteTool = $tools | Where-Object { $_.name -like "*delete*" -or $_.name -like "*write*" } | Select-Object -First 1
if ($null -eq $deleteTool) {
  if ($Strict) {
    throw "No risky write/delete tool discovered to test block behavior."
  }

  Write-Host "No risky write/delete tool discovered to test block behavior." -ForegroundColor Yellow
  exit 0
}

$blockedBody = @{
  jsonrpc = "2.0"
  id      = 3
  method  = "tools/call"
  params  = @{
    name      = $deleteTool.name
    arguments = @{ path = "README.md" }
  }
} | ConvertTo-Json -Depth 8

try {
  Invoke-RestMethod -Uri "$BaseUrl/mcp" -Method Post -ContentType "application/json" -Body $blockedBody | Out-Null
  throw "Expected denied response, but risky request succeeded."
}
catch {
  $response = $null
  if ($_.Exception -and $_.Exception.Message -eq "Expected denied response, but risky request succeeded.") {
    throw
  }

  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    try {
      $response = $_.ErrorDetails.Message | ConvertFrom-Json
    }
    catch {
      throw "Blocked response was returned but JSON could not be parsed."
    }
  }

  if (-not $response) {
    throw "Blocked response details were not available."
  }

  if ($response.error -and $response.error.data -and $response.error.data.policyId) {
    Write-Host "Blocked call confirmed. policyId: $($response.error.data.policyId)" -ForegroundColor Green
    if ($response.error.data.remediationHint) {
      Write-Host "Hint: $($response.error.data.remediationHint)"
    }
  }
  else {
    throw "Blocked call observed, but response shape was unexpected."
  }
}
