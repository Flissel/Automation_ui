#!/usr/bin/env python3
"""
Proxmox VE API Client for TRAE Remote Desktop Integration

This module provides a comprehensive client for interacting with Proxmox VE API
to manage virtual machines for the TRAE remote desktop system.

Author: TRAE Autonomous Programming Project
Version: 1.0.0
Date: 2024
"""

import asyncio
import aiohttp
import json
import ssl
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin
import logging
from dataclasses import dataclass

# Configure logging for debugging
logger = logging.getLogger(__name__)

@dataclass
class VMConfig:
    """Configuration class for VM creation and management"""
    vmid: int
    name: str
    memory: int = 4096  # MB
    cores: int = 2
    ostype: str = "win10"
    storage: str = "local-lvm"
    disk_size: str = "50G"
    network_bridge: str = "vmbr0"
    iso_path: Optional[str] = None
    template_id: Optional[int] = None

@dataclass
class VMStatus:
    """VM status information"""
    vmid: int
    name: str
    status: str  # running, stopped, suspended
    uptime: Optional[int] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[int] = None
    vnc_port: Optional[int] = None

class ProxmoxAPIError(Exception):
    """Custom exception for Proxmox API errors"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ProxmoxClient:
    """
    Proxmox VE API Client for TRAE Integration
    
    Provides methods to manage VMs, get status, and handle VNC connections
    for seamless integration with TRAE remote desktop system.
    """
    
    def __init__(self, host: str, username: str, password: str, port: int = 8006, verify_ssl: bool = False):
        """
        Initialize Proxmox client
        
        Args:
            host: Proxmox server hostname or IP
            username: Proxmox username (e.g., 'root@pam')
            password: Proxmox password
            port: Proxmox web interface port (default: 8006)
            verify_ssl: Whether to verify SSL certificates
        """
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self.verify_ssl = verify_ssl
        self.base_url = f"https://{host}:{port}/api2/json"
        self.session: Optional[aiohttp.ClientSession] = None
        self.auth_ticket: Optional[str] = None
        self.csrf_token: Optional[str] = None
        
        # SSL context for unverified connections
        self.ssl_context = ssl.create_default_context()
        if not verify_ssl:
            self.ssl_context.check_hostname = False
            self.ssl_context.verify_mode = ssl.CERT_NONE
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.disconnect()
    
    async def connect(self) -> None:
        """Establish connection and authenticate with Proxmox"""
        try:
            # Create HTTP session
            connector = aiohttp.TCPConnector(ssl=self.ssl_context)
            self.session = aiohttp.ClientSession(connector=connector)
            
            # Authenticate
            await self._authenticate()
            logger.info(f"Successfully connected to Proxmox at {self.host}")
            
        except Exception as e:
            logger.error(f"Failed to connect to Proxmox: {e}")
            raise ProxmoxAPIError(f"Connection failed: {e}")
    
    async def disconnect(self) -> None:
        """Close connection to Proxmox"""
        if self.session:
            await self.session.close()
            self.session = None
            logger.info("Disconnected from Proxmox")
    
    async def _authenticate(self) -> None:
        """Authenticate with Proxmox and get auth ticket"""
        auth_url = urljoin(self.base_url, "/access/ticket")
        auth_data = {
            "username": self.username,
            "password": self.password
        }
        
        async with self.session.post(auth_url, data=auth_data) as response:
            if response.status != 200:
                raise ProxmoxAPIError(f"Authentication failed: {response.status}")
            
            result = await response.json()
            if "data" not in result:
                raise ProxmoxAPIError("Invalid authentication response")
            
            self.auth_ticket = result["data"]["ticket"]
            self.csrf_token = result["data"]["CSRFPreventionToken"]
            
            # Set authentication headers for future requests
            self.session.headers.update({
                "Cookie": f"PVEAuthCookie={self.auth_ticket}",
                "CSRFPreventionToken": self.csrf_token
            })
    
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make authenticated request to Proxmox API"""
        if not self.session:
            raise ProxmoxAPIError("Not connected to Proxmox")
        
        url = urljoin(self.base_url, endpoint)
        
        try:
            async with self.session.request(method, url, data=data) as response:
                result = await response.json()
                
                if response.status >= 400:
                    error_msg = result.get("errors", {}).get("detail", f"HTTP {response.status}")
                    raise ProxmoxAPIError(error_msg, response.status)
                
                return result
                
        except aiohttp.ClientError as e:
            raise ProxmoxAPIError(f"Request failed: {e}")
    
    async def get_nodes(self) -> List[Dict[str, Any]]:
        """Get list of Proxmox nodes"""
        result = await self._make_request("GET", "/nodes")
        return result.get("data", [])
    
    async def get_vms(self, node: str = None) -> List[VMStatus]:
        """Get list of VMs on specified node or all nodes"""
        vms = []
        
        if node:
            nodes = [node]
        else:
            node_list = await self.get_nodes()
            nodes = [n["node"] for n in node_list]
        
        for node_name in nodes:
            try:
                result = await self._make_request("GET", f"/nodes/{node_name}/qemu")
                for vm_data in result.get("data", []):
                    vm_status = VMStatus(
                        vmid=vm_data["vmid"],
                        name=vm_data["name"],
                        status=vm_data["status"],
                        uptime=vm_data.get("uptime"),
                        cpu_usage=vm_data.get("cpu"),
                        memory_usage=vm_data.get("mem")
                    )
                    vms.append(vm_status)
            except ProxmoxAPIError as e:
                logger.warning(f"Failed to get VMs from node {node_name}: {e}")
        
        return vms
    
    async def get_vm_status(self, node: str, vmid: int) -> VMStatus:
        """Get detailed status of specific VM"""
        result = await self._make_request("GET", f"/nodes/{node}/qemu/{vmid}/status/current")
        vm_data = result["data"]
        
        return VMStatus(
            vmid=vmid,
            name=vm_data.get("name", f"VM-{vmid}"),
            status=vm_data["status"],
            uptime=vm_data.get("uptime"),
            cpu_usage=vm_data.get("cpu"),
            memory_usage=vm_data.get("mem")
        )
    
    async def create_vm(self, node: str, vm_config: VMConfig) -> bool:
        """Create new VM from configuration"""
        create_data = {
            "vmid": vm_config.vmid,
            "name": vm_config.name,
            "memory": vm_config.memory,
            "cores": vm_config.cores,
            "ostype": vm_config.ostype,
            "scsi0": f"{vm_config.storage}:{vm_config.disk_size}",
            "net0": f"virtio,bridge={vm_config.network_bridge}",
            "boot": "order=scsi0;ide2",
            "sockets": 1
        }
        
        if vm_config.iso_path:
            create_data["ide2"] = f"{vm_config.iso_path},media=cdrom"
        
        try:
            await self._make_request("POST", f"/nodes/{node}/qemu", create_data)
            logger.info(f"Successfully created VM {vm_config.vmid} ({vm_config.name})")
            return True
        except ProxmoxAPIError as e:
            logger.error(f"Failed to create VM: {e}")
            return False
    
    async def clone_vm(self, node: str, source_vmid: int, target_vmid: int, name: str, full_clone: bool = True) -> bool:
        """Clone existing VM or template"""
        clone_data = {
            "newid": target_vmid,
            "name": name,
            "full": 1 if full_clone else 0
        }
        
        try:
            await self._make_request("POST", f"/nodes/{node}/qemu/{source_vmid}/clone", clone_data)
            logger.info(f"Successfully cloned VM {source_vmid} to {target_vmid} ({name})")
            return True
        except ProxmoxAPIError as e:
            logger.error(f"Failed to clone VM: {e}")
            return False
    
    async def start_vm(self, node: str, vmid: int) -> bool:
        """Start VM"""
        try:
            await self._make_request("POST", f"/nodes/{node}/qemu/{vmid}/status/start")
            logger.info(f"Successfully started VM {vmid}")
            return True
        except ProxmoxAPIError as e:
            logger.error(f"Failed to start VM {vmid}: {e}")
            return False
    
    async def stop_vm(self, node: str, vmid: int, force: bool = False) -> bool:
        """Stop VM"""
        endpoint = f"/nodes/{node}/qemu/{vmid}/status/stop"
        data = {"forceStop": 1} if force else {}
        
        try:
            await self._make_request("POST", endpoint, data)
            logger.info(f"Successfully stopped VM {vmid}")
            return True
        except ProxmoxAPIError as e:
            logger.error(f"Failed to stop VM {vmid}: {e}")
            return False
    
    async def restart_vm(self, node: str, vmid: int) -> bool:
        """Restart VM"""
        try:
            await self._make_request("POST", f"/nodes/{node}/qemu/{vmid}/status/reboot")
            logger.info(f"Successfully restarted VM {vmid}")
            return True
        except ProxmoxAPIError as e:
            logger.error(f"Failed to restart VM {vmid}: {e}")
            return False
    
    async def get_vm_vnc_info(self, node: str, vmid: int) -> Dict[str, Any]:
        """Get VNC connection information for VM"""
        try:
            result = await self._make_request("POST", f"/nodes/{node}/qemu/{vmid}/vncproxy")
            vnc_data = result["data"]
            
            return {
                "port": vnc_data["port"],
                "ticket": vnc_data["ticket"],
                "upid": vnc_data["upid"],
                "user": vnc_data["user"],
                "cert": vnc_data.get("cert")
            }
        except ProxmoxAPIError as e:
            logger.error(f"Failed to get VNC info for VM {vmid}: {e}")
            raise
    
    async def get_vm_screenshot(self, node: str, vmid: int) -> bytes:
        """Get screenshot of VM display"""
        try:
            # Note: This endpoint might not be available in all Proxmox versions
            result = await self._make_request("GET", f"/nodes/{node}/qemu/{vmid}/screenshot")
            # The screenshot data would be in result["data"]
            # This is a placeholder - actual implementation depends on Proxmox version
            return b""  # Placeholder
        except ProxmoxAPIError as e:
            logger.error(f"Failed to get screenshot for VM {vmid}: {e}")
            raise
    
    async def delete_vm(self, node: str, vmid: int, purge: bool = False) -> bool:
        """Delete VM"""
        data = {"purge": 1} if purge else {}
        
        try:
            await self._make_request("DELETE", f"/nodes/{node}/qemu/{vmid}", data)
            logger.info(f"Successfully deleted VM {vmid}")
            return True
        except ProxmoxAPIError as e:
            logger.error(f"Failed to delete VM {vmid}: {e}")
            return False
    
    async def wait_for_vm_status(self, node: str, vmid: int, target_status: str, timeout: int = 60) -> bool:
        """Wait for VM to reach target status"""
        start_time = asyncio.get_event_loop().time()
        
        while True:
            try:
                vm_status = await self.get_vm_status(node, vmid)
                if vm_status.status == target_status:
                    return True
                
                current_time = asyncio.get_event_loop().time()
                if current_time - start_time > timeout:
                    logger.warning(f"Timeout waiting for VM {vmid} to reach status {target_status}")
                    return False
                
                await asyncio.sleep(2)  # Check every 2 seconds
                
            except ProxmoxAPIError as e:
                logger.error(f"Error checking VM status: {e}")
                return False

# Example usage and testing functions
async def test_proxmox_connection():
    """Test function for Proxmox connection"""
    # Example configuration - replace with actual values
    client = ProxmoxClient(
        host="78.46.234.142",
        username="root@pam",
        password="your_password_here",
        verify_ssl=False
    )
    
    try:
        async with client:
            # Test basic connectivity
            nodes = await client.get_nodes()
            print(f"Available nodes: {[n['node'] for n in nodes]}")
            
            # Get VMs
            vms = await client.get_vms()
            print(f"Found {len(vms)} VMs")
            
            for vm in vms:
                print(f"VM {vm.vmid}: {vm.name} - {vm.status}")
    
    except ProxmoxAPIError as e:
        print(f"Proxmox API Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    # Run test if executed directly
    asyncio.run(test_proxmox_connection())