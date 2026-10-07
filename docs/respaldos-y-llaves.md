# Respaldos de la base y cambio de llaves (tarea F1-9)

## 1. Respaldo semanal de la base

Supabase está en el plan gratuito, que no guarda respaldos que se puedan descargar. Por eso el repositorio
tiene una tarea automática (`.github/workflows/respaldo-base.yml`) que **cada lunes a las 3:17 a. m. (Lima)**
copia la base completa y la guarda **90 días** como archivo privado del repositorio. Solo la ven quienes
tienen acceso al repositorio.

### Activarlo (una sola vez, 3 minutos)

1. **Copiar la dirección de la base.** Supabase → proyecto `pixely_partners` → botón **Connect** (arriba) →
   pestaña **Connection string** → elegir **Session pooler** → copiar la línea que empieza con
   `postgresql://postgres.zvpisdftltnukbozyuge:...@aws-0-...pooler.supabase.com:5432/postgres`.
   Reemplazar `[YOUR-PASSWORD]` por la contraseña de la base. Si nadie la recuerda: Supabase →
   Project Settings → Database → **Reset database password**. Después hay que cambiarla también donde
   se use, ver la sección 2.
   (Usar **Session pooler**, no "Direct connection": GitHub no llega a la conexión directa.)
2. **Guardarla en GitHub, no en el chat.** GitHub → repositorio `Pixely` → **Settings** → **Secrets and
   variables** → **Actions** → **New repository secret**. Nombre: `SUPABASE_DB_URL`. Valor: la línea
   del paso 1. **Add secret**.
3. **Probarlo.** GitHub → **Actions** → **Respaldo de la base** → **Run workflow**. En unos 2 minutos
   debe quedar en verde, con un archivo `respaldo-N` al final de la página.

Si una semana falla, GitHub manda un correo al dueño del repositorio.

### Recuperar datos de un respaldo

Descargar el archivo desde Actions → la corrida de esa fecha → `respaldo-N`. Restaurarlo es trabajo técnico
y se hace con calma, nunca encima de la base en uso:

1. Crear un proyecto nuevo de Supabase (o una base local) como mesa de trabajo.
2. `pg_restore --no-owner --no-privileges -d "<dirección de la base de trabajo>" pixely-partners-AAAA-MM-DD.dump`
3. Copiar desde ahí solo las filas que se perdieron hacia la base real.

### Ojo con la pausa del plan gratuito

Supabase pausa los proyectos gratuitos que pasan una semana sin uso. El respaldo semanal cuenta como uso,
pero si el proyecto llegara a pausarse, se reactiva desde el panel de Supabase con **Restore project**.

Cuando haya clientes pagando conviene pasar a **Supabase Pro** (US$25 al mes): copia diaria automática,
recuperación con un clic y sin pausas. El respaldo semanal puede seguir como copia extra.

## 2. Cambio de llaves

Las llaves son las claves secretas con las que Partners entra a cada servicio. Varias pasaron por distintas
computadoras y conversaciones durante el desarrollo, así que **se cambian una vez antes del primer cliente
real y después cada 6 meses** (abril y octubre). Nunca se pegan en el chat ni se suben al código.

Orden recomendado: generar la llave nueva → ponerla en Railway (y en los `.env` de las recetas) → comprobar
que Partners funciona → recién entonces anular la vieja.

| Llave | Dónde se genera | Dónde se usa |
|---|---|---|
| Contraseña de la base | Supabase → Project Settings → Database → Reset database password | Secreto `SUPABASE_DB_URL` de GitHub (sección 1) |
| Llave secreta de Supabase (`SUPABASE_SERVICE_KEY`) | Supabase → Project Settings → API Keys → crear una **secret key** nueva y, tras probar, borrar la anterior | Railway → servicio `backend` → Variables; `.env` de las recetas |
| Llave pública de Supabase (`SUPABASE_KEY`) | Igual, en **publishable key** | Railway → Variables |
| Gemini (`GEMINI_API_KEY`) | Google AI Studio → API keys | Railway → Variables; `.env` de las recetas |
| OpenAI (`OPENAI_API_KEY`) | platform.openai.com → API keys | Railway → Variables |
| Apify (`APIFY_TOKEN`) | Apify → Settings → Integrations | `.env` de las recetas |
| Metricool | Metricool → Configuración → API | `.env` de las recetas |

Después de cambiar variables en Railway, el servidor se reinicia solo. Para comprobar: entrar a
partners.pixely.pe con la cuenta del equipo y abrir una marca.

### Registro

| Fecha | Qué se cambió | Quién |
|---|---|---|
| | | |
