# Santa Anita Conecta

Plataforma escolar integral del Colegio Santa Anita: canal unico de solicitudes con ruta de aprobacion, gestion de iniciativas estudiantiles, muro de anuncios con confirmacion de lectura, calendario con capas y deteccion de choques, notificaciones, mensajeria, documentos, tableros de indicadores, auditoria y espacios con codigos QR para entrar a actividades (con registro de asistencia) y compartir anuncios o materiales.

Implementada 100% serverless sobre AWS (API HTTP + Lambda Python + DynamoDB + S3/CloudFront) con tres clientes: web React (SPA/PWA publicada por el deploy), web vanilla (`frontend/`, referencia sin frameworks) y app movil Expo/React Native.

## Arquitectura

```
                 ┌──────────────────────────────────────────────┐
 Navegador ──────►│ CloudFront (UrlFront)                        │
 (React PWA)      │   └── S3 CuboFront (web/dist compilada)      │
                 └───────────────┬──────────────────────────────┘
                                 │ fetch JSON (HTTPS)
                                 ▼
                 ┌──────────────────────────────────────────────┐
                 │ API Gateway HTTP API (ApiUrl)               │
                 │   50 rutas -> 50 funciones Lambda Python     │
                 └───────────────┬──────────────────────────────┘
                                 │  (JWT propio en Authorization)
                                 ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ DynamoDB (17 tablas, PITR en Usuarios/Solicitudes)          │
   │  Usuarios, Solicitudes, Pasos, Comentarios, Proyectos,      │
   │  Tareas, Bitacora, Anuncios, Lecturas, Eventos,             │
   │  Notificaciones, Mensajes, Documentos, Autorizaciones,      │
   │  Auditoria, Catalogos, Qrs                                  │
   └─────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ S3 CuboArchivos (adjuntos privados, URLs firmadas)          │
   │ EventBridge rate(1 hour) -> slaMonitor (alertas 50%/80%,     │
   │ escalamiento, inactividad de proyectos, caducar anuncios)    │
   └─────────────────────────────────────────────────────────────┘

 App movil (Expo / React Native) ──► misma API, token en AsyncStorage,
   escaneo de QR con expo-camera, tablero por rol con pestanas dinamicas.
```

- Cero dependencias pip: el JWT se firma con `hmac`, las claves se guardan con `pbkdf2_hmac` y DynamoDB se accede con `boto3` incluido en el runtime.
- Toda la API responde `{"ok": true, "datos": ...}` o `{"ok": false, "error": "..."}`.

## Codigos QR

- `POST /qrs {tipo, refId, expiraEn?}` crea un QR para un evento, anuncio o documento. El valor del QR es `sac://qr/<codigo>`.
- `GET /qrs/{codigo}` resuelve el QR: devuelve el QR, el destino (evento/anuncio/documento) y si el usuario ya registro su entrada.
- `POST /qrs/{codigo}/checkin` registra la entrada del usuario a la actividad (asistencia).
- En la web se generan desde Anuncios, Calendario y Documentos (Compartir con QR) y se listan en `#/qrs`; en el movil desde el hub QR (escanear con camara, mis codigos, generar nuevo).
- QRs demo del seed: `demo-feria` (evento con asistencia) y `demo-anuncio`.

## Requisitos

- Node.js 18 o superior
- AWS CLI v2 configurado (`aws configure` con credenciales validas)
- No se necesita Python local (las Lambdas usan el runtime `python3.12` de AWS)

### Cuentas AWS Academy (LabRole)

El proyecto sigue el mismo esquema que los demas proyectos de AWS Academy: `serverless.yml` empieza con `org: sebastianlizarraga` y usa el rol fijo `arn:aws:iam::<tu-cuenta>:role/LabRole` en `provider.iam.role` (en Academy no se pueden crear roles IAM). Los scripts de despliegue leen tu Account ID con `aws sts get-caller-identity` y lo escriben en esa linea antes de desplegar; tambien puedes editarlo a mano en `serverless.yml`.

Las credenciales de Academy caducan cada ~3 horas; si despliegas desde una instancia EC2 con el `LabInstanceProfile` adjunto, AWS renueva las credenciales automaticamente y no tienes que volver a configurarlas.

## Despliegue

Windows (PowerShell):

```powershell
.\deploy.ps1                # stage dev, region us-east-1
.\deploy.ps1 -Stage prod -Region us-east-1 -SinSeed
```

Linux / macOS:

```bash
chmod +x deploy.sh
./deploy.sh                  # stage dev
JWT_SECRET='clave-larga-y-secreta' ./deploy.sh prod
```

El script hace todo:

1. `npm install` (instala Serverless Framework v3 localmente)
2. `npx serverless deploy` (crea las 50 Lambdas, 17 tablas, buckets y CloudFront)
3. Lee las salidas de CloudFormation, escribe la URL del API en `web/src/config.js` y compila la web React (`npm run build` en `web/`)
4. `aws s3 sync` de `web/dist` al bucket web (tambien actualiza `frontend/js/config.js` para uso local de la version vanilla)
5. `npx serverless invoke -f seed` (usuarios y datos demo; es idempotente)

Al final imprime la URL publica del frontend y las cuentas demo.

### App movil (Expo)

La app movil no se publica con el deploy; se compila desde el repositorio:

```bash
cd mobile
npm install
# apunta al API desplegada: edita mobile/src/config.js (API_URL)
npx expo start           # desarrolla con Expo Go
npx expo run:android     # build nativa Android (o npx expo run:ios en macOS)
```

Notas de la v1 movil: no gestiona subida de adjuntos ni evidencias (se hacen desde la web); el cambio de clave y la edicion de usuarios/catalogos tambien se realizan desde la web.

Para produccion define `JWT_SECRET` como variable de entorno antes de desplegar; en dev se usa una clave de prueba embebida.

### Despliegue desde GitHub + EC2 Ubuntu (cuentas AWS Academy)

Si no quieres instalar AWS CLI en tu PC, usa una EC2 de tu cuenta (con el `LabInstanceProfile`/`LabRole` adjunto):

```bash
# 1. En tu PC: subir el codigo a GitHub
git init
git add .
git commit -m "Santa Anita Conecta"
git remote add origin https://github.com/TU-USUARIO/santa-anita-conecta.git
git push -u origin main
```

```bash
# 2. En la EC2 Ubuntu (22.04/24.04): preparar el entorno
sudo apt update
sudo apt install -y git unzip
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o aws.zip
unzip aws.zip && sudo ./aws/install
aws sts get-caller-identity        # debe mostrar tu cuenta y LabRole
```

```bash
# 3. Clonar y desplegar
git clone https://github.com/TU-USUARIO/santa-anita-conecta.git
cd santa-anita-conecta
chmod +x deploy.sh
./deploy.sh dev us-east-1
```

Al final imprime la URL de CloudFront. Si tu cuenta de Academy bloquea `cloudfront:CreateDistribution`, el despliegue fallara en ese recurso; en ese caso hay que servir la web con hosting estatico de S3 (avisa para ajustarlo).

## Cuentas demo

Todas con clave `demo1234`:

| Correo | Rol |
|---|---|
| omar@santaanita.edu.pe | estudiante (5° A Secundaria) |
| lucia@santaanita.edu.pe | docente / tutor |
| carlos@santaanita.edu.pe | coordinacion |
| laura@santaanita.edu.pe | direccion |
| rosa@santaanita.edu.pe | administracion |
| jorge@santaanita.edu.pe | padre de Omar |
| enrique@santaanita.edu.pe | promotor |
| ti@santaanita.edu.pe | administrador TI |

## Recorrido sugerido (guion de prueba)

1. Como `omar` (estudiante): crea una solicitud desde Inicio -> Nueva solicitud, elige tipo, completa el asistente y enviala.
2. Como `lucia` (docente): abre Por revisar, observa la solicitud con un comentario, luego aprueba con condiciones.
3. Como `omar`: responde la observacion; como `lucia` / `carlos`: aprueba los pasos hasta la aprobacion final. Si el tipo requiere padres, aparece EN_AUTORIZACION_PADRES.
4. Como `jorge` (padre): en Autorizaciones acepta con su firma digital; la solicitud queda aprobada y se publica en el calendario.
5. Como `omar`: pasa la solicitud a ejecucion (se crea el proyecto), gestiona el kanban, hitos, bitacora con evidencias y el legado.
6. Como `laura` (direccion): publica un anuncio segmentado, revisa indicadores y la auditoria.
7. Como `ti`: administra usuarios, catalogos y ve la auditoria completa.
8. Como `lucia` o `carlos`: desde Calendario o Anuncios genera un QR para una actividad o anuncio, y escanealo con la app movil (o abriendo `#/qr/demo-feria` en la web) para registrar la entrada con asistencia.

## Cobertura de la especificacion

| Modulo | Implementacion |
|---|---|
| Solicitudes y aprobaciones | 12 tipos configurables en Catalogos, ruta de max. 3 pasos, SLA por rol con alertas 50%/80% y escalamiento automatico (slaMonitor cada hora), delegacion, observaciones, aprobacion con condiciones, rechazo, borradores |
| Autorizacion de padres | Firma digital, bloqueo hasta decision, rechazo del apoderado que rechaza la actividad |
| Iniciativas y proyectos | Kanban de tareas, hitos con avance, bitacora con evidencias, legado (aprendizajes/contactos/documentos), union de estudiantes, alerta de inactividad 30 dias |
| Anuncios | Muro unico segmentado (nivel/grado/seccion/proyecto), prioridad y fijado, encuestas, confirmacion de lectura con tasa por anuncio, caducidad |
| Calendario | Capas (clases, evaluaciones, actividades, reuniones, feriados, institucional), deteccion de choques de ambiente y con evaluaciones, publicacion automatica al aprobar solicitudes |
| Notificaciones | Campana con conteo, enlaces directos, marcado de leidas, resumen por tipo |
| Mensajeria | Hilos por solicitud (SOL#id) y por proyecto (PROY#id) restringidos a participantes |
| Documentos | Plantillas institucionales, informes, evidencias, subida a S3 privado con URLs firmadas |
| Indicadores | Tiempos por rol, vencidas, estados, participacion por nivel, lectura de anuncios, proyectos en riesgo |
| Seguridad y auditoria | JWT, claves con sal, roles (9), consentimiento Ley 29733, exportacion de datos propios (ARCO), bitacora inmutable de acciones |
| Espacios QR | QRs para eventos (entrada con asistencia), anuncios y documentos; expiracion opcional, contador de usos y listado de asistencias para gestores |
| Accesibilidad y UX | Tema claro/oscuro, tamano de letra, navegacion movil inferior, PWA instalable, app movil nativa con escaner de QR |

## Estructura del proyecto

```
empresa/
  serverless.yml            # 50 funciones, 17 tablas, S3 + CloudFront
  deploy.ps1 / deploy.sh    # despliegue completo en un paso (backend + web)
  src/
    common/                 # fechas, util, db, auth, catalogo, sistema
    functions/              # auth, usuarios, solicitudes, comentarios,
                            # autorizaciones, proyectos, anuncios, eventos,
                            # notificaciones, mensajes, documentos, archivos,
                            # indicadores, auditoria, catalogos, qrs,
                            # sistema(seed+SLA)
  web/                      # SPA React (Vite) publicada por el deploy
    src/                    # config, api, util, contextos, componentes,
                            # App.jsx (rutas Hash) y paginas/ (22 vistas)
    public/                 # manifest.json, sw.js, icono.svg (PWA)
  mobile/                   # app Expo / React Native
    src/                    # config, api, util, contexto/Sesion, componentes,
                            # paginas/ (27 pantallas incl. escaner QR)
    app.json                # scheme sac, permiso CAMERA, package android
  frontend/                 # version vanilla sin frameworks (referencia)
    index.html              # shell + orden de carga
    manifest.json, sw.js, icono.svg   # PWA
    css/estilos.css         # tema claro/oscuro, tamano de letra, responsive
    js/                     # config, api, util, app (router y shell)
    js/vistas/              # 10 vistas (solicitudes, proyectos, anuncios, ...)
```

## Comandos utiles

```bash
npm run seed                          # recarga los datos demo
npm run logs                          # logs del monitor SLA
npx serverless deploy --stage dev     # redespliega solo el backend
npx serverless remove --stage dev     # elimina toda la pila
aws s3 sync web/dist s3://<bucket>    # resubir solo el frontend compilado
cd web && npm run build               # compilar la web React
cd mobile && npx expo start           # correr la app movil
```

## Notas operativas

- El monitor SLA corre cada hora: marca alertas 50%/80% del plazo, escala pasos vencidos al siguiente rol de la ruta, avisa proyectos inactivos y expira anuncios caducados.
- Los adjuntos viven en un bucket privado; el acceso siempre es mediante URLs firmadas de corta duracion.
- PITR (point-in-time recovery) esta activado en Usuarios y Solicitudes.
- El seed es idempotente: puede ejecutarse varias veces sin duplicar datos.
