from app.main import create_app

app = create_app()
print('All routes:')
for route in app.routes:
    if hasattr(route, 'path'):
        print(f'  {route.methods} {route.path}')

print('\nLooking for snapshot routes...')
snapshot_routes = [route for route in app.routes if hasattr(route, 'path') and 'snapshot' in route.path]
print(f'Found {len(snapshot_routes)} snapshot routes')
for route in snapshot_routes:
    print(f'  {route.methods} {route.path}')