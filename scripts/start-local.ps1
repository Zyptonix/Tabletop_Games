$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

function Read-EnvMap([string]$Path) {
  $map = @{}
  if (Test-Path $Path) {
    foreach ($line in Get-Content -LiteralPath $Path) {
      if ($line -match '^\s*([^#=\s]+)\s*=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
          $value = $value.Substring(1, $value.Length - 2)
        }
        $map[$key] = $value
      }
    }
  }
  return $map
}
function Prompt-Value([string]$Label, [string]$Default = "", [bool]$Required = $true) {
  while ($true) {
    $suffix = if ($Default) { " [$Default]" } else { "" }
    $value = Read-Host "$Label$suffix"
    if ([string]::IsNullOrWhiteSpace($value)) { $value = $Default }
    if (-not $Required -or -not [string]::IsNullOrWhiteSpace($value)) { return $value.Trim() }
    Write-Host "Please enter a value." -ForegroundColor Yellow
  }
}
function New-Secret { return ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')) }
function Read-Secret([string]$Label) {
  $secure = Read-Host $Label -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
function Set-EnvValue([hashtable]$Map, [string]$Key, [string]$Value) { $Map[$Key] = $Value }
function Invoke-Pnpm([string[]]$Arguments, [string]$Label) {
  Write-Host "`n==> $Label" -ForegroundColor Cyan
  & corepack pnpm @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE. Fix the reported issue and run this script again." }
}

Write-Host ""
Write-Host "  TABLETOP ARENA :: LOCAL LAN SETUP" -ForegroundColor Green
Write-Host "  ---------------------------------" -ForegroundColor DarkGreen
Write-Host "  No Docker. No tunnel. PostgreSQL runs as a normal local service." -ForegroundColor Gray
Write-Host "  This PC hosts the game; colleagues open the LAN URL in a browser." -ForegroundColor Gray
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js was not found on PATH. Install Node.js 20+ and open a new terminal." }
$nodeVersion = (& node -p "Number(process.versions.node.split('.')[0])").Trim()
if ([int]$nodeVersion -lt 20) { throw "Node.js 20+ is required (detected major version $nodeVersion)." }
if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) { throw "Corepack was not found. Reinstall a current Node.js LTS build with Corepack enabled." }

$envPath = Join-Path $Root ".env"
$envMap = Read-EnvMap $envPath

# Find a real private IPv4 on the default-route adapter, then show the other usable choices.
$privatePattern = '^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$'
$ipItems = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
  $_.IPAddress -match $privatePattern -and $_.InterfaceAlias -notmatch 'WSL|Docker|Hyper-V|vEthernet|Loopback' -and $_.AddressState -eq 'Preferred'
} | Sort-Object InterfaceMetric, InterfaceAlias -Unique)
$defaultIp = $null
try {
  $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop | Sort-Object RouteMetric | Select-Object -First 1
  $candidate = $ipItems | Where-Object InterfaceIndex -eq $route.InterfaceIndex | Select-Object -First 1
  if ($candidate) { $defaultIp = $candidate.IPAddress }
} catch {}
if (-not $defaultIp -and $ipItems.Count -gt 0) { $defaultIp = $ipItems[0].IPAddress }
if (-not $defaultIp) { $defaultIp = '192.168.1.10' }

Write-Host "Detected LAN addresses:" -ForegroundColor Cyan
if ($ipItems.Count -eq 0) { Write-Host "  No private IPv4 address auto-detected; enter the address assigned by your LAN/router." -ForegroundColor Yellow }
foreach ($item in $ipItems) { Write-Host ("  {0,-16} {1}" -f $item.IPAddress, $item.InterfaceAlias) }
$lanIp = Prompt-Value "Host PC LAN IPv4 (the address colleagues will use)" $defaultIp $true
$parsedIp = $null
if (-not [System.Net.IPAddress]::TryParse($lanIp, [ref]$parsedIp) -or $parsedIp.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or $lanIp -eq '127.0.0.1') {
  throw "Enter a real LAN IPv4 such as 192.168.1.25, not localhost or 127.0.0.1."
}

$existingDb = $envMap['DATABASE_URL']
$dbMatch = $null
if ($existingDb -match '^postgres(?:ql)?://(?<user>[^:/@]+)(?::(?<pass>[^@]*))?@(?<host>[^:/?]+)(?::(?<port>\d+))?/(?<db>[^?]+)') {
  $dbMatch = @{
    User = [Uri]::UnescapeDataString($matches['user'])
    Password = [Uri]::UnescapeDataString([string]$matches['pass'])
    Host = $matches['host']
    Port = if ($matches['port']) { $matches['port'] } else { '5432' }
    Database = [Uri]::UnescapeDataString($matches['db'])
  }
}
$reuseDefault = if ($dbMatch -and $dbMatch.Host -notin @('postgres', 'host.docker.internal')) { 'Y' } else { 'N' }
Write-Host "`nPostgreSQL settings" -ForegroundColor Cyan
if ($dbMatch) { Write-Host ("Current .env database host: {0}:{1}/{2}" -f $dbMatch.Host,$dbMatch.Port,$dbMatch.Database) -ForegroundColor Gray }
$reuseDb = Prompt-Value "Reuse DATABASE_URL from .env? (Y/n)" $reuseDefault $true
if ($reuseDb -match '^(?i)(y|yes)$' -and $existingDb) {
  $databaseUrl = $existingDb
  if ($databaseUrl -match '@(postgres|host\.docker\.internal)(:\d+)?/') { throw "The current DATABASE_URL points to Docker networking. Answer N and enter your native PostgreSQL details." }
} else {
  $dbHostDefault = if ($dbMatch -and $dbMatch.Host -notin @('postgres','host.docker.internal')) { $dbMatch.Host } else { '127.0.0.1' }
  $dbPortDefault = if ($dbMatch) { $dbMatch.Port } else { '5432' }
  $dbNameDefault = if ($dbMatch) { $dbMatch.Database } else { 'tabletop_arena' }
  $dbUserDefault = if ($dbMatch) { $dbMatch.User } else { 'tabletop' }
  $dbHost = Prompt-Value "PostgreSQL host (usually 127.0.0.1 on this PC)" $dbHostDefault $true
  $dbPort = Prompt-Value "PostgreSQL port" $dbPortDefault $true
  $dbName = Prompt-Value "Database name (must already exist)" $dbNameDefault $true
  $dbUser = Prompt-Value "Database user" $dbUserDefault $true
  $passwordDefault = if ($dbMatch) { $dbMatch.Password } else { '' }
  if ($passwordDefault) {
    $reusePassword = Prompt-Value "Reuse the existing PostgreSQL password from .env? (Y/n)" 'Y' $true
    if ($reusePassword -match '^(?i)(y|yes)$') { $dbPassword = $passwordDefault }
    else { $dbPassword = Read-Secret "New PostgreSQL password (leave blank if not required)" }
  } else {
    $dbPassword = Read-Secret "PostgreSQL password (leave blank if your local setup does not require one)"
  }
  $userEscaped = [Uri]::EscapeDataString($dbUser)
  $passwordEscaped = [Uri]::EscapeDataString($dbPassword)
  $nameEscaped = [Uri]::EscapeDataString($dbName)
  $databaseUrl = "postgresql://${userEscaped}:${passwordEscaped}@${dbHost}:${dbPort}/${nameEscaped}?schema=public"
}

if (-not $envMap['SESSION_SECRET'] -or $envMap['SESSION_SECRET'].Length -lt 20) { $envMap['SESSION_SECRET'] = New-Secret }
if (-not $envMap['JWT_SECRET'] -or $envMap['JWT_SECRET'].Length -lt 20) { $envMap['JWT_SECRET'] = New-Secret }
Set-EnvValue $envMap 'DATABASE_URL' $databaseUrl
Set-EnvValue $envMap 'SESSION_SECRET' $envMap['SESSION_SECRET']
Set-EnvValue $envMap 'JWT_SECRET' $envMap['JWT_SECRET']
Set-EnvValue $envMap 'PUBLIC_APP_URL' "http://${lanIp}:8080"
Set-EnvValue $envMap 'SOCKET_PATH' '/socket.io'
Set-EnvValue $envMap 'NODE_ENV' 'development'
Set-EnvValue $envMap 'SERVER_PORT' '4000'
Set-EnvValue $envMap 'WEB_PORT' '3000'
Set-EnvValue $envMap 'PROXY_PORT' '8080'
Set-EnvValue $envMap 'DEV_PROXY_PORT' '8080'
Set-EnvValue $envMap 'PROXY_HOST' '0.0.0.0'
Set-EnvValue $envMap 'UPSTREAM_HOST' '127.0.0.1'
# Ensure browser requests and sockets follow the URL the colleague opened, not a stale remote/local override.
$envMap.Remove('NEXT_PUBLIC_API_BASE_URL') | Out-Null
$envMap.Remove('NEXT_PUBLIC_SOCKET_URL') | Out-Null
$envMap.Remove('NEXT_PUBLIC_SOCKET_PATH') | Out-Null
$lines = foreach ($key in @($envMap.Keys | Sort-Object)) { "$key=$($envMap[$key])" }
Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8
foreach ($key in $envMap.Keys) { [Environment]::SetEnvironmentVariable($key, [string]$envMap[$key], 'Process') }
[Environment]::SetEnvironmentVariable('NEXT_PUBLIC_API_BASE_URL', '/api', 'Process')
[Environment]::SetEnvironmentVariable('NEXT_PUBLIC_SOCKET_URL', $null, 'Process')
[Environment]::SetEnvironmentVariable('NEXT_PUBLIC_SOCKET_PATH', '/socket.io', 'Process')

Write-Host "`nConfiguration saved to .env (secrets stay on this PC)." -ForegroundColor Green
if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
  Invoke-Pnpm @('install') 'Install workspace dependencies'
}
Invoke-Pnpm @('db:generate') 'Generate Prisma client'
Invoke-Pnpm @('db:push') 'Apply Prisma schema to the configured PostgreSQL database'

$wantFirewall = Prompt-Value "Request admin permission to allow LAN clients on TCP 8080? (Y/n)" 'Y' $true
if ($wantFirewall -match '^(?i)(y|yes)$') {
  $firewallCommand = "if (-not (Get-NetFirewallRule -DisplayName 'Tabletop Arena LAN' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'Tabletop Arena LAN' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Profile Private -RemoteAddress LocalSubnet | Out-Null }; Write-Host 'Private LAN firewall rule is ready.' -ForegroundColor Green"
  try {
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-Command',$firewallCommand)
  } catch {
    Write-Host "Could not add the firewall rule automatically. Open PowerShell as Administrator and run:" -ForegroundColor Yellow
    Write-Host "New-NetFirewallRule -DisplayName 'Tabletop Arena LAN' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Profile Private -RemoteAddress LocalSubnet" -ForegroundColor Yellow
  }
}

Write-Host "`nStarting the app. Keep this terminal open; press Ctrl+C to stop the servers." -ForegroundColor Green
Write-Host "Host URL: http://${lanIp}:8080" -ForegroundColor Green
Write-Host "Share that exact URL with colleagues on the same office LAN/Wi-Fi." -ForegroundColor Green
Write-Host "If the database step failed, ensure PostgreSQL is running and the database/user already exist, then rerun this script." -ForegroundColor Gray
& node (Join-Path $Root 'scripts/dev-orchestrator.mjs') --no-tunnel --no-kill-ports
if ($LASTEXITCODE -ne 0) { throw "The local services exited with code $LASTEXITCODE. See logs/dev and the first error above." }
