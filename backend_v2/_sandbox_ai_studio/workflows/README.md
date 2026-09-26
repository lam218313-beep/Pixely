# 📁 Workflows de ComfyUI

Este directorio contiene los workflows (recetas) de ComfyUI para cada formato de publicación.

## Estructura

```
workflows/
├── README.md           # Este archivo
├── product_hero.json   # Formato: Producto Hero / E-commerce
├── service.json        # Formato: Servicio / Consultoría
├── experience.json     # Formato: Experiencia / Lifestyle
├── promotional.json    # Formato: Promocional / Ofertas
└── ad_impact.json      # Formato: Anuncio / High Impact
```

## Cómo funcionan los Workflows

### Variables Dinámicas

Los workflows usan placeholders `{{VARIABLE}}` que el backend reemplaza en tiempo de ejecución:

```json
{
  "class_type": "CLIPTextEncode",
  "inputs": {
    "text": "{{PROMPT}}",  // ← Se reemplaza por el prompt real
    "clip": ["5", 0]
  }
}
```

### Variables Comunes

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `{{PROMPT}}` | string | Prompt principal de generación |
| `{{NEGATIVE_PROMPT}}` | string | Lo que queremos evitar |
| `{{SEED}}` | int | Semilla para reproducibilidad |
| `{{STEPS}}` | int | Pasos de generación (20-50) |
| `{{CFG_SCALE}}` | float | Adherencia al prompt (5-15) |
| `{{WIDTH}}` | int | Ancho de imagen |
| `{{HEIGHT}}` | int | Alto de imagen |

### Variables por Formato

#### Producto Hero
- `{{PRODUCT_IMAGE}}` - Nombre del archivo PNG del producto
- `{{COMPOSITION_REF}}` - Referencia de composición
- `{{SURFACE_TEXTURE}}` - Textura de superficie
- `{{LIGHT_REF}}` - Referencia de iluminación

#### Servicio
- `{{FACE_PHOTOS}}` - Array de nombres de fotos de rostro
- `{{DEMOGRAPHIC}}` - Descripción demográfica
- `{{POSE_REF}}` - Referencia de pose
- `{{BACKGROUND_IMAGE}}` - Foto del entorno

#### Experiencia
- `{{SPACE_IMAGE}}` - Foto del lugar
- `{{HANDS_FEET}}` - Elemento humano parcial
- `{{MOOD_REF}}` - Referencia de mood/color grading
- `{{LIGHTING_TEMPERATURE}}` - Kelvin (3500-6500)

#### Promocional
- `{{LAYOUT_MASK}}` - Máscara B/N de zonas
- `{{PRIMARY_COLOR}}` - Color HEX primario
- `{{SECONDARY_COLOR}}` - Color HEX secundario
- `{{ACCENT_COLOR}}` - Color HEX de acento

#### Anuncio
- `{{CONCEPT_REF}}` - Referencia de concepto visual
- `{{HOOK_ELEMENT}}` - Elemento disruptivo
- `{{HOOK_PROMPT}}` - Prompt del gancho visual
- `{{DENOISE_STRENGTH}}` - Fuerza de creatividad

## Cómo crear/editar workflows

### Opción 1: ComfyUI GUI (Recomendado)

1. Abre ComfyUI en el navegador (RunPod)
2. Diseña tu workflow con nodos
3. Click derecho → Save (API Format)
4. Edita el JSON para agregar placeholders `{{VARIABLE}}`

### Opción 2: Editar JSON directamente

Los workflows son JSON estándar. Cada nodo tiene:
- `class_type`: Tipo de nodo (ej: "KSampler")
- `inputs`: Parámetros del nodo
- ID numérico como key ("3", "4", etc.)

## Metadata del Workflow

Cada workflow debe tener una sección `_meta` al inicio:

```json
{
  "_meta": {
    "name": "Product Hero",
    "version": "1.0.0",
    "description": "Template para productos tipo Hero",
    "format": "producto",
    "required_inputs": ["PRODUCT_IMAGE", "PROMPT"],
    "optional_inputs": ["COMPOSITION_REF", "LIGHT_REF"]
  },
  // ... nodos del workflow
}
```

## Testing de Workflows

Para probar un workflow localmente:

```python
import json
from services.comfyui_service import ComfyUIService

async def test_workflow():
    service = ComfyUIService()
    
    # Verificar que ComfyUI esté corriendo
    if not await service.health_check():
        print("❌ ComfyUI no está respondiendo")
        return
    
    # Probar generación
    result = await service.generate_product_hero(
        product_image="base64...",
        prompt="Perfume bottle on marble surface, golden hour lighting"
    )
    
    print(f"✅ Generadas {len(result['images'])} imágenes")
    print(f"⏱ Tiempo: {result['generation_time']}s")
```

## Nodos Custom Requeridos

Para que los workflows funcionen, ComfyUI debe tener instalados:

- **ComfyUI-Manager** - Gestión de nodos
- **ComfyUI_IPAdapter_plus** - IP-Adapter para consistencia de estilo
- **comfyui_controlnet_aux** - ControlNet preprocesadores
- **ComfyUI-FLUX** - Soporte para FLUX.1

Ver: `docs/RUNPOD_COMFYUI_SETUP.md` para instrucciones de instalación.
