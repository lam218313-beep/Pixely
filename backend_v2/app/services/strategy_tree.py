"""
Strategy tree layout
====================
Turns the strategy generator's JSON tree (objectives → strategies → concepts) into
flat nodes with canvas coordinates for the Estrategia view.
"""


def convert_tree_to_nodes(client_id: str, tree_data: dict) -> list[dict]:
    """
    Convierte el JSON jerárquico de IA en una lista plana de Nodos con coordenadas (X, Y)
    para el Canvas de Estrategia del Frontend.
    """
    import uuid
    nodes = []
    
    # Configuración de espaciado visual
    X_GAP = 350  # Espacio horizontal entre niveles
    Y_GAP_OBJ = 400 # Espacio vertical entre objetivos
    Y_GAP_STRAT = 180 # Espacio vertical entre estrategias
    
    # 1. Nodo Raíz (La Marca/Estrategia Central)
    root_id = "root"
    nodes.append({
        "id": root_id, 
        "type": "main", 
        "label": tree_data.get("root_label", "Estrategia"), 
        "description": "Núcleo Estratégico",
        "x": 0, "y": 0, 
        "parent_id": None, 
        "client_id": client_id
    })

    objectives = tree_data.get("objectives", [])
    
    # Calcular offset vertical inicial para centrar el árbol
    total_height = len(objectives) * Y_GAP_OBJ
    start_y = -(total_height / 2) + (Y_GAP_OBJ / 2)

    for i, obj in enumerate(objectives):
        obj_y = start_y + (i * Y_GAP_OBJ)
        obj_id = str(uuid.uuid4())
        
        # Nivel 1: Objetivos
        nodes.append({
            "id": obj_id, 
            "type": "secondary", 
            "label": obj["title"],
            "description": obj.get("rationale", ""), # Aquí va el cruce (Por qué este objetivo)
            "x": X_GAP, 
            "y": obj_y, 
            "parent_id": root_id, 
            "client_id": client_id
        })
        
        strategies = obj.get("strategies", [])
        for j, strat in enumerate(strategies):
            # Sub-distribución vertical para estrategias
            strat_y = obj_y + ((j - 0.5) * Y_GAP_STRAT) 
            strat_id = str(uuid.uuid4())
            
            # Nivel 2: Estrategias
            nodes.append({
                "id": strat_id, 
                "type": "secondary", 
                "label": strat["title"],
                "description": "Estrategia Táctica",
                "x": X_GAP * 2, 
                "y": strat_y, 
                "parent_id": obj_id, 
                "client_id": client_id
            })
            
            
            # Changed from 'actions' to 'concepts' for Strategy v2 Playbook
            concepts = strat.get("concepts", strat.get("actions", []))  # Fallback for backwards compat
            for k, concept in enumerate(concepts):
                # Nivel 3: Conceptos/Arquetipos (Reemplaza Posts específicos)
                concept_y = strat_y + ((k - 1) * 90) # Más apiñados
                
                # Handle both old format (actions with title) and new format (concepts with label)
                label = concept.get("label", concept.get("title", "Concepto"))
                description = concept.get("description", "")
                suggested_format = concept.get("suggested_format", concept.get("format", "post"))
                suggested_frequency = concept.get("suggested_frequency", "medium")
                tags = concept.get("tags", [])
                
                nodes.append({
                    "id": str(uuid.uuid4()), 
                    "type": "concept", # Changed from "post" for Strategy v2
                    "label": label,
                    "description": description,
                    "suggested_format": suggested_format,
                    "suggested_frequency": suggested_frequency,
                    "tags": tags,
                    "x": X_GAP * 3, 
                    "y": concept_y, 
                    "parent_id": strat_id, 
                    "client_id": client_id
                })

    return nodes
