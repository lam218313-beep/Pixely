# Pixely Partners — Arquitectura del sistema
> Documento técnico de referencia · Actualizado: octubre 2026 · Reemplaza la versión de marzo 2026

La versión para no técnicos está en `GUIA_EJECUTIVA.md`.

---

## 1. Visión general

Partners muestra y recoge las decisiones del cliente sobre su marca y su contenido. **No genera contenido**: lo escriben las **recetas** de Claude Desktop (repositorio `lam218313-beep/pixely_automatizaciones`), que leen y escriben directamente en Supabase. Partners lee esas tablas, las dibuja y guarda las aprobaciones del cliente.

```
 Claude Desktop (recetas, con supervisión humana)
        │  REST de Supabase con la service key
        ▼
 ┌──────────────────────────┐          ┌────────────────────┐
 │ Supabase                 │◄────────►│ Backend FastAPI     │
 │ Postgres + Auth + Storage│          │ (Railway)           │
 └──────────────────────────┘          └─────────▲──────────┘
        ▲                                         │ HTTPS + JWT de Supabase
        │ Metricool (vía recetas)                 │
                                       ┌──────────┴──────────────┐
                                       │ Vercel: partners.pixely.pe│
                                       │  /     escritorio (layout)│
                                       │  /m/   app móvil (app)    │
                                       └───────────────────────────┘
```

### Stack

| Capa | Tecnología |
|---|---|
| Escritorio (`frontend/layout`) | React 19, TypeScript 5.8, Vite 6, Tailwind 3, Recharts |
| App móvil (`frontend/app`) | React 19, React Router 7, Vite 8, Tailwind 4, TanStack Query, PWA, Capacitor 8 (tiendas en pausa) |
| Backend (`backend_v2`) | Python 3.11, FastAPI, supabase-py, reportlab (PDF de Mercado) |
| Datos | Supabase: Postgres, Auth (contraseña y código por correo) y Storage (bucket `content-pieces`) |
| Recetas | Claude Desktop + Apify + Metricool + Magnific + Canva |
| Despliegue | Vercel (proyecto `frontend`), Railway (backend, `Dockerfile` en la raíz) |

---

## 2. Frontend

### 2.1 Escritorio (`frontend/layout`)

Un solo `App.tsx` con vistas internas; el menú (`components/Sidebar.tsx`) está por zonas:

| Zona | Vista | Componente |
|---|---|---|
| Inicio | Inicio | `PartnersView.tsx` |
| Tu marca | Ficha | `InterviewView.tsx` (+ `entrevista/`) |
| | Voz de marca | `BrandView.tsx` (+ `brand-book/`) |
| | Mercado | `MercadoView.tsx` |
| | Estrategia | `StrategyView.tsx` (+ `estrategia/`) |
| Contenido | Planificación | `PlanificacionView.tsx` (+ `content/PlanCharts.tsx`, `content/PlanReviewUI.tsx`) |
| | Validación | `ValidacionView.tsx` (+ `content/DeliveryUI.tsx` para el equipo) |
| | Publicaciones | `PublicacionesView.tsx` (Próximas y Publicadas) |
| Equipo | Panel del equipo | `AdminPanel.tsx` (+ `admin/`, `admin/BrandSettingsForm.tsx`) |

- Todas las llamadas al backend pasan por `services/api.ts` (`VITE_API_URL`; cierra la sesión si el token expira).
- Sesión en `contexts/AuthContext.tsx`.
- `npm run build` construye el escritorio y, con `build-movil.mjs`, copia la app móvil a `dist/m`. `vercel.json` reescribe `/m/*` a la app. Un script en `index.html` manda los teléfonos a `/m/` (`?escritorio=1` / `?movil=1` lo cambian).

### 2.2 App móvil (`frontend/app`)

Solo para clientes (una cuenta sin `client_id` no entra). Cada pantalla tiene su URL:

| Ruta | Pantalla |
|---|---|
| `/` | Inicio: la tarea más urgente y lo próximo en salir |
| `/plan`, `/plan/mezcla`, `/plan/:id` | Ideas del mes con calendario, mezcla del mes, detalle de idea |
| `/validar`, `/validar/:id` | Mazo para aprobar (derecha) o pedir cambios (izquierda) |
| `/resultados`, `/resultados/publicadas`, `/resultados/:id` | Próximas, publicadas con resultados, detalle |
| `/marca`, `/marca/voz`, `/marca/estrategia`, `/marca/mercado`, `/marca/ficha` | Su marca |
| `/cuenta`, `/entrar`, `/entrar/codigo`, `/privacidad`, `/eliminar-cuenta` | Cuenta y acceso |

- `src/lib/api.ts` es la única puerta al backend; `src/lib/session.ts` guarda la sesión (localStorage en la web; Keychain/Keystore con Capacitor).
- Sistema visual "Noche" en `src/styles.css` y `src/ui/` (botones, chips de estado, tarjetas, barra de pestañas, panel inferior…). El catálogo de componentes, con su código, está en el repositorio `pixely_marca` (`componentes/`).
- Las decisiones se ven al instante y el servidor las confirma después; si falla, la pantalla vuelve atrás.
- Detalle en `frontend/app/README.md`.

---

## 3. Backend (`backend_v2`, FastAPI)

### 3.1 Routers

| Router | Endpoints principales | Uso |
|---|---|---|
| `auth` | `POST /token`, `GET /users/me`, `POST /auth/code/send`, `POST /auth/code/verify`, `POST /auth/refresh` | Contraseña (escritorio) y código de 6 dígitos por correo (app). `/auth/code/send` responde igual exista o no el correo |
| `clients` | `GET/POST /clients` (admin), `GET/PUT/DELETE /clients/{id}` | Marcas |
| `interview` | `GET/PUT /clients/{id}/interview` | Ficha |
| `brand` | `GET/PUT /brand/{id}`, `PATCH /brand/{id}/voice/review`, `PUT /brand/{id}/colors` | Voz de marca y su aprobación |
| `market` | `GET /market/{id}/study`, `GET /market/{id}/findings`, `GET /market/{id}/report.pdf` | Mercado y su PDF (`services/market_report.py`) |
| `strategy` | `GET /strategy/{id}`, `POST /strategy/sync`, `GET/PATCH /strategy/{id}/review` | Mapa de estrategia y su aprobación |
| `content` | `GET /content/{id}/pieces`, `PATCH .../pieces/{pieza}/plan-review`, `POST .../plan-review/approve-pending`, `PATCH .../pieces/{pieza}/review`, `POST .../pieces/{pieza}/finals`, `GET /content/{id}/results` | Toda la línea de contenido |
| `admin` | `GET /admin/overview`, `GET/POST /admin/brands`, `GET/PUT /admin/brands/{id}/settings`, `POST /admin/brands/{id}/users` | Panel del equipo (tablero "Hoy" en `services/admin_overview.py`) |
| `personas`, `tts` | `POST /clients/{id}/personas`, `POST /tts/generate` | **Sin uso** en las pantallas actuales (restos; candidatos a eliminar) |

### 3.2 Acceso

- `services/auth_service.py`: `get_current_user` valida el JWT con Supabase Auth y carga el perfil de `users` (`role`, `client_id`). `require_admin` exige `role = 'admin'`. `verify_client_access` deja a un cliente ver solo su `client_id`.
- **Acceso de desarrollo apagado:** el acceso `admin@pixely.pe` / token fijo solo funciona si el servidor tiene `DEV_BACKDOOR=true` (no debe tenerla en producción). El equipo entra con sus propias cuentas de Supabase Auth con `role = 'admin'` en `users`; se crean en Supabase → Authentication → Add user y luego se marcan como admin.

### 3.3 Configuración (`config.py`)

| Variable | Uso |
|---|---|
| `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY` | Base de datos, Auth y Storage |
| `GEMINI_API_KEY` | Solo para `personas` (sin uso) |
| `APIFY_TOKEN`, `OPENAI_API_KEY`, `COMFYUI_*`, `RUNPOD_*`, `IMAGE_PROVIDER` | Restos de versiones anteriores; Partners ya no los usa |

---

## 4. Base de datos (Supabase, proyecto `pixely_partners`)

### 4.1 Tablas en uso

| Tabla | Quién escribe | Contenido |
|---|---|---|
| `clients` | Panel del equipo | Marca: `id` (texto), `nombre`, `industry`, `is_active` |
| `users` | Panel del equipo | Perfil: `email`, `role` (`admin` / `client`), `client_id` |
| `brand_settings` | Panel del equipo | `plan` (Lite/Basic/Pro/Personalizado), `fotos_mes`, `reels_mes`, `redes`, `metricool_brand_id`, ciudad, rubro, contacto. **Fuente que leen las recetas** |
| `client_interviews` | Partners (Ficha) | `data` JSON de la Ficha (una fila por cliente) |
| `market_studies` | `01_mercado_estudio` | Estudio fundacional (único por cliente) |
| `market_findings` | `03_mercado_vigilancia` | Hallazgos con `cluster` (Problema/Identidad/Prueba), `confianza`, `fuente` |
| `competitor_benchmarks` | `01` y `03` | Promedios por competidor, red (`instagram`/`facebook`/`youtube`/`x`) y mes |
| `brand_identities` | `02_voz_de_marca` + aprobación del cliente | Voz de marca, `voz_estado` |
| `strategy_nodes` | `04_estrategia` | Árbol marca → objetivos → estrategias → conceptos |
| `strategy_reviews` | `04_estrategia` + cliente | Aprobación de la estrategia |
| `content_pieces` | `05_planificacion`, `03_generar`, `04_ensamblar`, equipo, cliente, `05_publicar` | Una fila por pieza; su estación sale de sus campos de estado |
| `piece_metrics` | `05_publicar` (modo resultados) | Resultados por pieza y red |

El contrato exacto de cada campo de `content_pieces` y `strategy_nodes` (quién lo escribe y qué estación muestra) está en el `README.md` de `pixely_automatizaciones`. **Cambiar una columna aquí obliga a revisar las recetas.**

### 4.2 Tablas sin uso (candidatas a eliminar)

`analysis_reports` (Análisis eliminado), `plan_reviews` (reemplazada por `content_pieces.plan_estado`), `brand_image_bank`, `brand_visual_dna`, `generated_images`, `generation_templates`, `studio_credits` (del antiguo Studio). Ningún código de Partners ni receta las usa.

### 4.3 Storage

Bucket `content-pieces`: `<client_id>/<id_pieza>/final-<marca de tiempo>-<n>.<ext>`. Solo Partners escribe ahí (al subir la pieza final, máx. 50 MB).

---

## 5. Flujo de una pieza

| Paso | Quién | Campos | Estación en Partners |
|---|---|---|---|
| Plan | `05_planificacion` | fila nueva, `plan_estado = 'Pendiente'` | Planificación · por revisar |
| Aprobación de la idea | Cliente | `plan_estado = 'Aprobada'` o `'Cambios solicitados'` | Planificación |
| Textos | `03_generar` | `copy_*`, `texto_laminas`, `estado_copy = 'Listo'` | Planificación · en producción |
| Guía de producción | `04_ensamblar` | `guia_produccion`, `estado_render = 'En postproducción'` | Validación · por entregar (solo equipo) |
| Entrega | Equipo, en Partners | `url_piezas_finales`, `url_imagen`, `generada_con_ia`, `estado_render = '✅ Postproducción'` | Validación · por revisar |
| Validación | Cliente | `estado_aprobacion = 'Aprobado'` o `'Cambios solicitados'` + `cambio_tipo` | Validación |
| Publicación | `05_publicar` | `estado_publicado = '✅ Programado Metricool'`, `publicada_at`, `metricool_uuid` | Publicaciones · próximas |
| Resultados | `05_publicar` | filas en `piece_metrics` | Publicaciones · publicadas |

**Ensayo general (7 oct 2026):** se recorrió este flujo completo en la base con un cliente ficticio dentro de una transacción revertida. Todas las escrituras cumplen las restricciones. Detalle en `docs/ensayo-general-2026-10-07.md`.

---

## 6. Despliegue

| Pieza | Dónde | Cómo |
|---|---|---|
| Escritorio + app móvil | Vercel, proyecto `frontend` (`frontend/layout`) | Automático al subir a `main` |
| Backend | Railway (`backend-production-04f8.up.railway.app`) | `Dockerfile` de la raíz, `uvicorn app.main:app` |
| Web comercial | Vercel, proyecto `pixely-web` (otro repositorio) | Automático |

`VITE_API_URL` va en `.env.production` de cada frontend (y puede sobrescribirse en Vercel).

### Pruebas automáticas

- `frontend/app`: Playwright en tamaño Android y iPhone contra un backend simulado (`e2e/mock-api.ts`). Corre en GitHub (`.github/workflows/web-movil.yml`).
- `app-android.yml` compila un APK de prueba en cada cambio.
- `frontend/layout`: pruebas Playwright en `e2e/` (capturas y vitrina).

---

## 7. Mantenimiento

- **Respaldos y llaves:** pendiente definir calendario (tarea F1-9). Las llaves de servicio no se comparten por chat ni se suben al repositorio.
- **Restos por limpiar:** routers `personas` y `tts`, `services/gemini_service.py`, variables de ComfyUI/RunPod/OpenAI y las tablas de 4.2.
