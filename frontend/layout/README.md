# Pixely Partners Frontend

Frontend React + TypeScript + Vite de Pixely Partners: la ficha del negocio, su mercado, su estrategia y la línea de producción de contenido.

## Stack Tecnológico

- **React 19** - Framework UI
- **TypeScript 5.8** - Type safety
- **Vite 6** - Build tool
- **Recharts** - Visualización de datos
- **Lucide React** - Iconos

## Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build producción
npm run build

# Preview build
npm run preview
```

## Configuración

Crea un archivo `.env` basado en `.env.example`:

```env
VITE_API_URL=http://localhost:8000
```

## Estructura

```
frontend/layout/
├── components/              # Componentes React
│   ├── Sidebar.tsx          # Menú por zonas: Inicio · Tu marca · Contenido · Archivo
│   ├── InterviewView.tsx    # Ficha del negocio (la entrevista)
│   ├── MercadoView.tsx      # Mercado: tamaño, competencia, precios, señales
│   ├── PlanificacionView / ValidacionView / PublicacionView / RepositorioView
│   ├── content/             # Tarjeta y detalle de cada pieza de contenido
│   ├── LoginComponents.tsx  # Login y animaciones
│   └── ...
├── brand-book/              # Voz de marca
├── estrategia/              # Estrategia (mapa de objetivos y conceptos)
├── entrevista/              # Formulario de la Ficha
├── contexts/
│   └── AuthContext.tsx      # Estado de autenticación
├── hooks/
│   └── useContentPieces.ts  # Piezas de contenido del cliente
├── services/
│   └── api.ts               # Llamadas al backend (y cierre de sesión al expirar)
├── App.tsx                  # Componente principal
└── index.tsx                # Entry point
```

## Conexión con Backend

El frontend se conecta al backend FastAPI en:
- **Auth**: `POST /token` (OAuth2), `GET /users/me`
- **Ficha**: `GET/PUT /clients/{client_id}/interview`
- **Voz de marca**: `GET /brand/{client_id}`, `PATCH /brand/{client_id}/voice/review`, `PUT /brand/{client_id}/colors`
- **Mercado**: `GET /market/{client_id}/study`, `GET /market/{client_id}/findings`
- **Estrategia**: `GET /strategy/{client_id}`, `POST /strategy/sync`
- **Contenido**: `GET /content/{client_id}/pieces`, `PATCH /content/{client_id}/pieces/{piece_id}/review`

## Desarrollo

Para desarrollo local con el backend:

1. Iniciar backend: `docker compose up -d` (en `/backend`)
2. Iniciar frontend: `npm run dev`
3. Abrir http://localhost:5173
