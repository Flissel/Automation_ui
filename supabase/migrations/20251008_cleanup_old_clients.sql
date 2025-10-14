-- Cleanup old stale desktop clients
DELETE FROM active_desktop_clients WHERE client_id LIKE 'dual_screen_client_%';
