#!/usr/bin/env python3
"""
Permission Handler for Desktop Clients
Handles permission requests from web clients and provides user consent dialogs
"""

import json
import tkinter as tk
from tkinter import messagebox, ttk
import threading
import time
from datetime import datetime
from typing import Dict, Any, Optional, Callable

class PermissionHandler:
    """Handles permission requests and user consent for desktop streaming"""
    
    def __init__(self):
        self.permissions: Dict[str, Dict[str, Any]] = {}
        self.pending_requests: Dict[str, Dict[str, Any]] = {}
        self.permission_callback: Optional[Callable] = None
        
    def set_permission_callback(self, callback: Callable):
        """Set callback function to send permission responses"""
        self.permission_callback = callback
        
    def handle_permission_request(self, message: Dict[str, Any]) -> None:
        """Handle incoming permission request from web client"""
        permission_type = message.get('permissionType', 'unknown')
        request_id = message.get('requestId', 'unknown')
        web_client_id = message.get('webClientId', 'unknown')
        
        print(f"🔐 Permission request received:")
        print(f"   Type: {permission_type}")
        print(f"   Request ID: {request_id}")
        print(f"   Web Client: {web_client_id}")
        
        # Store pending request
        self.pending_requests[request_id] = {
            'permissionType': permission_type,
            'webClientId': web_client_id,
            'timestamp': datetime.now().isoformat(),
            'status': 'pending'
        }
        
        # Show permission dialog in separate thread
        dialog_thread = threading.Thread(
            target=self._show_permission_dialog,
            args=(permission_type, request_id, web_client_id),
            daemon=True
        )
        dialog_thread.start()
        
    def handle_permission_check(self, message: Dict[str, Any]) -> None:
        """Handle permission status check from web client"""
        permission_type = message.get('permissionType', 'unknown')
        web_client_id = message.get('webClientId', 'unknown')
        
        # Check if permission is granted
        permission_key = f"{web_client_id}_{permission_type}"
        granted = self.permissions.get(permission_key, {}).get('granted', False)
        
        # Send permission status response
        if self.permission_callback:
            response = {
                'type': 'permission_status',
                'permissionType': permission_type,
                'granted': granted,
                'reason': 'Permission checked' if granted else 'Permission not granted',
                'timestamp': datetime.now().isoformat()
            }
            self.permission_callback(response)
            
    def handle_permission_revoke(self, message: Dict[str, Any]) -> None:
        """Handle permission revocation from web client"""
        permission_type = message.get('permissionType', 'unknown')
        web_client_id = message.get('webClientId', 'unknown')
        
        # Revoke permission
        permission_key = f"{web_client_id}_{permission_type}"
        if permission_key in self.permissions:
            del self.permissions[permission_key]
            print(f"🚫 Permission revoked: {permission_type} for {web_client_id}")
            
            # Send revocation confirmation
            if self.permission_callback:
                response = {
                    'type': 'permission_revoked',
                    'permissionType': permission_type,
                    'reason': 'Permission revoked by web client',
                    'timestamp': datetime.now().isoformat()
                }
                self.permission_callback(response)
                
    def _show_permission_dialog(self, permission_type: str, request_id: str, web_client_id: str) -> None:
        """Show permission dialog to user"""
        try:
            # Create root window
            root = tk.Tk()
            root.withdraw()  # Hide main window
            
            # Prepare dialog message
            permission_messages = {
                'desktop_streaming': 'Desktop-Streaming und Bildschirmaufnahme',
                'file_access': 'Dateizugriff',
                'system_control': 'Systemsteuerung',
                'camera_access': 'Kamerazugriff',
                'microphone_access': 'Mikrofonzugriff'
            }
            
            permission_text = permission_messages.get(permission_type, permission_type)
            
            message = f"""
Eine Web-Anwendung möchte auf Ihren Computer zugreifen.

Berechtigung: {permission_text}
Web-Client: {web_client_id}
Zeitpunkt: {datetime.now().strftime('%H:%M:%S')}

Möchten Sie diese Berechtigung erteilen?

⚠️ Gewähren Sie nur vertrauenswürdigen Anwendungen Zugriff!
            """.strip()
            
            # Show permission dialog
            result = messagebox.askyesno(
                "Berechtigung erforderlich",
                message,
                icon='warning'
            )
            
            # Process user response
            self._process_permission_response(permission_type, request_id, web_client_id, result)
            
            root.destroy()
            
        except Exception as e:
            print(f"❌ Error showing permission dialog: {e}")
            # Default to deny on error
            self._process_permission_response(permission_type, request_id, web_client_id, False)
            
    def _process_permission_response(self, permission_type: str, request_id: str, web_client_id: str, granted: bool) -> None:
        """Process user's permission response"""
        permission_key = f"{web_client_id}_{permission_type}"
        
        if granted:
            # Store granted permission
            self.permissions[permission_key] = {
                'permissionType': permission_type,
                'webClientId': web_client_id,
                'granted': True,
                'grantedAt': datetime.now().isoformat(),
                'expiresAt': None  # No expiration for now
            }
            print(f"✅ Permission granted: {permission_type} for {web_client_id}")
        else:
            print(f"❌ Permission denied: {permission_type} for {web_client_id}")
            
        # Remove from pending requests
        if request_id in self.pending_requests:
            del self.pending_requests[request_id]
            
        # Send response via callback
        if self.permission_callback:
            response = {
                'type': 'permission_response',
                'permissionType': permission_type,
                'requestId': request_id,
                'granted': granted,
                'reason': 'User granted permission' if granted else 'User denied permission',
                'timestamp': datetime.now().isoformat()
            }
            self.permission_callback(response)
            
    def is_permission_granted(self, web_client_id: str, permission_type: str) -> bool:
        """Check if permission is granted for specific client and type"""
        permission_key = f"{web_client_id}_{permission_type}"
        permission = self.permissions.get(permission_key, {})
        
        # Check if permission exists and is granted
        if not permission.get('granted', False):
            return False
            
        # Check expiration (if implemented)
        expires_at = permission.get('expiresAt')
        if expires_at:
            # TODO: Implement expiration check
            pass
            
        return True
        
    def get_all_permissions(self) -> Dict[str, Dict[str, Any]]:
        """Get all granted permissions"""
        return self.permissions.copy()
        
    def revoke_permission(self, web_client_id: str, permission_type: str) -> bool:
        """Manually revoke a permission"""
        permission_key = f"{web_client_id}_{permission_type}"
        if permission_key in self.permissions:
            del self.permissions[permission_key]
            print(f"🚫 Permission manually revoked: {permission_type} for {web_client_id}")
            return True
        return False
        
    def cleanup_expired_permissions(self) -> None:
        """Clean up expired permissions (if expiration is implemented)"""
        # TODO: Implement permission expiration cleanup
        pass

# Example usage and testing
if __name__ == "__main__":
    print("🔐 Permission Handler Test")
    
    handler = PermissionHandler()
    
    # Mock callback function
    def mock_callback(response):
        print(f"📤 Sending response: {json.dumps(response, indent=2)}")
        
    handler.set_permission_callback(mock_callback)
    
    # Test permission request
    test_request = {
        'type': 'permission_request',
        'permissionType': 'desktop_streaming',
        'requestId': 'test-123',
        'webClientId': 'web-client-1',
        'timestamp': datetime.now().isoformat()
    }
    
    print("Testing permission request...")
    handler.handle_permission_request(test_request)
    
    # Keep the script running to show dialog
    try:
        time.sleep(10)  # Wait for user interaction
    except KeyboardInterrupt:
        print("\n👋 Permission Handler stopped")