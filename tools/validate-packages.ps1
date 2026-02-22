# ─── EZGalaxy Docker Package Validator ───
# Validates ezcontainer.json, Dockerfile, docker-compose.yml for each app

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
  $webRoot = Join-Path $appRoot 'web'

  # ---- ezcontainer.json (manifest)
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

  # Validate schemaVersion
  if($manifest.schemaVersion -ne 2) {
    $errors.Add("[$appName] ezcontainer.json.schemaVersion must be 2 (got: $($manifest.schemaVersion))")
  }

  # Validate required fields
  if([string]::IsNullOrWhiteSpace($manifest.id)) { $errors.Add("[$appName] ezcontainer.json.id missing") }
  if([string]::IsNullOrWhiteSpace($manifest.title)) { $errors.Add("[$appName] ezcontainer.json.title missing") }
  if(-not $manifest.docker) { $errors.Add("[$appName] ezcontainer.json.docker section missing"); continue }

  $dockerPort = $manifest.docker.port
  if(-not $dockerPort) { $errors.Add("[$appName] ezcontainer.json.docker.port missing") }

  # ---- Dockerfile
  $dockerfilePath = Join-Path $appRoot 'Dockerfile'
  if(!(Test-Path $dockerfilePath)) {
    $errors.Add("[$appName] Missing Dockerfile")
    continue
  }

  $dockerfileContent = Get-Content -LiteralPath $dockerfilePath -Raw

  # Check HEALTHCHECK
  if($dockerfileContent -notmatch 'HEALTHCHECK') {
    $errors.Add("[$appName] Dockerfile is missing HEALTHCHECK instruction")
  }

  # Check EXPOSE matches docker.port
  $exposeMatch = [regex]::Match($dockerfileContent, 'EXPOSE\s+(\d+)')
  if($exposeMatch.Success) {
    $exposedPort = [int]$exposeMatch.Groups[1].Value
    if($exposedPort -ne $dockerPort) {
      $errors.Add("[$appName] Dockerfile EXPOSE $exposedPort != ezcontainer.json docker.port $dockerPort")
    }
  } else {
    $warnings.Add("[$appName] Dockerfile does not have an EXPOSE instruction")
  }

  # Check volumes: if declared, Dockerfile should mkdir
  $volumes = @()
  try { $volumes = @($manifest.docker.volumes) } catch { $volumes = @() }
  if($volumes.Count -gt 0) {
    foreach($vol in $volumes) {
      if($dockerfileContent -notmatch [regex]::Escape($vol)) {
        $warnings.Add("[$appName] Volume '$vol' declared but not referenced in Dockerfile")
      }
    }
  }

  # ---- docker-compose.yml
  $composePath = Join-Path $appRoot 'docker-compose.yml'
  if(!(Test-Path $composePath)) {
    $errors.Add("[$appName] Missing docker-compose.yml")
  }

  # ---- web/index.html
  $indexPath = Join-Path $webRoot 'index.html'
  if(!(Test-Path $indexPath)) {
    $errors.Add("[$appName] Missing web/index.html")
  }

  # ---- Backend apps: check server.js and package.json
  if($dockerPort -eq 3000) {
    $serverPath = Join-Path $appRoot 'server.js'
    if(!(Test-Path $serverPath)) {
      $errors.Add("[$appName] Backend app (port 3000) missing server.js")
    }

    $pkgPath = Join-Path $appRoot 'package.json'
    if(!(Test-Path $pkgPath)) {
      $errors.Add("[$appName] Backend app (port 3000) missing package.json")
    }

    $sdkPath = Join-Path $appRoot 'ezgalaxy-sdk.js'
    if(!(Test-Path $sdkPath)) {
      $errors.Add("[$appName] Backend app (port 3000) missing ezgalaxy-sdk.js (SDK shim)")
    }
  }

  # ---- Check for old files that should have been removed
  $oldEzpage = Join-Path $appRoot 'ezpage.json'
  if(Test-Path $oldEzpage) {
    $warnings.Add("[$appName] Old ezpage.json still present (should be removed)")
  }

  $oldAuth = Join-Path $webRoot 'ezgalaxy-authorization.json'
  if(Test-Path $oldAuth) {
    $warnings.Add("[$appName] Old web/ezgalaxy-authorization.json still present (should be removed)")
  }

  # ---- Scan web files: forbid shared refs
  $scanFiles = @()
  if(Test-Path $webRoot){
    $scanFiles = Get-ChildItem -LiteralPath $webRoot -Recurse -File -Include *.html,*.js,*.css |
      Where-Object { $_.FullName -notmatch '\\vendor\\' -and $_.FullName -notmatch '\\node_modules\\' }
  }

  foreach($f in $scanFiles){
    $text = Get-Content -LiteralPath $f.FullName -Raw
    if($text.IndexOf('/shared/', [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
       $text.IndexOf('../shared', [StringComparison]::OrdinalIgnoreCase) -ge 0){
      $errors.Add("[$appName] Forbidden shared reference in: $($f.FullName.Substring($Root.Length+1))")
    }
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
Write-Host "--- Docker Package Validation Report ---"
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
