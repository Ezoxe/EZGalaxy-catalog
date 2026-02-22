# ─── EZGalaxy Docker Migration Script ───
# Generates: ezcontainer.json, Dockerfile, docker-compose.yml for each app
# Copies backend template for apps needing persistence
# Removes: ezpage.json, web/ezgalaxy-authorization.json

$root = Split-Path $PSScriptRoot -Parent
$appsDir = Join-Path $root "packages\apps"
$backendTemplate = Join-Path $root "shared\docker-backend"

# ─── Static apps (no SDK, no persistence) ───
$staticApps = @(
    "com.ezgalaxy.example",
    "test",
    "code-game",
    "kappy-studio",
    "world-capitals",
    "network-sim",
    "com.ezgalaxy.sopor"
)

# ─── Port assignments (10000-10999) ───
$portMap = @{}
$port = 10000

# Get all app dirs sorted
$allApps = Get-ChildItem -Path $appsDir -Directory | Sort-Object Name
foreach ($appDir in $allApps) {
    $portMap[$appDir.Name] = $port
    $port++
}

Write-Host "=== EZGalaxy Docker Migration ===" -ForegroundColor Cyan
Write-Host "Apps directory: $appsDir"
Write-Host "Total apps: $($allApps.Count)"
Write-Host ""

foreach ($appDir in $allApps) {
    $appId = $appDir.Name
    $appPath = $appDir.FullName
    $isStatic = $staticApps -contains $appId
    $assignedPort = $portMap[$appId]

    Write-Host "[$appId] " -NoNewline
    if ($isStatic) {
        Write-Host "STATIC (nginx:alpine)" -ForegroundColor Green
    } else {
        Write-Host "BACKEND (node:20-alpine + SQLite)" -ForegroundColor Yellow
    }

    # ─── Read existing ezpage.json for metadata ───
    $ezpagePath = Join-Path $appPath "ezpage.json"
    $meta = @{}
    if (Test-Path $ezpagePath) {
        $meta = Get-Content $ezpagePath -Raw | ConvertFrom-Json
    }

    $title = if ($meta.title) { $meta.title } else { $appId }
    $function_ = if ($meta.function) { $meta.function } else { "" }
    $version = if ($meta.version) { $meta.version } else { "1.0.0" }
    $createdAt = if ($meta.createdAt) { $meta.createdAt } else { "2026-02-22" }
    $author = if ($meta.author) { $meta.author } else { "EZGalaxy" }
    $containerPort = if ($isStatic) { 80 } else { 3000 }

    # ─── Create ezcontainer.json ───
    $container = @{
        schemaVersion = 2
        id = $appId
        title = $title
        function = $function_
        version = $version
        createdAt = $createdAt
        author = $author
        docker = @{
            dockerfile = "Dockerfile"
            port = $containerPort
            env = @{}
            volumes = @()
            healthcheck = @{
                endpoint = if ($isStatic) { "/" } else { "/health" }
                interval = 30
                timeout = 10
            }
        }
    }

    # Add volumes for backend apps
    if (-not $isStatic) {
        $container.docker.volumes = @("/app/data")
        $container.docker.env = @{
            NODE_ENV = "production"
            DB_PATH = "/app/data/database.sqlite"
        }
    }

    # Special: finvest has mobile/platform fields
    if ($appId -eq "com.ezgalaxy.finvest" -and $meta.platform) {
        $container["platform"] = $meta.platform
        $container["mobile"] = @{
            requiresApiKey = $true
            type = "pwa"
            installUrl = "web/install.html"
            android = @{
                packageName = "com.ezgalaxy.finvest"
                downloadUrl = "web/install.html"
                minSdkVersion = 24
            }
            ios = @{
                bundleId = "com.ezgalaxy.finvest"
                downloadUrl = "web/install.html"
                minOsVersion = "15.0"
            }
        }
    }

    $containerJson = $container | ConvertTo-Json -Depth 10
    Set-Content -Path (Join-Path $appPath "ezcontainer.json") -Value $containerJson -Encoding UTF8
    Write-Host "  + ezcontainer.json" -ForegroundColor DarkGray

    # ─── Create Dockerfile ───
    if ($isStatic) {
        $dockerfile = @"
FROM nginx:alpine
RUN apk add --no-cache curl
COPY web/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
"@
    } else {
        $dockerfile = @"
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN mkdir -p /app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
"@
    }

    Set-Content -Path (Join-Path $appPath "Dockerfile") -Value $dockerfile -Encoding UTF8 -NoNewline
    Write-Host "  + Dockerfile" -ForegroundColor DarkGray

    # ─── Create docker-compose.yml ───
    if ($isStatic) {
        $compose = @"
services:
  app:
    build: .
    container_name: ezgalaxy-$appId
    ports:
      - "${assignedPort}:80"
    restart: unless-stopped
"@
    } else {
        $compose = @"
services:
  app:
    build: .
    container_name: ezgalaxy-$appId
    ports:
      - "${assignedPort}:3000"
    volumes:
      - app-data:/app/data
    environment:
      - NODE_ENV=production
      - DB_PATH=/app/data/database.sqlite
    restart: unless-stopped

volumes:
  app-data:
"@
    }

    Set-Content -Path (Join-Path $appPath "docker-compose.yml") -Value $compose -Encoding UTF8 -NoNewline
    Write-Host "  + docker-compose.yml (port $assignedPort)" -ForegroundColor DarkGray

    # ─── Copy backend template for non-static apps ───
    if (-not $isStatic) {
        Copy-Item (Join-Path $backendTemplate "server.js") -Destination $appPath -Force
        Copy-Item (Join-Path $backendTemplate "ezgalaxy-sdk.js") -Destination $appPath -Force
        Copy-Item (Join-Path $backendTemplate "package.json") -Destination $appPath -Force
        Write-Host "  + server.js, ezgalaxy-sdk.js, package.json (backend)" -ForegroundColor DarkGray
    }

    # ─── Remove old files ───
    if (Test-Path $ezpagePath) {
        Remove-Item $ezpagePath -Force
        Write-Host "  - ezpage.json (removed)" -ForegroundColor DarkRed
    }

    $authPath = Join-Path $appPath "web\ezgalaxy-authorization.json"
    if (Test-Path $authPath) {
        Remove-Item $authPath -Force
        Write-Host "  - web/ezgalaxy-authorization.json (removed)" -ForegroundColor DarkRed
    }

    Write-Host ""
}

Write-Host "=== Migration complete ===" -ForegroundColor Cyan
Write-Host "Created files for $($allApps.Count) apps."
Write-Host ""
Write-Host "Port assignments:" -ForegroundColor Yellow
foreach ($appDir in $allApps) {
    Write-Host "  $($appDir.Name): $($portMap[$appDir.Name])"
}
