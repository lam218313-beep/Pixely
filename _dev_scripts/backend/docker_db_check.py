
from app.services.database import db

CLIENT_ID = "9f15d808-d39e-477b-8258-2cc20bbd46e7"

print(f"Checking strategy nodes for {CLIENT_ID}...")
try:
    nodes = db.get_strategy_nodes(CLIENT_ID)
    print(f"Nodes found: {len(nodes)}")
    if nodes:
        print(f"Sample node: {nodes[0].get('label')}")
except Exception as e:
    print(f"Error: {e}")
