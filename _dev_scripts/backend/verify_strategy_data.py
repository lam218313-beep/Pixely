"""
Script de Verificación de Datos de Estrategia
Consulta directamente la base de datos para verificar:
1. Qué client_id tienen datos de estrategia
2. Cuántos nodos tiene cada cliente
3. Si hay duplicación de datos entre clientes
"""

import os
from supabase import create_client, Client
from dotenv import load_load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_KEY not found in environment")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 80)
print("VERIFICACIÓN DE DATOS DE ESTRATEGIA")
print("=" * 80)

# 1. Get all clients
print("\n1️⃣ Consultando todos los clientes...")
clients_response = supabase.table("clients").select("id, nombre").execute()
clients = clients_response.data

print(f"   Encontrados {len(clients)} clientes:")
for client in clients:
    print(f"   - {client['nombre']} (ID: {client['id']})")

# 2. Get all strategy nodes grouped by client_id
print("\n2️⃣ Consultando nodos de estrategia...")
strategy_response = supabase.table("strategy_nodes").select("*").execute()
all_nodes = strategy_response.data

print(f"   Total de nodos en la base de datos: {len(all_nodes)}")

# 3. Group nodes by client_id
nodes_by_client = {}
for node in all_nodes:
    client_id = node['client_id']
    if client_id not in nodes_by_client:
        nodes_by_client[client_id] = []
    nodes_by_client[client_id].append(node)

print(f"\n3️⃣ Nodos agrupados por cliente:")
for client_id, nodes in nodes_by_client.items():
    # Find client name
    client_name = next((c['nombre'] for c in clients if c['id'] == client_id), "DESCONOCIDO")
    
    print(f"\n   📊 Cliente: {client_name} (ID: {client_id})")
    print(f"      Total de nodos: {len(nodes)}")
    
    # Count by type
    types_count = {}
    for node in nodes:
        node_type = node['type']
        types_count[node_type] = types_count.get(node_type, 0) + 1
    
    print(f"      Distribución por tipo:")
    for node_type, count in types_count.items():
        print(f"        - {node_type}: {count}")
    
    # Show first 3 nodes as sample
    print(f"      Muestra de nodos:")
    for i, node in enumerate(nodes[:3]):
        print(f"        {i+1}. [{node['type']}] {node['label']}")

# 4. Check for potential issues
print(f"\n4️⃣ Verificación de problemas potenciales:")

# Check if any nodes have the same ID across different clients
node_ids = {}
for node in all_nodes:
    node_id = node['id']
    if node_id in node_ids:
        print(f"   ⚠️ DUPLICADO: Nodo ID '{node_id}' existe en múltiples clientes:")
        print(f"      - Cliente 1: {node_ids[node_id]}")
        print(f"      - Cliente 2: {node['client_id']}")
    else:
        node_ids[node_id] = node['client_id']

# Check for orphaned nodes (parent_id doesn't exist)
all_node_ids = set(node['id'] for node in all_nodes)
for node in all_nodes:
    if node['parent_id'] and node['parent_id'] not in all_node_ids:
        client_name = next((c['nombre'] for c in clients if c['id'] == node['client_id']), "DESCONOCIDO")
        print(f"   ⚠️ HUÉRFANO: Nodo '{node['label']}' (Cliente: {client_name}) tiene parent_id inválido: {node['parent_id']}")

# Check for nodes with type 'post' (should be 'concept')
post_nodes = [n for n in all_nodes if n['type'] == 'post']
if post_nodes:
    print(f"   ⚠️ TIPO INCORRECTO: {len(post_nodes)} nodos con type='post' (debería ser 'concept')")
    for node in post_nodes[:5]:
        client_name = next((c['nombre'] for c in clients if c['id'] == node['client_id']), "DESCONOCIDO")
        print(f"      - '{node['label']}' (Cliente: {client_name})")

print("\n" + "=" * 80)
print("VERIFICACIÓN COMPLETADA")
print("=" * 80)
