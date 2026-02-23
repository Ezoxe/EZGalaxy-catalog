# ─── EZGalaxy Docker Package Validator (React + FastAPI) ───
# Validates ezcontainer.json, Dockerfile, docker-compose.yml, backend/, frontend/ for each app

param(
  [string]$Root
)

if([string]::IsNullOrWhiteSpace($Root)){
  if($PSScriptRoot){
    $Root = (Split-Path -Parent $PSScriptRoot)
  } else {
    $Root = (Get-Location).Path
  }
}

$ErrorActionPreference = 'Stop'

$appsRoot = Join-Path $Root 'packages\apps'
if(!(Test-Path $appsRoot)){
  throw "Missing apps root: $appsRoot"
}

$apps = Get-ChildItem -LiteralPath $appsRoot -Directory
$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

foreach($app in $apps){
  $appName = $app.Name
  $appRoot = $app.FullName

  # ---- ezcontainer.json
  $manifestPath = Join-Path $appRoot 'ezcontainer.json'
  if(!(Test-Path $manifestPath)) {
    $errors.Add("[$appName] Missing ezcontainer.json")
    continue
  }

  $manifest = $null
  try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    $errors.Add("[$appName] ezcontainer.json invalid JSON: $($_.Exception.Message)")
    continue
  }

  # Required fields (schemaVersion 2 format)
  if($manifest.schemaVersion -ne 2) { $errors.Add("[$appName] ezcontainer.json.schemaVersion must be 2 (got: $($manifest.schemaVersion))") }
  if([string]::IsNullOrWhiteSpace($manifest.id)) { $errors.Add("[$appName] ezcontainer.json.id missing") }
  if([string]::IsNullOrWhiteSpace($manifest.title)) { $errors.Add("[$appName] ezcontainer.json.title missing") }
  if([string]::IsNullOrWhiteSpace($manifest.function)) { $errors.Add("[$appName] ezcontainer.json.function missing") }
  if([string]::IsNullOrWhiteSpace($manifest.version)) { $errors.Add("[$appName] ezcontainer.json.version missing") }

  # Docker block
  if(-not $manifest.docker) {
    $errors.Add("[$appName] ezcontainer.json.docker block missing")
  } else {
    if(-not $manifest.docker.port) { $errors.Add("[$appName] ezcontainer.json.docker.port missing") }
    elseif($manifest.docker.port -ne 8000) { $errors.Add("[$appName] ezcontainer.json.docker.port must be 8000 (got: $($manifest.docker.port))") }
    if([string]::IsNullOrWhiteSpace($manifest.docker.dockerfile)) { $warnings.Add("[$appName] ezcontainer.json.docker.dockerfile not set") }
    if(-not $manifest.docker.healthcheck) {
      $warnings.Add("[$appName] ezcontainer.json.docker.healthcheck block missing")
    } elseif([string]::IsNullOrWhiteSpace($manifest.docker.healthcheck.endpoint)) {
      $warnings.Add("[$appName] ezcontainer.json.docker.healthcheck.endpoint missing")
    }
  }

  # ---- Dockerfile
  $dockerfilePath = Join-Path $appRoot 'Dockerfile'
  if(!(Test-Path $dockerfilePath)) {
    $errors.Add("[$appName] Missing Dockerfile")
  } else {
    $dockerfileContent = Get-Content -LiteralPath $dockerfilePath -Raw
    if($dockerfileContent -notmatch 'HEALTHCHECK') {
      $errors.Add("[$appName] Dockerfile is missing HEALTHCHECK instruction")
    }
    $exposeMatch = [regex]::Match($dockerfileContent, 'EXPOSE\s+(\d+)')
    if($exposeMatch.Success) {
      $exposedPort = [int]$exposeMatch.Groups[1].Value
      if($exposedPort -ne 8000) {
        $errors.Add("[$appName] Dockerfile EXPOSE $exposedPort != expected 8000")
      }
    }
    if($dockerfileContent -notmatch 'frontend') {
      $warnings.Add("[$appName] Dockerfile does not reference frontend/")
    }
    if($dockerfileContent -notmatch 'uvicorn') {
      $errors.Add("[$appName] Dockerfile missing uvicorn CMD")
    }
  }

  # ---- docker-compose.yml
  $composePath = Join-Path $appRoot 'docker-compose.yml'
  if(!(Test-Path $composePath)) {
    $errors.Add("[$appName] Missing docker-compose.yml")
  } else {
    $composeContent = Get-Content -LiteralPath $composePath -Raw
    if($composeContent -notmatch ':8000') {
      $errors.Add("[$appName] docker-compose.yml does not map to container port 8000")
    }
  }

  # ---- Backend
  $backendDir = Join-Path $appRoot 'backend'
  if(!(Test-Path $backendDir)) {
    $errors.Add("[$appName] Missing backend/ directory")
  } else {
    $mainPy = Join-Path $backendDir 'main.py'
    $reqTxt = Join-Path $backendDir 'requirements.txt'
    if(!(Test-Path $mainPy)) { $errors.Add("[$appName] Missing backend/main.py") }
    if(!(Test-Path $reqTxt)) { $errors.Add("[$appName] Missing backend/requirements.txt") }
  }

  # ---- Frontend
  $frontendDir = Join-Path $appRoot 'frontend'
  if(!(Test-Path $frontendDir)) {
    $errors.Add("[$appName] Missing frontend/ directory")
  } else {
    $feFiles = @('index.html','package.json','vite.config.js')
    foreach($f in $feFiles) {
      if(!(Test-Path (Join-Path $frontendDir $f))) { $errors.Add("[$appName] Missing frontend/$f") }
    }
    $srcDir = Join-Path $frontendDir 'src'
    if(!(Test-Path $srcDir)) {
      $errors.Add("[$appName] Missing frontend/src/")
    } else {
      $srcFiles = @('main.jsx','App.jsx','App.css','api.js')
      foreach($f in $srcFiles) {
        if(!(Test-Path (Join-Path $srcDir $f))) { $errors.Add("[$appName] Missing frontend/src/$f") }
      }
    }
  }

  # ---- Old files check
  $oldFiles = @('server.js','ezgalaxy-sdk.js','ezpage.json')
  foreach($f in $oldFiles) {
    if(Test-Path (Join-Path $appRoot $f)) {
      $warnings.Add("[$appName] Old file '$f' still present (should be removed)")
    }
  }
  $oldAuth = Join-Path $appRoot 'web\ezgalaxy-authorization.json'
  if(Test-Path $oldAuth) {
    $warnings.Add("[$appName] Old web/ezgalaxy-authorization.json still present")
  }
}

# ---- Validate catalog.json
$catalogPath = Join-Path $Root 'catalog.json'
if(Test-Path $catalogPath) {
  $catalog = Get-Content -LiteralPath $catalogPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if($catalog.schemaVersion -ne 2) {
    $errors.Add("[catalog.json] schemaVersion must be 2 (got: $($catalog.schemaVersion))")
  }
  foreach($pkg in $catalog.packages) {
    if($pkg.hash) {
      $warnings.Add("[catalog.json] Package '$($pkg.id)' still has legacy 'hash' field")
    }
    $pkgPath = Join-Path $Root $pkg.path
    if(!(Test-Path $pkgPath)) {
      $errors.Add("[catalog.json] Package '$($pkg.id)' path not found: $($pkg.path)")
    }
  }
} else {
  $errors.Add("Missing catalog.json at root")
}

# ---- Report
Write-Host "--- React+FastAPI Docker Package Validation Report ---"
Write-Host ("Apps checked: {0}" -f $apps.Count)
Write-Host ("Errors: {0} | Warnings: {1}" -f $errors.Count, $warnings.Count)

if($errors.Count -gt 0){
  Write-Host "`nERRORS:" -ForegroundColor Red
  $errors | Sort-Object | ForEach-Object { Write-Host ("  - {0}" -f $_) -ForegroundColor Red }
}

if($warnings.Count -gt 0){
  Write-Host "`nWARNINGS:" -ForegroundColor Yellow
  $warnings | Sort-Object | ForEach-Object { Write-Host ("  - {0}" -f $_) -ForegroundColor Yellow }
}

if($errors.Count -eq 0){
  Write-Host "`nAll packages valid!" -ForegroundColor Green
}

if($errors.Count -gt 0){ exit 1 }
