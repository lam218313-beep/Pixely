# Pixely Partners — Arquitectura del Sistema
> Documento técnico de referencia · Última actualización: Marzo 2026

> **Nota (octubre 2026) — partes de este documento ya no aplican.**
> - **Plan mensual:** existe una sola vez, en la tabla `content_pieces`, que escribe `/02_crearcronograma_V2` desde Claude Desktop (repo `pixely_automatizaciones`). Los pasos del cliente son una sola línea de producción sobre esa tabla: Planificación (`PlanificacionView.tsx`, piezas en producción) → Validación → Publicación → Repositorio (archivo de lo publicado). Se eliminaron `PlanningView.tsx`, `KanbanBoard.tsx`, `TasksView.tsx`, los routers `/planning` y `/tasks` y `services/content_generator.py`; la tabla `tasks` también se borró. Beneficios se eliminó.
> - **Menú por zonas:** Inicio · Tu marca (Ficha, Voz de marca, Mercado, Estrategia) · Contenido (Planificación, Validación, Publicación) · Archivo (Repositorio). La entrevista es ahora la **Ficha** (`InterviewView.tsx`), editable, con aviso cuando Voz de marca o Estrategia quedan desactualizadas. El Manual de marca pasó a ser **Voz de marca** (`brand-book/`), que el cliente aprueba. Ya no la genera el backend: la escribe la receta `/02_voz_de_marca` (Claude Desktop) en `brand_identities`; se eliminaron `generate_brand_identity` y `POST /api/admin/brands/{id}/manual`.
> - **Análisis eliminado** (el Lab Q1–Q10 sobre comentarios de Instagram y su Wiki): con pocas interacciones no era confiable. Se borraron `LabView.tsx`, `components/lab/`, `Wiki*.tsx`, `hooks/useAnalysis.tsx`, los routers `/semantic` (`analysis.py`) y `/pipeline`, y los servicios `aggregator.py` y `apify_service.py` (Partners ya no usa Apify; lo usan las automatizaciones). Las secciones de este documento sobre Lab, Pipeline, Analysis, Aggregator, Apify y el flujo 5.1 ya no aplican. La tabla `analysis_reports` queda en la base de datos sin uso.
> - **Mercado** (`MercadoView.tsx`) lleva ahora los gráficos, todos con datos reales de `market_studies` (de `/01_mercado_estudio`) y `market_findings` (de `/03_mercado_vigilancia`).
> - **Estrategia** ya no la genera el backend: la escribe la receta `/04_estrategia` (Claude Desktop) en `strategy_nodes`, con la Ficha + Mercado + Voz de marca como evidencia y el visto bueno del equipo. Partners la muestra (mapa con detalle al hacer clic y lista explicada) y el cliente la aprueba o pide cambios (tabla `strategy_reviews`, `GET/PATCH /strategy/{client_id}/review`). Se eliminaron el generador, `strategy_context.py`, `strategy_tree.py` y los endpoints de Admin `strategy/seed` y `reset-strategy`.

---

## 1. Visión General

**Pixely Partners** es una plataforma SaaS de marketing inteligente que automatiza el ciclo completo de análisis de audiencia, generación de estrategias y producción de contenido visual para marcas. El sistema ingesta datos de redes sociales (Instagram), los clasifica con IA, genera insights accionables, y produce imágenes publicitarias listas para publicar.

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Python 3.11 + FastAPI |
| **Base de datos** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **Autenticación** | Supabase Auth |
| **IA — Clasificación/Generación de texto** | OpenAI GPT-5-mini (via SDK compatible) |
| **IA — Generación de imágenes** | Google Gemini NanoBanana (Flash/Pro) + DALL-E 3 (legacy) |
| **Scraping** | Apify (Instagram Scraper) |
| **Deployment** | Docker / Railway (backend), Vercel (frontend) |

### Diagrama de Alto Nivel

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐ │
│  │  Login   │ │   Lab    │ │ Strategy │ │ Studio │ │ Admin Panel  │ │
│  │         │ │ (Q1-Q10) │ │  (Canvas) │ │(Images)│ │(Brands/Users)│ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └──────┬───────┘ │
│       └────────────┴────────────┴───────────┴─────────────┘         │
│                              API calls                               │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS
┌──────────────────────────────────┴───────────────────────────────────┐
│                     BACKEND v2 (FastAPI)                              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     14 API Routers                              │  │
│  │  auth · clients · pipeline · analysis · interview · strategy  │  │
│  │  brand · tasks · planning · images · studio · admin · tts     │  │
│  │  personas                                                      │  │
│  └────────────────────────┬───────────────────────────────────────┘  │
│  ┌────────────────────────┴───────────────────────────────────────┐  │
│  │                     10 Services                                │  │
│  │  database · gemini_service · aggregator · apify_service       │  │
│  │  content_generator · context_builder · image_generator        │  │
│  │  nanobanana_service_v2 · comfyui_service                      │  │
│  └────────────┬──────────────────┬────────────────┬──────────────┘  │
└───────────────┼──────────────────┼────────────────┼──────────────────┘
                │                  │                │
    ┌───────────▼──────┐  ┌───────▼───────┐  ┌────▼──────────┐
    │    Supabase       │  │  OpenAI / GPT  │  │  Gemini API   │
    │  (DB + Storage    │  │  (Classify +   │  │  (NanoBanana   │
    │   + Auth)         │  │   Generate)    │  │   Image Gen)   │
    └──────────────────┘  └───────────────┘  └───────────────┘
                │
    ┌───────────▼──────┐
    │     Apify         │
    │  (Instagram       │
    │   Scraping)       │
    └──────────────────┘
```

---

## 2. Frontend

### 2.1 Estructura de Archivos

```
frontend/
├── layout/
│   ├── App.tsx                    # Root con routing, auth, lazy loading
│   ├── index.tsx                  # Entry point (ReactDOM.render)
│   ├── index.html                 # HTML template con meta tags
│   ├── index.css                  # Variables CSS globales
│   ├── vite.config.ts             # Config Vite (proxy, alias)
│   ├── tailwind.config.js         # Tailwind con custom tokens
│   ├── package.json               # Deps: react, recharts, lucide, framer-motion
│   │
│   ├── components/                # 45 componentes + 3 subdirs
│   │   ├── LoginComponents.tsx    # Login form + workflow visual + animations
│   │   ├── Sidebar.tsx            # Navegación lateral principal
│   │   ├── Header.tsx             # Header dinámico por vista
│   │   ├── LabView.tsx            # Dashboard de análisis (Q1-Q10)
│   │   ├── CardLabsQ1-Q8*.tsx     # Cards individuales de métricas
│   │   ├── AdminPanel.tsx         # Panel admin (brands, users, módulos)
│   │   ├── InterviewView.tsx      # Vista wrapper de entrevista
│   │   ├── BrandView.tsx          # Vista de identidad de marca
│   │   ├── StrategyView.tsx       # Canvas de árbol estratégico
│   │   ├── PlanningView.tsx       # Planificación mensual de contenido
│   │   ├── KanbanBoard.tsx        # Tablero Kanban de tareas
│   │   ├── ValidationKanban.tsx   # Validación de contenido
│   │   ├── ImageGenerationModal.tsx # Modal de generación de imágenes
│   │   ├── ImageGeneratorPage.tsx # Página completa de generación
│   │   ├── TutorialModal.tsx      # Tutorial interactivo onboarding
│   │   ├── studio/                # 13 componentes del Image Studio
│   │   ├── lab/                   # 11 componentes auxiliares del Lab
│   │   └── dashboard_cards/       # 8 cards del dashboard
│   │
│   ├── entrevista/                # 18 archivos — Flujo de entrevista multi-step
│   ├── estrategia/                # 18 archivos — Canvas React Flow
│   ├── brand-book/                # 18 archivos — Generador de brand book
│   ├── tutorial/                  # 24 archivos — Tutorial interactivo
│   ├── validacion/                # 19 archivos — Flujo de validación
│   │
│   ├── contexts/                  # React Context providers
│   │   └── AuthContext, etc.
│   ├── hooks/                     # Custom React hooks
│   ├── services/                  # API client (fetch wrapper)
│   ├── styles/                    # CSS módulos adicionales
│   └── utils/                     # Funciones utilitarias
│
├── .env.local                     # Variables de entorno (API URL)
└── diap01_v2.mp3, diapo_01.mp3   # Audio assets
```

### 2.2 Flujo de Navegación

El `App.tsx` maneja el estado global con `AuthContext` y renderiza vistas con lazy loading:

```
Login → [Autenticación Supabase] → AppContent
                                        │
                    ┌───────────────────┤
                    ▼                   ▼
              [role: admin]      [role: analyst]
              AdminPanel          Sidebar + Vista
                                        │
              ┌─────────┬──────────┬────┴────┬──────────┬──────────┐
              ▼         ▼          ▼         ▼          ▼          ▼
            Lab    Interview   Strategy  Planning    Studio   Validation
          (Q1-Q10)  (Multi-   (React    (Mensual)  (Image   (Kanban
           Cards    step      Flow      AI Gen)     Gen)    Aprobación)
                    form)     Canvas)
```

### 2.3 Vistas Principales

| Vista | Componente | Descripción |
|-------|-----------|-------------|
| **Lab** | `LabView.tsx` + `CardLabsQ1-Q8` | Dashboard con 10 métricas de análisis social. Usa Recharts para visualizaciones (radar, barras, burbujas, timeline). |
| **Entrevista** | `entrevista/` (18 archivos) | Flujo multi-step: Info del negocio → Audiencia → Producto → Competidores. Guarda en Supabase vía `/clients/{id}/interview`. |
| **Brand Book** | `brand-book/` + `BrandView.tsx` | Identidad de marca generada por IA: misión, visión, valores, arquetipos, colores, tipografía. |
| **Estrategia** | `estrategia/` + `StrategyView.tsx` | Canvas visual con React Flow. Árbol jerárquico: Objetivo → Estrategias → Conceptos. Cada nodo tiene metadata (formato, frecuencia, tags). |
| **Planning** | `PlanningView.tsx` | Generación mensual de calendario de contenido por IA basado en la estrategia. Cuotas configurables (fotos/videos/stories). |
| **Studio** | `studio/` (13 componentes) | Wizard de generación de imágenes: Brand Visual DNA → Image Bank → Selección de task → Generación con NanoBanana. |
| **Admin** | `AdminPanel.tsx` (48KB) | CRUD de marcas y usuarios. Gestión de planes. Ejecución de análisis. Generación de estrategias. |
| **Validación** | `validacion/` + `ValidationKanban.tsx` | Tablero de aprobación de contenido generado. |

---

## 3. Backend (FastAPI)

### 3.1 Estructura de Archivos

```
backend_v2/
├── app/
│   ├── main.py            # FastAPI app, middleware CORS, router mounting
│   ├── config.py          # Settings via pydantic-settings (.env)
│   ├── models/
│   │   └── schemas.py     # Pydantic schemas compartidos
│   ├── routers/           # 14 archivos de endpoints
│   └── services/          # 10 archivos de lógica de negocio
│       └── workflows/     # ComfyUI workflow JSONs (3 templates)
├── migrations/            # 7 SQL migrations
├── Dockerfile             # Python 3.11-slim
├── Procfile               # Railway: uvicorn
├── requirements.txt       # Dependencias de producción
└── docker-compose.yml     # Desarrollo local
```

### 3.2 Configuración (`config.py`)

Variables de entorno manejadas con `pydantic-settings`:

| Variable | Servicio | Uso |
|----------|----------|-----|
| `SUPABASE_URL` | Supabase | URL del proyecto |
| `SUPABASE_KEY` | Supabase | Clave pública (anon) |
| `SUPABASE_SERVICE_KEY` | Supabase | Clave de servicio (admin) |
| `APIFY_TOKEN` | Apify | Scraping de Instagram |
| `GEMINI_API_KEY` | Google | Generación de imágenes (NanoBanana) |
| `OPENAI_API_KEY` | OpenAI | Clasificación, interpretaciones, generación de planes |
| `COMFYUI_HOST` / `RUNPOD_*` | ComfyUI | Generación de imágenes (legacy) |
| `IMAGE_PROVIDER` | Config | `"dalle"` o `"comfyui"` |
| `PORT` | Server | Puerto del servidor (default: 8000) |

### 3.3 Routers (API Endpoints)

#### Auth (`/token`, `/users/me`)
- Login via Supabase Auth (email + password)
- Devuelve JWT access_token, role, plan, tenant_id
- Dev backdoor: `admin@pixely.pe` / `admin`

#### Clients (`/clients`)
- CRUD de fichas de clientes (marcas)
- `GET /clients` — Lista de clientes
- `POST /clients` — Crear cliente
- `PUT /clients/{id}` — Actualizar
- `DELETE /clients/{id}` — Eliminar

#### Pipeline (`/pipeline`)
- **Orquestador completo** del flujo de análisis:
  1. `POST /pipeline/start` → Inicia background task
  2. Scraping de Instagram (Apify)
  3. Normalización de comentarios
  4. Clasificación por lotes (GPT-5-mini)
  5. Agregación matemática (Q1-Q10)
  6. Generación de interpretaciones (IA)
  7. Generación de tareas sugeridas
  8. Guarda resultados en Supabase
  9. `GET /pipeline/status/{id}` → Progreso
  10. `GET /pipeline/result/{id}` → Resultados

#### Analysis (`/analysis`)
- `GET /analysis/{client_id}` — Datos de análisis almacenados

#### Interview (`/clients/{id}/interview`)
- `PUT` — Guardar datos de entrevista (JSON + archivo opcional)
- `GET` — Recuperar datos de entrevista
- Soporta Excel, PDF, y texto plano como adjuntos

#### Strategy (`/strategy`)
- `GET /{client_id}` — Obtener árbol de estrategia (nodos con coordenadas X,Y)
- `POST /sync` — Guardar estado completo del canvas (delete + re-insert)
- Nodos: `main` (objetivo) → `secondary` (estrategia) → `concept` (concepto de contenido)

#### Brand (`/brand`)
- `GET /{client_id}` — Obtener identidad de marca (misión, visión, valores, colores, tipografía)
- `PUT /{client_id}` — Actualizar identidad de marca
- Incluye arquetipos de marca y tone traits

#### Tasks (`/tasks`)
- CRUD de tareas de contenido por cliente

#### Planning (`/planning`)
- `POST /generate-month` — Genera plan mensual con IA basado en estrategia + cuotas
- `POST /save-month` — Guarda plan confirmado
- `GET /{client_id}/history` — Historial de planificación

#### Images (`/images`)
- `POST /generate` — Genera imagen con DALL-E 3 + herencia de contexto
- `GET /task/{id}` — Imágenes de una tarea
- `GET /client/{id}` — Galería de imágenes del cliente
- `POST /{id}/select` — Seleccionar imagen final para tarea
- `GET /usage/{client_id}` — Estadísticas de uso

#### Studio (`/studio`)
- **Wizard completo** de generación de imágenes con NanoBanana:
  - Brand Visual DNA (colores, estilo, keywords)
  - Image Bank (upload, favoritos, categorización)
  - Pending Tasks (tareas que necesitan imagen)
  - Templates y archetypes configurables
  - Opciones de cámara (ángulo, lente, perspectiva)
  - Lighting presets, mood options, aspect ratios
  - Style analysis desde imágenes de referencia
  - Generación con Gemini (Flash / Pro)

#### Admin (`/admin`)
- CRUD de marcas con planes de acceso
- Gestión de usuarios dentro de marcas
- Estado de módulos por marca
- Ejecución directa de análisis
- Generación/reset de estrategias con IA
- Generación de Brand Manual con IA

#### Personas (`/personas`)
- Generación de personas ideales/anti basadas en datos de audiencia

#### TTS (`/tts`)
- Text-to-speech para contenido

### 3.4 Services (Lógica de Negocio)

#### `database.py` — SupabaseService
Capa de acceso a datos. Singleton `db`. Usa dos clientes:
- **client** (anon key): Operaciones públicas con RLS
- **admin_client** (service key): Operaciones admin sin RLS

**Entidades gestionadas:**

| Tabla | Operaciones |
|-------|------------|
| `clients` | CRUD, listado, status |
| `users` | CRUD, búsqueda por email/ID, plan management |
| `reports` | Crear, actualizar status, obtener último |
| `tasks` | Crear batch, obtener por cliente |
| `interviews` | Guardar/obtener por cliente |
| `strategy_nodes` | Obtener/sync (delete all + re-insert) |
| `brand_identity` | Obtener/actualizar |

#### `apify_service.py` — Instagram Scraping
- Usa Apify actor `apify/instagram-scraper`
- `scrape_instagram_posts()` — Posts de un perfil
- `scrape_instagram_comments()` — Comentarios de un post
- `scrape_instagram_profile_with_posts_and_comments()` — Flujo completo
- `normalize_comment_for_classification()` — Normaliza formato para IA

#### `gemini_service.py` — Motor de IA (Texto)
Usa `_call_gemini()` como función unificada (OpenAI SDK apuntando a GPT-5-mini):

| Función | Input | Output |
|---------|-------|--------|
| `classify_comments_batch()` | Lista de comentarios + contexto de marca | Clasificación: emoción (Plutchik), personalidad (Aaker), sentimiento, topic, subtopic |
| `generate_interpretations()` | Datos Q1-Q10 agregados + contexto | Interpretaciones narrativas por pregunta |
| `generate_brand_identity()` | Datos de entrevista | Identidad de marca: misión, visión, valores, colores, tipografía, arquetipos |
| `generate_strategy_playbook()` | Análisis + entrevista + marca | Árbol estratégico: objetivos → estrategias → conceptos con metadata |

#### `aggregator.py` — Motor de Agregación (Q1-Q10)
Procesamiento matemático puro (sin IA) de datos clasificados:

| Métrica | Función | Descripción |
|---------|---------|-------------|
| **Q1** | `aggregate_q1_emotions()` | Distribución emocional (Plutchik wheel) |
| **Q2** | `aggregate_q2_personality()` | Personalidad de marca (Aaker model) |
| **Q3** | `aggregate_q3_topics()` | Distribución de temas con sentimiento |
| **Q4** | `aggregate_q4_narrative_frames()` | Marcos narrativos (Positivo/Negativo/Aspiracional) |
| **Q5** | `aggregate_q5_influencers()` | Top influencers por frecuencia |
| **Q6** | `aggregate_q6_opportunities()` | Matriz de oportunidades (temas negativos) |
| **Q7** | `aggregate_q7_sentiment()` | Distribución detallada de sentimiento + subjetividad |
| **Q8** | `aggregate_q8_temporal()` | Evolución temporal semanal |
| **Q9** | `aggregate_q9_recommendations()` | Recomendaciones priorizadas |
| **Q10** | `aggregate_q10_executive()` | Resumen ejecutivo con KPIs |

También incluye:
- `build_frontend_compatible_json()` — Construye el JSON completo Q1-Q10
- `generate_suggested_tasks()` — 16 tareas sugeridas distribuidas en 4 semanas
- `convert_tree_to_nodes()` — Convierte árbol IA a nodos con coordenadas X,Y para canvas

#### `content_generator.py` — Generación de Planes Mensuales
- `generate_monthly_plan()` — Genera plan de contenido con IA basado en estrategia + cuotas
- Hereda contexto completo: estrategia, conceptos, guidelines
- Output: lista de tareas con fecha, formato, título, descripción, hooks, hashtags
- `save_monthly_plan()` — Persiste a DB

#### `context_builder.py` — ContextBuilderService
Construye bloques de contexto para el Studio Wizard:
- Extrae: entrevista, manual de marca, datos de análisis
- Formatea en bloques digestibles para el generador de imágenes

#### `image_generator.py` — ImageGenerationService (DALL-E 3)
- Generación con OpenAI DALL-E 3
- Herencia de contexto: entrevista → estrategia → tarea → concepto
- Almacenamiento en Supabase Storage
- Presets de estilo: realistic, illustration, 3d_render, minimalist, vintage
- Aspect ratios: 1:1, 16:9, 9:16, 4:3

#### `nanobanana_service_v2.py` — NanoBananaServiceV2 (Principal)
Motor principal de generación de imágenes con Google Gemini:

**Modelos:**
- `gemini-2.5-flash-image` — Rápido, alto volumen
- `gemini-2.0-flash-exp` — Alta calidad

**Archetypes de imagen:**
| Archetype | Uso |
|-----------|-----|
| `product` | Fotografía de producto studio |
| `lifestyle` | Estilo de vida aspiracional |
| `promotional` | Material promocional |
| `editorial` | Storytelling editorial |

**Features:**
- Templates con prompts parametrizados
- Camera settings (ángulo, shot, lente, perspectiva)
- Lighting presets (studio, natural, golden_hour, dramatic, etc.)
- Mood options (energetic, calm, bold, elegant, warm)
- Inferencia automática de archetype
- Style analysis de imágenes de referencia
- Almacenamiento en Supabase Storage

#### `comfyui_service.py` — ComfyUIService (Legacy)
Integración con ComfyUI en RunPod para generación avanzada:
- Workflows JSON parametrizables
- Formatos: product_hero, service, experience, promotional, ad_impact
- Upload/download de imágenes
- Polling de resultados

---

## 4. Base de Datos (Supabase / PostgreSQL)

### 4.1 Esquema de Tablas Principales

```
┌─────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     clients      │──────<│      users        │       │    interviews     │
│─────────────────│       │──────────────────│       │──────────────────│
│ id (PK)         │       │ id (PK)          │       │ id (PK)          │
│ nombre          │       │ email            │       │ client_id (FK)   │
│ plan            │       │ full_name        │       │ data (JSONB)     │
│ instagram_url   │       │ client_id (FK)   │       │ file_url         │
│ created_at      │       │ role             │       │ created_at       │
└────────┬────────┘       │ plan             │       └──────────────────┘
         │                │ plan_expires_at  │
         │                └──────────────────┘
         │
         ├──────────< reports
         │             │ id · client_id · status · result (JSONB) · audit_log
         │
         ├──────────< raw_items
         │             │ Comentarios clasificados con metadata IA
         │
         ├──────────< strategy_nodes
         │             │ id · client_id · type · label · description
         │             │ parent_id · x · y · suggested_format · suggested_frequency · tags
         │
         ├──────────< tasks
         │             │ id · client_id · concept_id · title · description
         │             │ date · format · month_group · status · selected_image_id
         │
         ├──────────< brand_identity
         │             │ client_id · mission · vision · values · tone_traits
         │             │ archetype · colors · typography
         │
         ├──────────< brand_visual_dna
         │             │ client_id · color_primary/secondary/accent
         │             │ brand_essence · visual_keywords · always_exclude
         │
         ├──────────< brand_image_bank
         │             │ client_id · storage_path · category · tags · is_favorite
         │
         ├──────────< generated_images
         │             │ id · client_id · task_id · concept_id
         │             │ base_prompt · final_prompt · storage_path
         │             │ style_preset · aspect_ratio · cost_usd
         │             │ generation_time_ms · is_selected
         │
         └──────────< generation_templates
                       │ Template configurations para NanoBanana
```

### 4.2 Migraciones

| # | Archivo | Descripción |
|---|---------|-------------|
| 001 | `create_generated_images_table.sql` | Tabla de imágenes generadas |
| 002 | `create_brand_visual_dna.sql` | Visual DNA de marca |
| 003 | `create_brand_image_bank.sql` | Banco de imágenes de marca |
| 004 | `create_generation_templates.sql` | Templates de generación |
| 005 | `update_generated_images_for_nanobanana.sql` | Actualización para NanoBanana |
| - | `COMBINED_NANOBANANA_MIGRATIONS.sql` | Migración combinada |
| - | `create_plans_table.sql` | Tabla de planes de suscripción |

### 4.3 Storage Buckets

| Bucket | Contenido |
|--------|-----------|
| `generated-images` | Imágenes generadas por IA |
| `brand-images` | Banco de imágenes de referencia |
| `interview-files` | Archivos adjuntos de entrevistas |

---

## 5. Flujos de Datos Principales

### 5.1 Flujo de Análisis (Pipeline Completo)

```
[Admin inicia análisis]
        │
        ▼
1. POST /pipeline/start
   ├── Crea report (status: PROCESSING)
   └── Inicia BackgroundTask
        │
        ▼
2. Scraping (Apify)
   ├── Scrape posts del perfil Instagram
   └── Scrape comentarios de cada post
        │
        ▼
3. Normalización
   └── normalize_comment_for_classification()
        │
        ▼
4. Clasificación (GPT-5-mini, lotes de 50)
   ├── Emoción (Plutchik)
   ├── Personalidad (Aaker)
   ├── Sentimiento (-1 a 1)
   ├── Topic / Subtopic
   └── Engagement level
        │
        ▼
5. Agregación Matemática
   └── build_frontend_compatible_json()
       ├── Q1: Distribución emocional
       ├── Q2: Personalidad de marca
       ├── Q3: Topics con sentimiento
       ├── Q4: Marcos narrativos
       ├── Q5: Top influencers
       ├── Q6: Matriz de oportunidades
       ├── Q7: Sentimiento detallado
       ├── Q8: Evolución temporal
       ├── Q9: Recomendaciones
       └── Q10: Resumen ejecutivo
        │
        ▼
6. Interpretaciones (IA)
   └── Narrativas humanas para cada Q
        │
        ▼
7. Tareas Sugeridas
   └── 16 tasks distribuidas en 4 semanas
        │
        ▼
8. Persistencia
   └── report.result = {Q1..Q10} → Supabase
```

### 5.2 Flujo de Generación de Estrategia

```
[Análisis completado + Entrevista completada]
        │
        ▼
1. Admin: POST /admin/{brand_id}/seed-strategy
        │
        ▼
2. Construir Prompt
   ├── Datos de análisis (Q1-Q10)
   ├── Datos de entrevista
   └── Identidad de marca
        │
        ▼
3. GPT-5-mini genera árbol jerárquico JSON
   ├── Objetivo Principal + rationale
   │   ├── Estrategia 1 → Conceptos (2-4)
   │   └── Estrategia 2 → Conceptos (2-4)
   └── Objetivo Secundario + rationale
       ├── Estrategia 3 → Conceptos (2-4)
       └── Estrategia 4 → Conceptos (2-4)
        │
        ▼
4. convert_tree_to_nodes()
   └── Convierte a nodos con coordenadas X,Y
        │
        ▼
5. Persistir strategy_nodes → Supabase
        │
        ▼
6. Frontend renderiza en React Flow Canvas
```

### 5.3 Flujo de Generación de Imágenes (Studio)

```
[Usuario selecciona tarea en Studio]
        │
        ▼
1. Configurar Brand Visual DNA
   ├── Colores primario/secundario/acento
   ├── Esencia de marca
   ├── Keywords visuales
   └── Always exclude elements
        │
        ▼
2. (Opcional) Upload a Image Bank
        │
        ▼
3. Seleccionar tarea pendiente
        │
        ▼
4. POST /studio/generate
   ├── Inferir archetype (product/lifestyle/promotional/editorial)
   ├── Construir prompt con template + brand context
   ├── Enriquecer con camera settings + lighting + mood
   ├── Llamar Gemini genai.models.generate_images()
   ├── Guardar en Supabase Storage
   └── Registrar en generated_images
        │
        ▼
5. Usuario revisa y selecciona imagen final
   └── POST /studio/images/{id}/select
```

---

## 6. Sistema de Planes y Acceso

### 6.1 Planes

| Plan | Módulos Disponibles |
|------|-------------------|
| `free_trial` | Lab (solo lectura) |
| `starter` | Lab + Interview |
| `professional` | Lab + Interview + Brand + Strategy |
| `premium` | Todos los módulos |

### 6.2 Módulos del Sistema

| ID | Nombre | Descripción |
|----|--------|-------------|
| `lab` | Laboratorio | Dashboard Q1-Q10 de análisis |
| `interview` | Entrevista | Flujo de descubrimiento de marca |
| `brand` | Marca | Identidad de marca generada por IA |
| `strategy` | Estrategia | Canvas visual de objetivos/estrategias |
| `schedule` | Cronograma | Planificación y calendario de contenido |
| `studio` | Studio | Generación de imágenes con IA |

---

## 7. Deployment

### 7.1 Backend (Docker / Railway)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*
COPY backend_v2/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend_v2/app ./app
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
```

**Procfile** (Railway): `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 7.2 Frontend (Vercel)

- Build: `npm run build` (Vite)
- Variables: `VITE_API_URL` apunta al backend

### 7.3 Variables de Entorno Requeridas

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `SUPABASE_KEY` | ✅ | Clave pública (anon) |
| `SUPABASE_SERVICE_KEY` | ✅ | Clave de servicio (admin) |
| `OPENAI_API_KEY` | ✅ | Para clasificación y generación |
| `APIFY_TOKEN` | ✅ | Para scraping de Instagram |
| `GEMINI_API_KEY` | ✅ | Para NanoBanana (image gen) |
| `PORT` | ⚠️ | Puerto del servidor (auto en Railway) |

---

## 8. Dependencias Principales

### Backend (`requirements.txt`)
```
fastapi
uvicorn[standard]
supabase
pydantic-settings
apify-client
openai
google-genai          # NanoBanana image generation
httpx
pandas
python-multipart
```

### Frontend (`package.json`)
```
react, react-dom
typescript
vite
tailwindcss
recharts              # Gráficos Q1-Q10
lucide-react          # Iconos
framer-motion         # Animaciones
reactflow             # Canvas de estrategia
```
