# Ensayo general de Partners — 7 de octubre de 2026

Simulacro de punta a punta antes del piloto real (tarea F1-1), con un cliente ficticio: **Café Altura**, cafetería de especialidad en Arequipa, plan Basic, Instagram + Facebook + TikTok. Contacto ficticio: Rosa Quispe.

## Qué se probó y cómo

1. **Contrato recetas ↔ base de datos.** Se compararon todas las tablas, columnas y filtros que usan las 8 recetas de `pixely_automatizaciones` contra el esquema real de Supabase. Resultado: coinciden.
2. **Recorrido completo en la base.** Dentro de una transacción que se revierte al final (no quedó ningún dato), se escribió cada paso tal como lo hace cada receta o pantalla:

| Paso | Resultado |
|---|---|
| Alta de la marca y su configuración (Panel del equipo) | OK |
| Ficha | OK |
| `01_mercado_estudio`: estudio y promedios de la competencia | OK |
| `03_mercado_vigilancia`: hallazgo de mercado | OK |
| `02_voz_de_marca` + aprobación del cliente | OK |
| `04_estrategia` (marca → objetivo → estrategia → concepto) + aprobación | OK |
| `05_planificacion` (un carrusel con su estructura) + aprobación de la idea | OK |
| `03_generar` → `04_ensamblar` → entrega del equipo | OK |
| Cliente pide cambio de texto → corrección → aprobación | OK |
| `05_publicar`: programación y resultados en Instagram y TikTok | OK |

3. **Lo que no se pudo probar desde aquí:** las pantallas en vivo y el servidor de Railway, porque este entorno no tiene salida a `partners.pixely.pe` ni a Railway. Queda la prueba manual de abajo.

## Fricciones encontradas

| # | Fricción | Gravedad | Estado |
|---|---|---|---|
| 1 | El servidor acepta un **acceso de desarrollo** (`admin@pixely.pe` / clave `admin` y un token fijo) que da permisos de administrador sobre todas las marcas. Además, no existe ningún usuario real con rol `admin`: el equipo depende de ese acceso | **Crítica** | Resuelto el 7 oct: cuenta de equipo creada (`lucia.ramos@pixely.pe`, rol admin) y acceso de desarrollo apagado |
| 2 | El escritorio (`frontend/layout/.env.production`) apuntaba al servidor antiguo de Railway, que ya no existe; la app móvil ya se había corregido | Alta | Corregido. Si Vercel tiene `VITE_API_URL` configurada, esa manda; conviene revisarla en el panel |
| 3 | Seis recetas leen las llaves desde una ruta fija de una sola computadora (`D:/ANTES_15_09_2026/…/.env`). En otra computadora fallan | Media | Pendiente: definir dónde guarda cada miembro del equipo su `.env` |
| 4 | La comparación con la competencia solo acepta Instagram, Facebook, YouTube y X; los resultados de TikTok del cliente se guardan pero no tienen con qué compararse | Baja | Aceptado por ahora (Metricool no da los datos de TikTok de la competencia) |
| 5 | Restos sin uso: 7 tablas (`analysis_reports`, `plan_reviews`, `brand_image_bank`, `brand_visual_dna`, `generated_images`, `generation_templates`, `studio_credits`), routers `personas` y `tts` | Baja | Resuelto el 7 oct: tablas borradas y routers quitados |
| 6 | Restos de la vitrina (`_vitrina_import`, `_vitrina_b64`, extensión `http`, función `vitrina-import`) | Baja | Tabla, función y extensión borradas; falta borrar la Edge Function `vitrina-import` |

## Prueba manual en pantalla (15 minutos)

Para cerrar el ensayo hace falta que una persona recorra las pantallas. Con la marca de demostración que ya existe:

1. Entrar al escritorio como equipo y abrir **Panel del equipo → Hoy**: ¿aparecen todas las marcas y sus tareas?
2. Abrir una marca: Ficha, Voz de marca, Mercado (y descargar el PDF), Estrategia.
3. Planificación: aprobar una idea y pedir cambios en otra.
4. Validación → "Por entregar": subir una imagen de prueba como pieza final.
5. Entrar como cliente en el celular (código por correo): aprobar la pieza deslizando y pedir un cambio en otra.
6. Publicaciones: revisar Próximas y Publicadas.

Anotar cualquier cosa rara (texto confuso, botón que no responde, dato que no aparece).

## SQL para limpiar los restos de la vitrina

Pegar en Supabase → SQL Editor del proyecto `pixely_partners`:

```sql
drop table if exists public._vitrina_import;
drop function if exists public._vitrina_b64(text);
drop extension if exists http;
```

Y en Supabase → Edge Functions, borrar la función `vitrina-import`.
