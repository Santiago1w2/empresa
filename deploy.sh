
#!/usr/bin/env bash
set -euo pipefail

STAGE="${1:-dev}"
REGION="${2:-us-east-1}"
PILA="santa-anita-conecta-${STAGE}"
DIR="$(cd "$(dirname "$0")" && pwd)"

paso() {
  printf "\n\033[36m==> %s\033[0m\n" "$1"
}

paso "Verificando prerequisitos"

for comando in node npm npx aws; do
  command -v "$comando" >/dev/null 2>&1 || {
    echo "Falta '$comando' en el PATH."
    exit 1
  }
done

aws sts get-caller-identity >/dev/null || {
  echo "AWS CLI sin credenciales validas."
  exit 1
}

echo "OK: prerequisitos y credenciales validas."

paso "Instalando dependencias"

cd "$DIR"

if [ ! -d node_modules ]; then
  npm install
else
  echo "node_modules ya existe."
fi

paso "Sincronizando Account ID en serverless.yml"

CUENTA=$(aws sts get-caller-identity \
  --query Account --output text)

if ! printf '%s' "$CUENTA" | grep -Eq '^[0-9]{12}$'; then
  echo "No se pudo obtener el Account ID."
  exit 1
fi

sed -i -E \
"s#arn:aws:iam::[0-9]{12}:role/LabRole#arn:aws:iam::${CUENTA}:role/LabRole#" \
"$DIR/serverless.yml"

echo "Rol aplicado para la cuenta $CUENTA."

paso "Desplegando backend"

npx serverless deploy \
  --stage "$STAGE" \
  --region "$REGION"

paso "Leyendo salidas de CloudFormation"

API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$PILA" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "$PILA" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='CuboArchivosNombre'].OutputValue" \
  --output text)

if [ -z "$API_URL" ] || [ "$API_URL" = "None" ]; then
  echo "No se pudo obtener ApiUrl."
  exit 1
fi

echo "API: $API_URL"
echo "Bucket de archivos: $BUCKET"

paso "Cargando datos de demostracion (seed)"

npx serverless invoke \
  -f seed \
  --stage "$STAGE" \
  --region "$REGION"

echo ""
echo "============================================"
echo " Despliegue del backend completado"
echo "============================================"
echo " API: $API_URL"
echo " Bucket de archivos: $BUCKET"
echo ""
echo "Frontend: desplegar por separado en AWS Amplify."
echo "Movil: configurar la URL del API en mobile/src/config.js."
echo ""
echo "Cuentas demo (clave demo1234):"
echo "omar@santaanita.edu.pe (estudiante)"
echo "lucia@santaanita.edu.pe (docente)"
echo "carlos@santaanita.edu.pe (coordinacion)"
echo "laura@santaanita.edu.pe (direccion)"
echo "rosa@santaanita.edu.pe (administracion)"
echo "jorge@santaanita.edu.pe (padre)"
echo "enrique@santaanita.edu.pe (promotor)"
echo "ti@santaanita.edu.pe (admin TI)"
echo ""
echo "Nota: para produccion define JWT_SECRET antes de desplegar."
