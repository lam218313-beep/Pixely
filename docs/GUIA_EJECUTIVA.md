# Pixely Partners
### Guía ejecutiva del sistema · octubre 2026

> Para leer en 10 minutos, sin conocimientos técnicos. El detalle técnico está en `ARQUITECTURA_SISTEMA.md`.

---

## Qué es

**Pixely** hace publicidad en redes sociales para pequeños negocios del Perú con un proceso fijo: estudiamos el mercado del cliente, armamos su estrategia, producimos su contenido y lo publicamos. **Pixely Partners** es el sistema donde todo eso pasa y donde el cliente participa: ahí ve su marca, aprueba cada idea y cada pieza, y mira cómo le fue.

Una analogía: Pixely es la cocina y Partners es la ventana por donde el cliente ve cómo se prepara su plato, lo prueba antes de que salga y recibe la cuenta de cómo le fue.

Hay dos formas de entrar a Partners, con la misma cuenta y los mismos datos:

| | Para quién | Dónde |
|---|---|---|
| **Escritorio** | Clientes y equipo de Pixely | `partners.pixely.pe` en una computadora |
| **App del celular** | Solo clientes | `partners.pixely.pe` desde el celular (se abre sola la versión móvil). Las tiendas Google Play y App Store están en pausa |

---

## El recorrido de un cliente

El cliente pasa por dos zonas. Primero se arma **su marca** (una vez, y se actualiza cuando hace falta) y luego, mes a mes, la **línea de contenido**.

### Tu marca

| Paso | Qué es | Quién lo hace | Qué hace el cliente |
|---|---|---|---|
| **Ficha** | Los datos del negocio: qué vende, a quién, cómo, qué quiere lograr | El equipo, en una conversación con el cliente | La revisa y la puede editar |
| **Mercado** | Su competencia, precios, promociones y lo que funciona en su rubro. Con gráficos y un PDF descargable | El equipo, con las recetas de estudio y vigilancia | La consulta |
| **Voz de marca** | Cómo habla la marca: rasgos de tono, palabras que sí y que no, un post de ejemplo | El equipo, con la receta de voz | La **aprueba** o pide cambios |
| **Estrategia** | Qué debe lograr el negocio (objetivos), cómo (estrategias) y con qué contenido (conceptos), en un mapa | El equipo, con la receta de estrategia | La **aprueba** o pide cambios |

### Línea de contenido (cada mes)

| Paso | Qué pasa | Qué hace el cliente |
|---|---|---|
| **Planificación** | El plan del mes: cada idea con su fecha, formato, por qué existe y qué contará | **Aprueba cada idea** antes de que se produzca (o pide cambios) |
| **Validación** | La pieza terminada, tal como saldrá, con su texto para cada red | La **aprueba** o pide cambios diciendo si es la imagen, el texto o ambos. En el celular se aprueba deslizando, como un mazo de cartas |
| **Publicaciones** | Lo que viene (con día y hora) y lo ya publicado, con sus resultados y la comparación con la competencia | La consulta |

**Nada se publica sin el visto bueno del cliente**, y el cliente nunca aprueba dos veces la misma cosa.

---

## Cómo trabaja el equipo

El trabajo pesado (investigar, escribir, planificar, publicar) lo hacen **recetas**: instrucciones que el equipo ejecuta en Claude Desktop, siempre con una persona supervisando, porque los datos del mercado peruano no son confiables si se toman a ciegas. Las recetas escriben directo en Partners.

| Receta | Para qué |
|---|---|
| `01_mercado_estudio` | Estudio de mercado inicial del cliente (una vez) |
| `02_voz_de_marca` | Definir la voz de la marca |
| `03_mercado_vigilancia` | Vigilar a la competencia (cada cierto tiempo) |
| `04_estrategia` | Definir objetivos, estrategias y conceptos |
| `05_planificacion` | Armar el plan del mes |
| `03_generar` | Escribir los textos de cada pieza y corregirlos si el cliente lo pide |
| `04_ensamblar` | Dejar al diseñador la guía para producir cada pieza |
| `05_publicar` | Programar en Metricool lo aprobado y, después, traer los resultados |

Entre `04_ensamblar` y la Validación hay **trabajo humano**: el diseñador produce la pieza final (Canva, CapCut) y la sube a Partners. El cliente no ve nada hasta que la pieza está terminada.

El equipo entra a Partners de escritorio y tiene el **Panel del equipo**:
- **Hoy:** todas las marcas en un tablero, con lo que falta en cada una y qué receta toca correr.
- **Cada marca:** el mismo menú que ve el cliente, más su configuración (plan, cuántas fotos y reels al mes, redes, cuenta de Metricool, contacto) y sus usuarios.

El manual de operación semanal (qué receta se corre cuándo y quién) está en Drive, carpeta `4 Manuales`.

---

## Planes

Tres planes con el mismo proceso. Cambia cuánto contenido se produce y quién publica.

| Plan | Volumen | Calendario de publicación | Publicamos por el cliente | Resultados de cada pieza |
|---|---|---|---|---|
| **Lite** | Inicial | — | — | — |
| **Basic** | Medio | Sí | — | — |
| **Pro** | Mayor | — | Sí | Sí |

Los tres incluyen el estudio de mercado, la estrategia y el plan del mes, la aprobación en Partners y la producción multiformato (igual que en `pixely.pe`).

El volumen exacto se define con cada cliente y se guarda en su configuración. Los precios aún no están definidos.

---

## Dónde vive el sistema

| Pieza | Servicio | Para qué |
|---|---|---|
| Partners (escritorio y celular) | Vercel | Las pantallas |
| Servidor | Railway | Recibe las acciones de las pantallas y las guarda |
| Base de datos y archivos | Supabase | Toda la información y las piezas finales |
| Publicación y resultados | Metricool | Programar en redes y medir |
| Recetas | Claude Desktop (repositorio `pixely_automatizaciones`) | El trabajo del equipo |
| Web comercial | Vercel (`pixely.pe`) | Captar clientes |

---

## Seguridad y datos

- Cada cliente solo ve su propia marca. El equipo ve todas.
- Los clientes entran con un **código de 6 dígitos que llega a su correo** (en el celular) o con contraseña (en escritorio).
- Las piezas finales se guardan en Supabase.
- Las llaves de acceso a los servicios no se comparten por chat ni se suben al código.

**Pendientes antes de abrir a clientes reales** (ver la hoja de tareas, frente 1):
1. Calendario de respaldos de la base y cambio periódico de llaves.
2. Probar en producción el correo con el código de acceso y ponerle la marca Pixely.

---

## Glosario

| Término | Significado |
|---|---|
| **Ficha** | Los datos del negocio del cliente |
| **Receta** | Instrucción que el equipo ejecuta en Claude Desktop para un paso del proceso |
| **Concepto** | Una idea de contenido de la Estrategia, que se repite en varias piezas del mes |
| **Pieza** | Una publicación: imagen, carrusel, estado o reel |
| **Validación** | Cuando el cliente revisa la pieza terminada antes de que salga |
| **Metricool** | La herramienta con la que se programa en redes y se miden resultados |
