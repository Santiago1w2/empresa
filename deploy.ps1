param(
  [string]$Stage = "dev",
  [string]$Region = "us-east-1",
  [switch]$SinSeed
)

$ErrorActionPreference = "Stop"
$pila = "santa-anita-conecta-$Stage"

function Paso($mensaje) {
  Write-Host ""
  Write-Host "==> $mensaje" -ForegroundColor Cyan
}

Paso "Verificando prerequisitos"
foreach ($comando in @("node", "npm", "npx", "aws")) {
  if (-not (Get-Command $comando -ErrorAction SilentlyContinue)) {
    Write-Error "Falta '$comando' en el PATH. Instala Node.js LTS y AWS CLI v2 antes de continuar."
  }
}
aws sts get-caller-identity | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "AWS CLI no tiene credenciales validas. Ejecuta 'aws configure' primero."
}
Write-Host "OK: node, npm, aws listos y credenciales validas."

Paso "Instalando dependencias (serverless)"
if (-not (Test-Path "node_modules")) {
  npm install
  if ($LASTEXITCODE -ne 0) { Write-Error "npm install fallo" }
} else {
  Write-Host "node_modules ya existe, se omite npm install."
}

Paso "Sincronizando Account ID en serverless.yml (AWS Academy)"
$preferenciaAnterior = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$cuenta = aws sts get-caller-identity --query Account --output text 2>$null
$ErrorActionPreference = $preferenciaAnterior
if ($cuenta -notmatch '^\d{12}$') {
  Write-Error "No se pudo leer el Account ID con 'aws sts get-caller-identity'. Revisa las credenciales."
}
$rutaServerless = Join-Path $PSScriptRoot "serverless.yml"
$contenidoServerless = [System.IO.File]::ReadAllText($rutaServerless)
$contenidoServerless = $contenidoServerless -replace 'arn:aws:iam::\d{12}:role/LabRole', "arn:aws:iam::$cuenta`:role/LabRole"
[System.IO.File]::WriteAllText($rutaServerless, $contenidoServerless, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Rol aplicado: arn:aws:iam::$cuenta`:role/LabRole"

Paso "Desplegando backend (pila $pila en $Region)"
npx serverless deploy --stage $Stage --region $Region
if ($LASTEXITCODE -ne 0) { Write-Error "El despliegue de serverless fallo" }

Paso "Leyendo salidas de CloudFormation"
$salidasBrutas = aws cloudformation describe-stacks --stack-name $pila --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
$salidas = @{}
foreach ($s in $salidasBrutas) { $salidas[$s.OutputKey] = $s.OutputValue }

$apiUrl = $salidas["ApiUrl"]
$bucket = $salidas["CuboFrontNombre"]
$urlFront = $salidas["UrlFront"]

if (-not $apiUrl -or -not $bucket) {
  Write-Error "No se pudieron leer ApiUrl y CuboFrontNombre de la pila $pila"
}
Write-Host "API      : $apiUrl"
Write-Host "Bucket   : $bucket"
Write-Host "Frontend : $urlFront"

Paso "Compilando la web React (web/) con la URL del API"
$apiLimpia = $apiUrl.TrimEnd("/")
$rutaConfigWeb = Join-Path $PSScriptRoot "web\src\config.js"
[System.IO.File]::WriteAllText($rutaConfigWeb, "export const apiBase = `"$apiLimpia`";`n", (New-Object System.Text.UTF8Encoding($false)))
Write-Host "web/src/config.js actualizado con $apiLimpia"
Push-Location (Join-Path $PSScriptRoot "web")
if (-not (Test-Path "node_modules")) {
  npm install
  if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "npm install de web/ fallo" }
}
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "La compilacion de web/ fallo" }
Pop-Location
Write-Host "web/dist generado."

Paso "Sincronizando frontend vanilla (referencia local) con la URL del API"
$rutaConfig = Join-Path $PSScriptRoot "frontend\js\config.js"
[System.IO.File]::WriteAllText($rutaConfig, "window.CONFIG = { apiBase: `"$apiLimpia`" };", (New-Object System.Text.UTF8Encoding($false)))
Write-Host "frontend/js/config.js actualizado con $apiLimpia"

Paso "Subiendo la web compilada al bucket S3"
aws s3 sync (Join-Path $PSScriptRoot "web\dist") "s3://$bucket" --delete --region $Region
if ($LASTEXITCODE -ne 0) { Write-Error "La sincronizacion con S3 fallo" }

Paso "Cargando datos de demostracion (seed)"
if ($SinSeed) {
  Write-Host "Se omite el seed (-SinSeed)."
} else {
  npx serverless invoke -f seed --stage $Stage --region $Region
  if ($LASTEXITCODE -ne 0) { Write-Error "El seed fallo" }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Despliegue completo" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host " Frontend : $urlFront"
Write-Host " API      : $apiUrl"
Write-Host " Movil    : elige la URL del API en mobile/src/config.js y compila con Expo"
Write-Host " Cuentas demo (clave demo1234):"
Write-Host "   omar@santaanita.edu.pe    (estudiante)"
Write-Host "   lucia@santaanita.edu.pe    (docente)"
Write-Host "   carlos@santaanita.edu.pe  (coordinacion)"
Write-Host "   laura@santaanita.edu.pe    (direccion)"
Write-Host "   rosa@santaanita.edu.pe     (administracion)"
Write-Host "   jorge@santaanita.edu.pe    (padre)"
Write-Host "   enrique@santaanita.edu.pe  (promotor)"
Write-Host "   ti@santaanita.edu.pe       (admin TI)"
Write-Host ""
Write-Host "Nota: para produccion define JWT_SECRET antes de desplegar:"
Write-Host '  $env:JWT_SECRET="una-clave-larga-y-secreta"; .\deploy.ps1 -Stage prod'
