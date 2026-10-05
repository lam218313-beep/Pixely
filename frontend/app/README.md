# Pixely — app del cliente

La **versión móvil de Partners en la web**. Las tiendas (Play Store y App Store, con Capacitor)
quedan en pausa: el código nativo sigue aquí, pero primero la web.

## Dónde vive

- Se publica **dentro del mismo sitio de Vercel** que Partners de escritorio, en `/m/`.
  `frontend/layout` la construye junto con el escritorio (`npm run build` → `build-movil.mjs`
  copia esta app a `dist/m`) y `frontend/layout/vercel.json` sirve sus pantallas.
- Un **teléfono** que abre la web va solo a `/m/` (script al inicio de `frontend/layout/index.html`).
  Computadoras y tablets siguen viendo el escritorio.
- `/?escritorio=1` deja a ese teléfono en la versión de escritorio (lo recuerda); `/?movil=1` lo
  devuelve a la móvil. La app tiene el enlace "Versión de escritorio" en Entrar y en Tu cuenta.
- Las dos usan el mismo backend. La móvil es solo para clientes; el equipo usa el escritorio.

## Pruebas automáticas

`npm run test:e2e` construye la app tal como se publica (en `/m/`) y la recorre con Playwright en
tamaño Android y iPhone, contra un backend de mentira (`e2e/mock-api.ts`): entrar, todas las
pantallas con datos y vacías, Validar (deslizar, deshacer, cambios), Plan, Marca, PDF y fallas del
servidor. Una prueba falla si la app lanza un error o muestra "Algo salió mal". GitHub las corre en
cada cambio (`.github/workflows/web-movil.yml`); si algo falla, el informe con capturas queda en
los artefactos del run.

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

## Inicio, Resultados y Marca

- **Inicio** (`/`): la tarea más urgente en la tarjeta rosa (piezas por revisar → ideas por aprobar → voz →
  estrategia), el resto debajo, "Mercado actualizado" si hay hallazgos de la última semana y lo próximo en salir.
- **Resultados** (`/resultados`, `/resultados/publicadas?mes=`, `/resultados/:id`): agenda de lo que viene;
  del mes publicado, alcance e indicadores (suma de todas las redes), tú vs tu competencia (likes + comentarios
  por publicación en Instagram vs `competitor_benchmarks.interacciones_prom`), la mejor pieza y el detalle de
  cada una. Los titulares ("Superaste a…", "Estás cerca de…") salen solos de los números.
- **Marca** (`/marca` y `/marca/voz|estrategia|mercado|ficha`): personalidad de la marca, aprobar la voz y la
  estrategia, mercado con el PDF (en el celular abre "Compartir" si se puede) y la ficha de solo consulta.

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
3. ~~Validar y Plan~~ (datos reales: `src/lib/content.ts`, `src/lib/strategy.ts`) · 4. ~~Inicio, Resultados y Marca~~ (`src/lib/brand.ts`, `src/lib/results.ts`) · 5. ~~Capacitor~~ (ver "App de tiendas" abajo). Pendiente para publicar: cuentas de desarrollador, firma y fichas de las tiendas.

## App de tiendas (Capacitor)

La misma app (`dist/`) va dentro de un proyecto nativo: `android/` (Android Studio) e `ios/` (Xcode).
`capacitor.config.ts`: `appId` **pe.pixely.app**, nombre **Pixely**.

Lo que solo existe en la app de tiendas (`src/lib/native.ts`; en la web no hace nada):

- **Sesión en la caja fuerte del teléfono** (Keychain / Keystore) con `@aparajita/capacitor-secure-storage`
  (`src/lib/session.ts` la carga antes de dibujar la primera pantalla).
- **Face ID / huella** (`@aparajita/capacitor-biometric-auth`): tras el primer ingreso se ofrece activarlo;
  la app abre bloqueada y se vuelve a bloquear tras 5 minutos en segundo plano (`layouts/BiometricGate.tsx`).
  Se apaga o enciende en Tu cuenta. Respaldo: el PIN del teléfono o volver a entrar con código.
- **Botón atrás de Android**: retrocede dentro de la app; en la pantalla principal de una pestaña, minimiza.
- **PDF de Mercado**: se guarda y abre el menú "Compartir" del teléfono (`@capacitor/filesystem` + `share`).
- Barra de estado oscura, pantalla de carga negra con "pixely." e íconos generados desde `assets/`
  (`npx capacitor-assets generate --android --ios`). Solo vertical.

### Probar en un Android sin publicar

Cada cambio en `frontend/app` dispara **GitHub Actions → "App Android (APK de prueba)"**, que compila un APK
de prueba. Descárgalo de la ejecución (Artifacts → `pixely-app-debug`), ábrelo en el teléfono y acepta
"instalar apps de origen desconocido". No sirve para la tienda: es de prueba, sin firma de publicación.

### Compilar en una computadora

```bash
npm run cap:android   # compila, sincroniza y abre Android Studio
npm run cap:ios       # en una Mac con Xcode
```

### Antes de publicar (una vez)

**Google Play** (US$25, una vez)
1. Cuenta de **organización** (pide número D-U-N-S, gratis): evita la prueba obligatoria de 12 personas × 14 días.
2. Clave de subida (`keystore`): se crea una vez y **nunca** se sube al repositorio; se guarda como secreto
   de GitHub para firmar el `.aab` de publicación (`./gradlew bundleRelease`).
3. Ficha: política de privacidad → `https://<dominio de la app>/privacidad`; eliminación de cuenta →
   `https://<dominio de la app>/eliminar-cuenta`; formulario "Seguridad de los datos" (correo y nombre para la
   cuenta; contenido del negocio; nada se vende ni se usa para publicidad; datos cifrados en tránsito).
4. Cuenta de prueba para los revisores ("Cliente de Prueba"). Ojo: entran con código por correo, así que
   hay que darles acceso al buzón o habilitar "Entrar con contraseña" para esa cuenta.

**App Store** (US$99 al año)
1. Apple Developer Program + una Mac con Xcode (o un servicio de compilación en la nube).
2. "Privacidad de la app" con las mismas respuestas; `NSFaceIDUsageDescription` ya está en `Info.plist`.
3. Misma cuenta de prueba para la revisión.

**Antes de enviar:** completar los datos legales en `src/features/legal/LegalScreens.tsx` (razón social, RUC,
correo) y revisar el texto de privacidad.

### Mantenimiento

- Cambios de pantallas: `npm run cap:sync` y publicar una versión nueva (sube `versionCode` en
  `android/app/build.gradle` y la versión en Xcode).
- Una vez al año, Google y Apple piden compilar con su SDK más reciente: actualizar Capacitor
  (`npm i @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest @capacitor/ios@latest`) y publicar.
