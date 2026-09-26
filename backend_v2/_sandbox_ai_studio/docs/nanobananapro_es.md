# Nano Banana Pro - Documentación en Español

**Nano Banana** es el nombre de las capacidades nativas de generación de imágenes de Gemini.
Gemini puede generar y procesar imágenes de forma conversacional usando texto, imágenes, o una combinación de ambos. Esto permite crear, editar e iterar sobre visuales con un control sin precedentes.

Nano Banana se refiere a dos modelos distintos disponibles en la API de Gemini:

- **Nano Banana**: El modelo [Gemini 2.5 Flash Image](https://ai.google.dev/gemini-api/docs/models/gemini#gemini-2.5-flash) (`gemini-2.5-flash-image`). Este modelo está diseñado para velocidad y eficiencia, optimizado para tareas de alto volumen y baja latencia.
- **Nano Banana Pro**: El modelo [Gemini 3 Pro Image Preview](https://ai.google.dev/gemini-api/docs/models/gemini#gemini-3-pro-image-preview) (`gemini-3-pro-image-preview`). Este modelo está diseñado para producción de assets profesionales, utilizando razonamiento avanzado ("Thinking") para seguir instrucciones complejas y renderizar texto con alta fidelidad.

Todas las imágenes generadas incluyen una [marca de agua SynthID](https://ai.google.dev/responsible/docs/safeguards/synthid).

---

## Tabla de Contenidos

1. [Generación de Imágenes (texto-a-imagen)](#generación-de-imágenes-texto-a-imagen)
2. [Edición de Imágenes (texto-e-imagen-a-imagen)](#edición-de-imágenes-texto-e-imagen-a-imagen)
3. [Edición Multi-turno](#edición-multi-turno)
4. [Novedades de Gemini 3 Pro Image](#novedades-de-gemini-3-pro-image)
5. [Guía de Prompting y Estrategias](#guía-de-prompting-y-estrategias)
6. [Relaciones de Aspecto y Resolución](#relaciones-de-aspecto-y-resolución)
7. [Selección de Modelo](#selección-de-modelo)

---

## Generación de Imágenes (texto-a-imagen)

### Python

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

prompt = "Crea una imagen de un platillo de nano banana en un restaurante elegante con tema de Gemini"
response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents=[prompt],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("imagen_generada.png")
```

---

## Edición de Imágenes (texto-e-imagen-a-imagen)

**Recordatorio**: Asegúrate de tener los derechos necesarios sobre cualquier imagen que subas.
No generes contenido que infrinja los derechos de otros, incluyendo videos o imágenes que engañen, acosen o dañen.

Proporciona una imagen y usa prompts de texto para agregar, eliminar o modificar elementos, cambiar el estilo o ajustar la gradación de color.

### Python

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

prompt = "Crea una imagen de mi gato comiendo un nano-banana en un restaurante elegante bajo la constelación de Gemini"
image = Image.open("/ruta/a/imagen_del_gato.png")

response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents=[prompt, image],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("imagen_generada.png")
```

---

## Edición Multi-turno

Puedes tener conversaciones de varios turnos con Gemini, pasando imágenes como entrada y manteniendo el contexto de la conversación. Esto te permite iterar sobre tus creaciones.

### Python

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

chat = client.chats.create(model="gemini-2.5-flash-image")

# Primer turno - crear infografía
response = chat.send_message(
    "Genera una infografía vibrante que explique la fotosíntesis como si fuera una receta para la comida favorita de una planta.",
    config=types.GenerateContentConfig(
        response_modalities=['Text', 'Image']
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("fotosintesis.png")

# Segundo turno - cambiar idioma
message = "Actualiza esta infografía para que esté en español. No cambies ningún otro elemento de la imagen."
aspect_ratio = "16:9"  # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
resolution = "2K"  # "1K", "2K", "4K"

response = chat.send_message(message,
    config=types.GenerateContentConfig(
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=resolution
        ),
    ))

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("fotosintesis_espanol.png")
```

---

## Novedades de Gemini 3 Pro Image

### Usar hasta 14 imágenes de referencia

Gemini 3 Pro Image Preview soporta hasta 14 imágenes de referencia:
- **6 objetos** de alta fidelidad
- **5 humanos** para consistencia de personajes
- **3 estilos** para transferencia de estilo

### Python

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

aspect_ratio = "5:4"  # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
resolution = "2K"  # "1K", "2K", "4K"

# Cargar imágenes de referencia
image1 = Image.open("/ruta/a/referencia1.png")
image2 = Image.open("/ruta/a/referencia2.png")

text_input = """Crea una fotografía comercial del producto mostrado en las imágenes de referencia.
Usa iluminación profesional de estudio y un fondo limpio y minimalista."""

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[image1, image2, text_input],
    config=types.GenerateContentConfig(
        response_modalities=['Text', 'Image'],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=resolution
        )
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("producto_comercial.png")
```

### Grounding con Google Search

Usa Google Search para generar imágenes basadas en información reciente o en tiempo real. Útil para noticias, clima y otros temas sensibles al tiempo.

### Python

```python
from google import genai
from google.genai import types

prompt = "Crea un gráfico simple pero elegante del partido de anoche del Arsenal en la Champions League"
aspect_ratio = "16:9"

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_modalities=['Text', 'Image'],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
        ),
        tools=[{"google_search": {}}]
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("resultado_futbol.jpg")
```

### Generar imágenes hasta 4K de resolución

Gemini 3 Pro Image Preview puede generar imágenes en resoluciones de **1K**, **2K** o **4K**.

### Python

```python
from google import genai
from google.genai import types

client = genai.Client()

aspect_ratio = "1:1"
resolution = "4K"  # Resolución 4K

prompt = "Una fotografía fotorealista de alta resolución de una taza de café humeante sobre una mesa de mármol, con luz natural suave de ventana."

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_modalities=['Text', 'Image'],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=resolution
        )
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("cafe_4k.png")
```

### Proceso de Pensamiento (Thinking)

Gemini 3 Pro Image Preview incluye un modo "Thinking" que refina la composición antes de generar. Esto mejora la calidad para instrucciones complejas.

---

## Guía de Prompting y Estrategias

El principio fundamental para dominar la generación de imágenes:
> **Describe la escena, no solo listes palabras clave.**
> La fortaleza del modelo es su profunda comprensión del lenguaje. Un párrafo narrativo y descriptivo casi siempre producirá una imagen mejor y más coherente que una lista de palabras desconectadas.

---

### 1. Escenas Fotorealistas

Para imágenes realistas, usa términos de fotografía. Menciona ángulos de cámara, tipos de lente, iluminación y detalles finos.

#### Plantilla

```
Una [tipo de toma] fotorealista de [sujeto], [acción o expresión], ubicada en
[ambiente]. La escena está iluminada por [descripción de iluminación], creando
una atmósfera [estado de ánimo]. Capturada con [detalles de cámara/lente], 
enfatizando [texturas y detalles clave]. La imagen debe estar en formato [relación de aspecto].
```

#### Ejemplo de Prompt

```
Un retrato fotorealista en primer plano de un anciano ceramista japonés con
arrugas profundas grabadas por el sol y una sonrisa cálida y sabia. Está 
inspeccionando cuidadosamente un cuenco de té recién esmaltado. El escenario
es su taller rústico bañado de sol. La escena está iluminada por luz dorada
suave de la hora dorada entrando por una ventana, resaltando la textura fina
de la arcilla. Capturada con un lente de retrato de 85mm, resultando en un
fondo suave y desenfocado (bokeh). El ambiente general es sereno y magistral.
Orientación vertical.
```

---

### 2. Ilustraciones Estilizadas y Stickers

Para crear stickers, iconos o assets, sé explícito sobre el estilo y solicita un fondo transparente.

#### Plantilla

```
Un sticker estilo [estilo] de un [sujeto], con [características clave] y una
paleta de colores [colores]. El diseño debe tener [estilo de línea] y 
[estilo de sombreado]. El fondo debe ser transparente.
```

#### Ejemplo de Prompt

```
Un sticker estilo kawaii de un panda rojo feliz usando un pequeño sombrero de
bambú. Está mordisqueando una hoja de bambú verde. El diseño presenta contornos
limpios y audaces, sombreado cel simple, y una paleta de colores vibrantes.
El fondo debe ser blanco.
```

---

### 3. Texto Preciso en Imágenes

Gemini sobresale en renderizar texto. Sé claro sobre el texto, el estilo de fuente (descriptivamente) y el diseño general. **Usa Gemini 3 Pro Image Preview** para producción de assets profesionales.

#### Plantilla

```
Crea un [tipo de imagen] para [marca/concepto] con el texto "[texto a renderizar]"
en una fuente [estilo de fuente]. El diseño debe ser [descripción del estilo], 
con un esquema de colores [colores].
```

#### Ejemplo de Prompt

```
Crea un logo moderno y minimalista para una cafetería llamada 'The Daily Grind'.
El texto debe estar en una fuente sans-serif limpia y negrita. El esquema de
colores es blanco y negro. Coloca el logo en un círculo. Usa un grano de café
de manera ingeniosa.
```

---

### 4. Mockups de Producto y Fotografía Comercial

Perfecto para crear fotos de producto limpias y profesionales para e-commerce, publicidad o branding.

#### Plantilla

```
Una fotografía de producto de alta resolución, iluminada en estudio, de una 
[descripción del producto] sobre una [superficie/descripción del fondo]. 
La iluminación es una [configuración de iluminación] para [propósito de la iluminación].
El ángulo de cámara es [tipo de ángulo] para mostrar [característica específica].
Ultra-realista, con enfoque nítido en [detalle clave]. [Relación de aspecto].
```

#### Ejemplo de Prompt

```
Una fotografía de producto de alta resolución, iluminada en estudio, de una 
taza de café de cerámica minimalista en negro mate, presentada sobre una 
superficie de concreto pulido. La iluminación es una configuración de tres 
softboxes diseñada para crear reflejos suaves y difusos y eliminar sombras 
duras. El ángulo de cámara es una toma ligeramente elevada a 45 grados para 
mostrar sus líneas limpias. Ultra-realista, con enfoque nítido en el vapor 
que sube del café. Imagen cuadrada.
```

---

### 5. Diseño Minimalista y Espacio Negativo

Excelente para crear fondos para sitios web, presentaciones o materiales de marketing donde se superpondrá texto.

#### Plantilla

```
Una composición minimalista con un solo [sujeto] posicionado en la [esquina] 
del cuadro. El fondo es un vasto lienzo [color] vacío, creando espacio negativo 
significativo. Iluminación suave y sutil. [Relación de aspecto].
```

#### Ejemplo de Prompt

```
Una composición minimalista con una sola y delicada hoja de arce roja posicionada
en la esquina inferior derecha del cuadro. El fondo es un vasto lienzo blanco
hueso vacío, creando espacio negativo significativo para texto. Iluminación
suave y difusa desde la esquina superior izquierda. Imagen cuadrada.
```

---

### 6. Arte Secuencial (Panel de Cómic / Storyboard)

Para precisión con texto y capacidad de narrativa, estos prompts funcionan mejor con **Gemini 3 Pro Image Preview**.

#### Plantilla

```
Haz un cómic de 3 paneles en estilo [estilo]. Coloca al personaje en una escena [tipo].
```

#### Ejemplo de Prompt

```
Haz un cómic de 3 paneles en un estilo gritty noir con tintas en blanco y negro
de alto contraste. Coloca al personaje en una escena humorística.
```

---

### 7. Grounding con Google Search

Usa Google Search para generar imágenes basadas en información reciente o en tiempo real.

#### Ejemplo de Prompt

```
Crea un gráfico simple pero elegante del partido de anoche del Real Madrid en La Liga
```

---

## Prompts para Editar Imágenes

### 1. Agregar y Eliminar Elementos

Proporciona una imagen y describe tu cambio. El modelo coincidirá con el estilo, iluminación y perspectiva de la imagen original.

#### Plantilla

```
Usando la imagen proporcionada de [sujeto], por favor [agregar/eliminar/modificar] 
[elemento] a/de la escena. Asegura que el cambio esté [descripción de cómo debe integrarse].
```

#### Ejemplo de Prompt

```
Usando la imagen proporcionada de mi gato, por favor agrega un pequeño sombrero 
de mago tejido en su cabeza. Haz que parezca que está sentado cómodamente y 
coincida con la iluminación suave de la foto.
```

---

### 2. Inpainting (Modificación Selectiva)

Especifica qué parte de una imagen modificar mientras mantienes el resto intacto.

#### Plantilla

```
Usando la imagen proporcionada de [ubicación/escena], cambia solo [elemento específico] 
para que sea [nueva descripción]. Mantén el resto de [lo que debe permanecer igual] sin cambios.
```

#### Ejemplo de Prompt

```
Usando la imagen proporcionada de una sala de estar, cambia solo el sofá azul 
para que sea un sofá chesterfield vintage de cuero marrón. Mantén el resto de 
la habitación, incluyendo los cojines del sofá y la iluminación, sin cambios.
```

---

### 3. Transferencia de Estilo

Proporciona una imagen y pide al modelo que recree su contenido en un estilo artístico diferente.

#### Plantilla

```
Transforma la fotografía proporcionada de [sujeto] al estilo artístico de 
[artista/estilo de arte]. Preserva la composición original pero renderízala 
con [descripción de elementos estilísticos].
```

#### Ejemplo de Prompt

```
Transforma la fotografía proporcionada de una calle de ciudad moderna de noche 
al estilo artístico de 'La Noche Estrellada' de Vincent van Gogh. Preserva la 
composición original de edificios y autos, pero renderiza todos los elementos 
con pinceladas arremolinadas de impasto y una paleta dramática de azules 
profundos y amarillos brillantes.
```

---

### 4. Composición Avanzada: Combinando Múltiples Imágenes

Proporciona múltiples imágenes como contexto para crear una nueva escena compuesta.

#### Plantilla

```
Crea una nueva imagen combinando los elementos de las imágenes proporcionadas.
Toma el [elemento de imagen 1] y colócalo con/sobre el [elemento de imagen 2].
La imagen final debe ser [descripción de la escena final].
```

#### Ejemplo de Prompt

```
Crea una foto de moda profesional para e-commerce. Toma el vestido azul floral
de la primera imagen y deja que la mujer de la segunda imagen lo use. Genera
una toma de cuerpo completo realista de la mujer usando el vestido, con la 
iluminación y sombras ajustadas para coincidir con el ambiente exterior.
```

---

### 5. Preservación de Detalles de Alta Fidelidad

Para asegurar que los detalles críticos (como un rostro o logo) se preserven durante una edición, descríbelos con gran detalle junto con tu solicitud de edición.

#### Plantilla

```
Usando las imágenes proporcionadas, coloca [elemento de imagen 2] sobre 
[elemento de imagen 1]. Asegura que las características de [elemento de imagen 1] 
permanezcan completamente sin cambios. El elemento agregado debe [descripción de 
cómo debe integrarse el elemento].
```

#### Ejemplo de Prompt

```
Toma la primera imagen de la mujer con cabello castaño, ojos azules y expresión
neutral. Agrega el logo de la segunda imagen a su camiseta negra. Asegura que
el rostro y las características de la mujer permanezcan completamente sin cambios.
El logo debe verse como si estuviera naturalmente impreso en la tela, siguiendo
los pliegues de la camisa.
```

---

## Relaciones de Aspecto y Resolución

El modelo por defecto coincide con el tamaño de la imagen de salida con el de tu imagen de entrada, o genera cuadrados 1:1.

### Relaciones de Aspecto Disponibles

| Relación | Descripción |
|----------|-------------|
| 1:1 | Cuadrado (Instagram posts) |
| 2:3 | Retrato (Pinterest) |
| 3:2 | Paisaje estándar |
| 3:4 | Retrato medio |
| 4:3 | Paisaje (presentaciones) |
| 4:5 | Instagram retrato |
| 5:4 | Paisaje ligero |
| 9:16 | Stories/Reels (vertical) |
| 16:9 | Widescreen (YouTube/covers) |
| 21:9 | Ultra-wide cinematográfico |

### Resoluciones por Modelo

**Gemini 2.5 Flash Image (Nano Banana)**

| Relación | Resolución | Tokens |
|----------|------------|--------|
| 1:1 | 1024x1024 | 1290 |
| 2:3 | 832x1248 | 1290 |
| 3:2 | 1248x832 | 1290 |
| 9:16 | 768x1344 | 1290 |
| 16:9 | 1344x768 | 1290 |
| 21:9 | 1536x672 | 1290 |

**Gemini 3 Pro Image Preview (Nano Banana Pro)**

| Relación | 1K | 2K | 4K |
|----------|----|----|----| 
| 1:1 | 1024x1024 | 2048x2048 | 4096x4096 |
| 2:3 | 848x1264 | 1696x2528 | 3392x5056 |
| 3:2 | 1264x848 | 2528x1696 | 5056x3392 |
| 9:16 | 768x1376 | 1536x2752 | 3072x5504 |
| 16:9 | 1376x768 | 2752x1536 | 5504x3072 |
| 21:9 | 1584x672 | 3168x1344 | 6336x2688 |

---

## Selección de Modelo

Elige el modelo mejor adaptado para tu caso de uso específico.

### Gemini 3 Pro Image Preview (Nano Banana Pro)

**Mejor para:**
- Producción de assets profesionales
- Instrucciones complejas
- Texto preciso y legible
- Imágenes de alta resolución (hasta 4K)
- Información en tiempo real (grounding con Google Search)
- Hasta 14 imágenes de referencia

**Características:**
- Proceso de "Thinking" que refina la composición
- Grounding con Google Search
- Resoluciones: 1K, 2K, 4K
- Mejor calidad pero más lento

### Gemini 2.5 Flash Image (Nano Banana)

**Mejor para:**
- Tareas de alto volumen
- Baja latencia
- Prototipos rápidos
- Generación masiva

**Características:**
- Optimizado para velocidad
- Resolución fija: 1024px
- Hasta 3 imágenes de referencia
- Más rápido y económico

---

## Ejemplo Completo: Generar Imagen para E-commerce

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

# Cargar imagen del producto
product_image = Image.open("/ruta/a/producto.png")

# Prompt descriptivo siguiendo las mejores prácticas
prompt = """
Una fotografía de producto de alta resolución, iluminada en estudio, del producto
mostrado en la imagen de referencia. El producto está presentado sobre una 
superficie de mármol blanco pulido.

La iluminación es una configuración de tres softboxes profesionales, creando
reflejos suaves y difusos sin sombras duras. El ángulo de cámara es ligeramente
elevado a 45 grados para mostrar todos los detalles del producto.

El fondo es un gradiente suave de gris claro a blanco. Ultra-realista con 
enfoque nítido en la textura y detalles del producto.

Mantén el producto con perfecta preservación de detalles de alta fidelidad.
"""

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[product_image, prompt],
    config=types.GenerateContentConfig(
        response_modalities=['Text', 'Image'],
        image_config=types.ImageConfig(
            aspect_ratio="4:3",
            image_size="2K"
        )
    )
)

for part in response.parts:
    if part.text is not None:
        print(f"Descripción del modelo: {part.text}")
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("producto_ecommerce.png")
        print("Imagen guardada como producto_ecommerce.png")
```

---

## Recursos Adicionales

- [Cookbook de ejemplos](https://colab.research.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Get_Started_Nano_Banana.ipynb)
- [Guía de Veo para generación de video](https://ai.google.dev/gemini-api/docs/video)
- [Modelos de Gemini](https://ai.google.dev/gemini-api/docs/models/gemini)
- [API por lotes para alto volumen](https://ai.google.dev/gemini-api/docs/batch-api)
