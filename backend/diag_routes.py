import sys
import os

# Add the current directory to sys.path to import main
sys.path.append(os.getcwd())

from main import app

print("--- REGISTERED ROUTES ---")
for route in app.routes:
    if hasattr(route, "path"):
        print(f"{route.methods} {route.path}")
