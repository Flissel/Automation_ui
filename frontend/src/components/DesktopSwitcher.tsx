import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { errorHandlingService } from '../services/ErrorHandlingService';

interface DesktopTarget {
  target_id: string;
  name: string;
  target_type: 'docker' | 'ssh' | 'vm';
  is_active: boolean;
  connection_info?: {
    host?: string;
    port?: number;
    username?: string;
  };
}

interface DesktopStatus {
  current_desktop: string;
  available_targets: DesktopTarget[];
}

interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
}

const DesktopSwitcher: React.FC = () => {
  const [desktopStatus, setDesktopStatus] = useState<DesktopStatus | null>(null);
  const [sshConnections, setSshConnections] = useState<SSHConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddSSH, setShowAddSSH] = useState(false);
  const [newSSH, setNewSSH] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: ''
  });

  const fetchDesktopStatus = async () => {
    try {
      // Fetch available desktop targets
      const targetsResponse = await api.desktop.getDesktopTargets();
      if (targetsResponse.success) {
        // Fetch current desktop
        const currentResponse = await api.desktop.getDesktopStatus();
        const currentDesktop = currentResponse.success ? currentResponse.data : null;
        
        setDesktopStatus({
          current_desktop: currentDesktop?.name || 'Unknown',
          available_targets: targetsResponse.data || []
        });
      } else {
        throw new Error(targetsResponse.error || 'Failed to fetch desktop targets');
      }
    } catch (error) {
      console.error('Error fetching desktop status:', error);
    }
  };

  const fetchSSHConnections = async () => {
    try {
      const response = await api.desktop.getSSHConnections();
      if (response.success) {
        setSshConnections(response.data.connections || []);
      } else {
        throw new Error(response.error || 'Failed to fetch SSH connections');
      }
    } catch (error) {
      console.error('Error fetching SSH connections:', error);
    }
  };

  const handleSwitchDesktop = async (targetId: string) => {
    try {
      const response = await api.desktop.switchDesktop(targetId);
      if (response.success) {
        toast.success(response.data.message || 'Desktop switched successfully');
        fetchDesktopStatus();
      } else {
        throw new Error(response.error || 'Failed to switch desktop');
      }
    } catch (error) {
      console.error('Error switching desktop:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to switch desktop'),
        {
          operation: 'desktop_switch',
          targetId,
          retryFunction: () => handleSwitchDesktop(targetId)
        }
      );
    }
  };

  const addSSHConnection = async () => {
    if (!newSSH.name || !newSSH.host || !newSSH.username) {
      errorHandlingService.handleError(
        new Error('Please fill in all required fields'),
        {
          operation: 'ssh_connection_validation',
          category: 'USER_INPUT',
          missingFields: {
            name: !newSSH.name,
            host: !newSSH.host,
            username: !newSSH.username
          }
        }
      );
      return;
    }

    try {
      const response = await api.desktop.addSSHConnection(newSSH);
      if (response.success) {
        toast.success(response.data.message || 'SSH connection added successfully');
        setShowAddSSH(false);
        setNewSSH({ name: '', host: '', port: 22, username: '', password: '' });
        await fetchSSHConnections();
        await fetchDesktopStatus();
      } else {
        throw new Error(response.error || 'Failed to add SSH connection');
      }
    } catch (error) {
      console.error('Error adding SSH connection:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to add SSH connection'),
        {
          operation: 'ssh_connection_add',
          category: 'NETWORK',
          connectionDetails: {
            name: newSSH.name,
            host: newSSH.host,
            port: newSSH.port,
            username: newSSH.username
          },
          retryFunction: () => addSSHConnection()
        }
      );
    }
  };

  const handleConnectSSH = async (connectionId: string) => {
    try {
      const response = await api.desktop.connectSSH(connectionId);
      if (response.success) {
        toast.success(response.data.message || 'SSH connected successfully');
        fetchSSHConnections();
        fetchDesktopStatus();
      } else {
        throw new Error(response.error || 'Failed to connect SSH');
      }
    } catch (error) {
      console.error('Error connecting SSH:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to connect SSH'),
        {
          operation: 'ssh_connection_connect',
          category: 'NETWORK',
          connectionId,
          retryFunction: () => handleConnectSSH(connectionId)
        }
      );
    }
  };

  const handleDisconnectSSH = async (connectionId: string) => {
    try {
      const response = await api.desktop.disconnectSSH(connectionId);
      if (response.success) {
        toast.success(response.data.message || 'SSH disconnected successfully');
        fetchSSHConnections();
        fetchDesktopStatus();
      } else {
        throw new Error(response.error || 'Failed to disconnect SSH');
      }
    } catch (error) {
      console.error('Error disconnecting SSH:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to disconnect SSH'),
        {
          operation: 'ssh_connection_disconnect',
          category: 'NETWORK',
          connectionId,
          retryFunction: () => handleDisconnectSSH(connectionId)
        }
      );
    }
  };

  useEffect(() => {
    fetchDesktopStatus();
    fetchSSHConnections();
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchDesktopStatus();
      fetchSSHConnections();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
        return '#10b981';
      case 'connecting':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '12px',
  };

  const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: color,
  });

  return (
    <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
      {/* Desktop Control Card */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🖥️ Desktop-Umschaltung
        </h3>
        
        {desktopStatus && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
              Aktueller Desktop: 
              <span style={badgeStyle('#6b7280')}>{desktopStatus.current_desktop}</span>
            </label>
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {desktopStatus?.available_targets?.map((target) => (
            <div
              key={target.target_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                backgroundColor: '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>
                  {target.target_type === 'docker' ? '🐳' : target.target_type === 'ssh' ? '🖥️' : '💻'}
                </span>
                <div>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{target.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {target.target_type.toUpperCase()}
                    {target.connection_info?.host && ` - ${target.connection_info.host}:${target.connection_info.port}`}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={badgeStyle(getStatusColor(target.is_active ? 'active' : 'available'))}>
                  {target.is_active ? 'Aktiv' : 'Verfügbar'}
                </span>
                
                <button
                  style={{
                    ...buttonStyle,
                    backgroundColor: target.is_active ? '#f3f4f6' : '#3b82f6',
                    color: target.is_active ? '#374151' : 'white',
                  }}
                  onClick={() => handleSwitchDesktop(target.target_id)}
                  disabled={loading || target.is_active}
                >
                  {target.is_active ? 'Aktiv' : 'Wechseln'}
                </button>
              </div>
            </div>
          ))}
          
          {(!desktopStatus?.available_targets || desktopStatus.available_targets.length === 0) && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              Keine Desktop-Ziele verfügbar
            </div>
          )}
        </div>
      </div>

      {/* SSH Connections Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔗 SSH-Verbindungen
          </h3>
          
          <button
            style={primaryButtonStyle}
            onClick={() => setShowAddSSH(true)}
          >
            ➕ SSH hinzufügen
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sshConnections.map((connection) => (
            <div
              key={connection.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                backgroundColor: '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>🖥️</span>
                <div>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{connection.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {connection.username}@{connection.host}:{connection.port}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={badgeStyle(getStatusColor(connection.status))}>
                  {connection.status}
                </span>
                
                {connection.status === 'connected' ? (
                  <button
                    style={secondaryButtonStyle}
                    onClick={() => handleDisconnectSSH(connection.id)}
                  >
                    📡 Trennen
                  </button>
                ) : (
                  <button
                    style={primaryButtonStyle}
                    onClick={() => handleConnectSSH(connection.id)}
                  >
                    🔌 Verbinden
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {sshConnections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              Keine SSH-Verbindungen konfiguriert
            </div>
          )}
        </div>
      </div>

      {/* Add SSH Modal */}
      {showAddSSH && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              Neue SSH-Verbindung
            </h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Name</label>
              <input
                style={inputStyle}
                value={newSSH.name}
                onChange={(e) => setNewSSH({ ...newSSH, name: e.target.value })}
                placeholder="Mein PC"
              />
              
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Host</label>
              <input
                style={inputStyle}
                value={newSSH.host}
                onChange={(e) => setNewSSH({ ...newSSH, host: e.target.value })}
                placeholder="192.168.1.100"
              />
              
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Port</label>
              <input
                style={inputStyle}
                type="number"
                value={newSSH.port}
                onChange={(e) => setNewSSH({ ...newSSH, port: parseInt(e.target.value) })}
              />
              
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Benutzername</label>
              <input
                style={inputStyle}
                value={newSSH.username}
                onChange={(e) => setNewSSH({ ...newSSH, username: e.target.value })}
                placeholder="user"
              />
              
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Passwort</label>
              <input
                style={inputStyle}
                type="password"
                value={newSSH.password}
                onChange={(e) => setNewSSH({ ...newSSH, password: e.target.value })}
              />
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  style={secondaryButtonStyle}
                  onClick={() => setShowAddSSH(false)}
                >
                  Abbrechen
                </button>
                <button
                  style={primaryButtonStyle}
                  onClick={addSSHConnection}
                >
                  Verbindung hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopSwitcher;