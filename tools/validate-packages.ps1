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

function Get-Origin([string]$url) {
  try {
    $u = [Uri]$url
    if($u.Scheme -and $u.Host){ return "$($u.Scheme)://$($u.Host)" }
    return $null
  } catch { return $null }
}

$apps = Get-ChildItem -LiteralPath $appsRoot -Directory
$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

foreach($app in $apps){
  $appName = $app.Name
  $appRoot = $app.FullName
  $webRoot = Join-Path $appRoot 'web'

  # ---- Manifest
  $manifestPath = Join-Path $appRoot 'ezpage.json'
  if(!(Test-Path $manifestPath)) { $errors.Add("[$appName] Missing ezpage.json"); continue }

  $manifest = $null
  try { $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json }
  catch { $errors.Add("[$appName] ezpage.json invalid JSON: $($_.Exception.Message)"); continue }

  $entry = [string]$manifest.entry
  if([string]::IsNullOrWhiteSpace($entry)) { $errors.Add("[$appName] ezpage.json.entry missing"); continue }
  if($entry.StartsWith('/')) { $errors.Add("[$appName] ezpage.json.entry starts with '/': $entry") }
  if($entry.Contains('..')) { $errors.Add("[$appName] ezpage.json.entry contains '..': $entry") }
  $entryPath = Join-Path $appRoot $entry
  if(!(Test-Path $entryPath)) { $errors.Add("[$appName] entry file not found: $entry") }

  $allowOutgoing = $false
  try { $allowOutgoing = [bool]$manifest.network.allowOutgoing } catch { $allowOutgoing = $false }

  # ---- Authorization
  $authPath = Join-Path $webRoot 'ezgalaxy-authorization.json'
  if(!(Test-Path $authPath)) { $errors.Add("[$appName] Missing web/ezgalaxy-authorization.json"); continue }

  $auth = $null
  try { $auth = Get-Content -LiteralPath $authPath -Raw | ConvertFrom-Json }
  catch { $errors.Add("[$appName] ezgalaxy-authorization.json invalid JSON: $($_.Exception.Message)"); continue }

  if([string]$auth.packageId -ne $appName) { $warnings.Add("[$appName] authorization.packageId='$($auth.packageId)' differs from folder name") }

  $capNetwork = $null
  if($auth.capabilities){
    $capNetwork = $auth.capabilities | Where-Object { $_.name -eq 'network.outgoing' } | Select-Object -First 1
  }

  if($allowOutgoing){
    if(-not $capNetwork){ $warnings.Add("[$appName] allowOutgoing=true but authorization has no 'network.outgoing' capability") }
    elseif(-not [bool]$capNetwork.enabled){ $warnings.Add("[$appName] allowOutgoing=true but authorization.network.outgoing.enabled is false") }
  } else {
    if($capNetwork -and [bool]$capNetwork.enabled){ $warnings.Add("[$appName] allowOutgoing=false but authorization.network.outgoing.enabled is true") }
  }

  # ---- Scan web files (excluding vendor + node_modules)
  $scanFiles = @()
  if(Test-Path $webRoot){
    $scanFiles = Get-ChildItem -LiteralPath $webRoot -Recurse -File -Include *.html,*.js,*.css,*.json |
      Where-Object { $_.FullName -notmatch '\\vendor\\' -and $_.FullName -notmatch '\\node_modules\\' }
  }

  # Forbidden shared refs
  foreach($f in $scanFiles){
    $text = Get-Content -LiteralPath $f.FullName -Raw
    if($text.IndexOf('/shared/', [StringComparison]::OrdinalIgnoreCase) -ge 0 -or $text.IndexOf('../shared', [StringComparison]::OrdinalIgnoreCase) -ge 0){
      $errors.Add("[$appName] Forbidden shared reference in: $($f.FullName.Substring($Root.Length+1))")
    }
  }

  # External URL usage vs allowOutgoing
  # NOTE: We only treat URLs that look like runtime endpoints (not arbitrary docs/licenses).
  $origins = New-Object System.Collections.Generic.HashSet[string]
  foreach($f in $scanFiles){
    $text = Get-Content -LiteralPath $f.FullName -Raw

    if($f.Extension -eq '.js'){
      foreach($m in [regex]::Matches($text, '(?i)fetch\s*\(\s*"(https?://[^"\s\)>]+)"')){
        $origin = Get-Origin $m.Groups[1].Value
        if($origin){ [void]$origins.Add($origin) }
      }

      foreach($m in [regex]::Matches($text, '(?i)fetch\s*\(\s*''(https?://[^''\s\)>]+)''') ){
        $origin = Get-Origin $m.Groups[1].Value
        if($origin){ [void]$origins.Add($origin) }
      }

      foreach($m in [regex]::Matches($text, '(?i)(?:const|let|var)\s+\w*(?:URL|CDN|ENDPOINT|ORIGIN|HOST)\w*\s*=\s*"(https?://[^"\s\)>]+)"')){
        $origin = Get-Origin $m.Groups[1].Value
        if($origin){ [void]$origins.Add($origin) }
      }

      foreach($m in [regex]::Matches($text, '(?i)(?:const|let|var)\s+\w*(?:URL|CDN|ENDPOINT|ORIGIN|HOST)\w*\s*=\s*''(https?://[^''\s\)>]+)''') ){
        $origin = Get-Origin $m.Groups[1].Value
        if($origin){ [void]$origins.Add($origin) }
      }
    }
  }

  if($origins.Count -gt 0 -and -not $allowOutgoing){
    $errors.Add("[$appName] External URLs found but allowOutgoing=false: $([string]::Join(', ', ($origins | Sort-Object)))")
  }

  if($allowOutgoing -and $capNetwork){
    $allowedOrigins = @()
    try { $allowedOrigins = @($capNetwork.details.allowedOrigins) } catch { $allowedOrigins = @() }

    if(($capNetwork.justification -as [string]) -match 'TODO'){
      $warnings.Add("[$appName] authorization.network.outgoing.justification contains TODO")
    }

    foreach($o in ($origins | Sort-Object)){
      if($allowedOrigins -notcontains $o){
        $warnings.Add("[$appName] External origin not declared in authorization.allowedOrigins: $o")
      }
    }

    if($origins.Count -gt 0 -and $allowedOrigins.Count -eq 0){
      $warnings.Add("[$appName] allowOutgoing=true and external URLs used, but authorization.allowedOrigins is empty")
    }
  }

  # Entry HTML asset existence checks (src/href)
  if(Test-Path $entryPath){
    $html = Get-Content -LiteralPath $entryPath -Raw

    $attrMatches = [regex]::Matches($html, '(?i)(?:src|href)\s*=\s*"([^"]+)"')
    foreach($m in $attrMatches){
      $ref = $m.Groups[1].Value.Trim()
      if($ref -eq '' -or $ref.StartsWith('#')){ continue }
      if($ref.StartsWith('/')){ $errors.Add("[$appName] Absolute-path asset reference in entry HTML: $ref"); continue }
      if($ref -match '^(?i)(https?:)?//'){ continue }
      if($ref -match '^(?i)data:'){ continue }

      if($ref.Contains('..')){ $warnings.Add("[$appName] Entry HTML contains '..' in asset ref (review): $ref") }

      $resolved = Join-Path (Split-Path -Parent $entryPath) $ref
      if(!(Test-Path $resolved)){
        $errors.Add("[$appName] Missing asset referenced by entry HTML: $ref")
      }
    }

    # External URLs used in entry HTML (script/link/img)
    $extAttrMatches = @()
    $extAttrMatches += [regex]::Matches($html, '(?i)(?:src|href)\s*=\s*"(https?://[^"]+)"')
      $extAttrMatches += [regex]::Matches($html, '(?i)(?:src|href)\s*=\s*''(https?://[^'']+)''')
    foreach($m in $extAttrMatches){
      $origin = Get-Origin $m.Groups[1].Value
      if($origin){ [void]$origins.Add($origin) }
    }
  }
}

Write-Host "--- Static validation report ---"
Write-Host ("Apps checked: {0}" -f $apps.Count)
Write-Host ("Errors: {0} | Warnings: {1}" -f $errors.Count, $warnings.Count)

if($errors.Count -gt 0){
  Write-Host "\nERRORS:"
  $errors | Sort-Object | ForEach-Object { Write-Host ("- {0}" -f $_) }
}

if($warnings.Count -gt 0){
  Write-Host "\nWARNINGS:"
  $warnings | Sort-Object | ForEach-Object { Write-Host ("- {0}" -f $_) }
}

if($errors.Count -gt 0){ exit 1 }
