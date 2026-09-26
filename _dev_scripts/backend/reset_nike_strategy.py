"""
Script para Resetear Estrategia de Nike
Elimina todos los nodos existentes y crea solo el nodo raíz con nomenclatura correcta
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.database import db
import uuid

# Cliente Nike
NIKE_CLIENT_ID = "9f15d808-d39e-477b-8258-2cc20bbd46e7"
NIKE_BRAND_NAME = "Nike"

def reset_strategy(client_id: str, brand_name: str):
    """
    Resetea la estrategia del cliente eliminando todos los nodos
    y creando solo el nodo raíz con la nomenclatura correcta
    """
    print(f"\n{'='*80}")
    print(f"RESETEANDO ESTRATEGIA PARA: {brand_name}")
    print(f"{'='*80}\n")
    
    # 1. Obtener nodos actuales
    current_nodes = db.get_strategy_nodes(client_id)
    print(f"📊 Nodos actuales: {len(current_nodes)}")
    
    # 2. Crear solo el nodo raíz
    root_node = {
        "id": str(uuid.uuid4()),
        "type": "main",
        "label": f"Proyecto: {brand_name} Marketing",
        "description": "Estrategia General",
        "parent_id": None,
        "x": 0,
        "y": 0,
        "client_id": client_id,
        "suggested_format": None,
        "suggested_frequency": None,
        "tags": []
    }
    
    print(f"\n🔄 Eliminando {len(current_nodes)} nodos existentes...")
    print(f"✨ Creando nuevo nodo raíz: '{root_node['label']}'")
    
    # 3. Sincronizar (esto eliminará todos los nodos antiguos y creará el nuevo)
    db.sync_strategy_nodes(client_id, [root_node])
    
    print(f"\n✅ Estrategia reseteada exitosamente para {brand_name}")
    print(f"{'='*80}\n")
    
    # 4. Verificar
    new_nodes = db.get_strategy_nodes(client_id)
    print(f"📊 Nodos después del reset: {len(new_nodes)}")
    if new_nodes:
        print(f"   - {new_nodes[0]['label']}")

if __name__ == "__main__":
    reset_strategy(NIKE_CLIENT_ID, NIKE_BRAND_NAME)
