#!/usr/bin/env python3

import sys
sys.path.append('.')
sys.path.append('./app')

from app.main import app

print('=== All registered routes ===')
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        methods = list(route.methods) if route.methods else ['N/A']
        print(f'{methods} {route.path}')
    elif hasattr(route, 'path'):
        print(f'[MOUNT] {route.path}')
    else:
        print(f'[UNKNOWN] {route}')

print('\n=== Looking for health endpoints ===')
for route in app.routes:
    if hasattr(route, 'path') and 'health' in route.path.lower():
        methods = list(route.methods) if hasattr(route, 'methods') and route.methods else ['N/A']
        print(f'HEALTH ROUTE: {methods} {route.path}')