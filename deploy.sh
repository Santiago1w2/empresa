#!/usr/bin/env bash
set -euo pipefail

STAGE="${1:-dev}"
REGION="${2:-us-east-1}"
PILA="santa-anita-conecta-${STAGE}"
DIR="$(cd "$(dirname "$0")" && pwd)"

paso() { printf "\n\033[36m==> %s\033[0m\n" "$1"; }

paso "Verificando prerequisitos"
for comando in node npm npx aws; do
  command -v "$comando" >/dev/null 2>&1 || { echo "Falta '$comando' en el PATH. Instala Node.js LTS y AWS CLI v2."; exit 1; }
done
aws sts get-caller-identity >/dev/null || { echo "AWS CLI sin credenciales validas. Ejecuta 'aws configure'."; exit 1; }
echo "OK: node, npm, aws listos y credenciales validas."

paso "Instalando dependencias (serverless)"
if [ ! -d node_modules ]; then
  npm install
else
  echo "node_modules ya existe, se omite npm install."
fi

paso "Sincronizando Account ID en serverless.yml (AWS Academy)"
CUENTA=$(aws sts get-caller-identity --query Account --output text)
if ! printf '%s' "$CUENTA" | grep -Eq '^[0-9]{12}$'; then
  echo "No se pudo leer el Account ID con 'aws sts get-caller-identity'. Revisa las credenciales."
  exit 1
fi
sed -i -E "s#arn:aws:iam::[0-9]{12}:role/LabRole#arn:aws:iam::${CUENTA}:role/LabRole#" "$DIR/serverless.yml"
echo "Rol aplicado: arn:aws:iam::${CUENTA}:role/LabRole"

paso "Desplegando backend (pila ${PILA} en ${REGION})"
npx serverless deploy --stage "$STAGE" --region "$REGION"

paso "Leyendo salidas de CloudFormation"
API_URL=$(aws cloudformation describe-stacks --stack-name "$PILA" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
BUCKET=$(aws cloudformation describe-stacks --stack-name "$PILA" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='CuboFrontNombre'].OutputValue" --output text)
URL_FRONT=$(aws cloudformation describe-stacks --stack-name "$PILA" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='UrlFront'].OutputValue" --output text)

[ -n "$API_URL" ] && [ -n "$BUCKET" ] || { echo "No se pudieron leer ApiUrl y CuboFrontNombre de la pila $PILA"; exit 1; }
echo "API      : $API_URL"
echo "Bucket   : $BUCKET"
echo "Frontend : $URL_FRONT"

paso "Compilando la web React (web/) con la URL del API"
API_LIMPIA="${API_URL%/}"
printf 'export const apiBase = "%s";\n' "$API_LIMPIA" > "$DIR/web/src/config.js"
echo "web/src/config.js actualizado con $API_LIMPIA"
(
  cd "$DIR/web"
  [ -d node_modules ] || npm install
  npm run build
)
echo "web/dist generado."

paso "Configurando el frontend vanilla (referencia local) con la URL del API"
printf 'window.CONFIG = { apiBase: "%s" };\n' "$API_LIMPIA" > "$DIR/frontend/js/config.js"
echo "frontend/js/config.js actualizado con $API_LIMPIA"

paso "Subiendo la web compilada al bucket S3"
aws s3 sync "$DIR/web/dist" "s3://$BUCKET" --delete --region "$REGION"

paso "Cargando datos de demostracion (seed)"
npx serverless invoke -f seed --stage "$STAGE" --region "$REGION"

echo ""
echo "============================================"
echo " Despliegue completo"
echo "============================================"
echo " Frontend : $URL_FRONT"
echo " API      : $API_URL"
echo " Movil    : elige la URL del API en mobile/src/config.js y compila con Expo"
echo " Cuentas demo (clave demo1234):"
echo "   omar@santaanita.edu.pe    (estudiante)"
echo "   lucia@santaanita.edu.pe    (docente)"
echo "   carlos@santaanita.edu.pe  (coordinacion)"
echo "   laura@santaanita.edu.pe    (direccion)"
echo "   rosa@santaanita.edu.pe     (administracion)"
echo "   jorge@santaanita.edu.pe    (padre)"
echo "   enrique@santaanita.edu.pe  (promotor)"
echo "   ti@santaanita.edu.pe       (admin TI)"
echo ""
echo "Nota: para produccion define JWT_SECRET antes de desplegar:"
echo "  JWT_SECRET='una-clave-larga-y-secreta' ./deploy.sh prod"
