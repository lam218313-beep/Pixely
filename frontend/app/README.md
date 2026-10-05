# Pixely — app del cliente

La app móvil del cliente (web móvil hoy; Play Store y App Store después, con Capacitor).
Vive aparte de `frontend/layout` (Partners de escritorio, que sigue igual para el equipo y para
los clientes que prefieran la computadora). Las dos usan el mismo backend.

## Cómo está hecha

| Pieza | Para qué |
|---|---|
| Vite 8 + React 19 + TypeScript | la base |
| React Router 7 | cada pantalla tiene su dirección (`/plan/mezcla`, `/validar`…): funciona el botón atrás y una notificación puede abrir una pantalla exacta |
| Tailwind 4 compilado | estilos generados al publicar, no en el teléfono |
| TanStack Query (`src/lib/query.ts`) | memoria intermedia: lo que ya se cargó aparece al instante y se refresca en segundo plano |
| vite-plugin-pwa | instalable desde el navegador (ícono, pantalla completa) y abre rápido sin señal |
| Fuentes locales (`@fontsource`) | Unbounded y Manrope viajan con la app; no dependen de Google Fonts |

## Sistema Noche

- Colores y tipografías: `src/styles.css` (`@theme`). Solo negros, grises, blanco y rosa.
- Piezas reutilizables: `src/ui/` — `Button`, `IconButton`, `Field`, `TextArea`, `StatusChip`
  (Te toca · Cambios · Aprobada · En producción · Programada, siempre con ícono), `Tag`, `Card`,
  `Section`, `ListRow`, `Screen`, `DetailScreen`, `TabBar`, `Segmented`, `Sheet`, `Loading`,
  `ErrorState`, `EmptyState`.
- Diseño de referencia: el lienzo "Pixely App" en claude.ai.

## Estructura

```
src/
  lib/       api.ts (única puerta al backend), session.ts (dónde vive la sesión), auth.tsx, query.ts
  ui/        sistema Noche
  layouts/   pestañas, pantallas de detalle, guardia de sesión
  features/  una carpeta por pestaña: entrar, inicio, plan, validar, resultados, marca, cuenta
```

## Comandos

```bash
npm install
npm run dev        # usa .env.development (backend local en :8001)
npm run build      # usa .env.production (backend de Railway)
```

## Validar y Plan

- **Validar** (`/validar`, `/validar/:id`): las piezas en estado "por revisar" como un mazo. Derecha = aprobar
  (espera 4 segundos con "Deshacer" antes de enviarse), izquierda = pedir cambios (imagen / texto / ambos +
  comentario), arriba = el texto por red y el porqué. Usa `PATCH /content/{id}/pieces/{pieza}/review`.
- **Plan** (`/plan?mes=AAAA-MM`, `/plan/mezcla`, `/plan/:id`): ideas por semana con calendario del mes,
  "Aprobar las pendientes", la mezcla del mes (ruta estratégica, ritmo, pilares, formatos) y el detalle de
  cada idea (qué contaremos, láminas o escenas, por qué, dato de mercado, ruta, su semana). Usa
  `PATCH .../plan-review` y `POST .../plan-review/approve-pending`.
- Las decisiones se ven al instante y el servidor las confirma después; si falla, la pantalla vuelve atrás.
- Los globitos de la barra (Plan, Validar) cuentan lo que espera al cliente.

## Entrar con código: configuración de Supabase (una vez)

Supabase envía y verifica el código. En el panel de Supabase del proyecto:

1. **Correo propio (SMTP):** Authentication → Emails → SMTP Settings. Sin esto, Supabase solo envía
   a los miembros del equipo y unos pocos correos por hora (sirve para probar, no para clientes).
2. **Plantilla "Magic Link"** con el código: debe incluir `{{ .Token }}`.
3. **Vencimiento y largo:** Authentication → Providers → Email: `Email OTP Expiration` = 600 s y
   `Email OTP Length` = 6 (la app espera 6 dígitos y dice "vence en 10 minutos").

## Pendiente (por pasos)

1. ~~Cimientos~~
2. ~~Entrar con código por correo~~ (`/entrar` → `/entrar/codigo`; backend `POST /auth/code/send`, `/auth/code/verify`, `/auth/refresh`). La sesión se renueva sola con el `refresh_token`. Queda "Entrar con contraseña" como respaldo. Face ID / huella llegan con la app de tiendas.
3. ~~Validar y Plan~~ (datos reales: `src/lib/content.ts`, `src/lib/strategy.ts`) · 4. Inicio, Resultados y Marca · 5. Capacitor (Play Store / App Store):
   ahí `src/lib/session.ts` pasa al almacenamiento seguro del teléfono.
