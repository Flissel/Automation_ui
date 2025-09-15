/**
 * Stream Health Monitor for TRAE Unity AI Platform
 * 
 * Monitors the health of desktop streaming connections and automatically
 * restarts stuck or unhealthy streams to ensure continuous operation.
 * 
 * Features:
 * - Circular health checks for all active streams
 * - Automatic restart of stuck streams
 * - Configurable health thresholds
 * - Detailed logging and metrics
 * - Integration with WebSocket server
 */

import { EventEmitter } from 'events';

class StreamHealthMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration with defaults
        this.config = {
            // Health check intervals
            healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
            frameTimeoutThreshold: options.frameTimeoutThreshold || 60000, // 1 minute
            connectionTimeoutThreshold: options.connectionTimeoutThreshold || 120000, // 2 minutes
            
            // Restart thresholds
            maxRestartAttempts: options.maxRestartAttempts || 3,
            restartCooldownPeriod: options.restartCooldownPeriod || 300000, // 5 minutes
            
            // Health metrics thresholds
            minFrameRate: options.minFrameRate || 1, // Minimum frames per second
            maxLatency: options.maxLatency || 5000, // Maximum acceptable latency in ms
            
            // Logging
            enableDetailedLogging: options.enableDetailedLogging || true,
            logHealthMetrics: options.logHealthMetrics || false
        };
        
        // Stream tracking
        this.streams = new Map(); // clientId -> StreamHealthData
        this.healthCheckTimer = null;
        this.isMonitoring = false;
        
        // Metrics
        this.metrics = {
            totalHealthChecks: 0,
            totalRestarts: 0,
            totalStreamFailures: 0,
            averageLatency: 0,
            lastHealthCheckTime: null
        };
        
        this.log('StreamHealthMonitor initialized with config:', this.config);
    }
    
    /**
     * Start monitoring stream health
     */
    start() {
        if (this.isMonitoring) {
            this.log('Health monitor already running');
            return;
        }
        
        this.isMonitoring = true;
        this.log('Starting stream health monitoring...');
        
        // Start periodic health checks
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
        
        this.emit('monitoring_started');
    }
    
    /**
     * Stop monitoring stream health
     */
    stop() {
        if (!this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = false;
        
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        this.log('Stream health monitoring stopped');
        this.emit('monitoring_stopped');
    }
    
    /**
     * Register a new stream for monitoring
     */
    registerStream(clientId, clientType, websocket) {
        const streamData = {
            clientId,
            clientType,
            websocket,
            
            // Health tracking
            lastFrameTime: Date.now(),
            lastPingTime: Date.now(),
            lastPongTime: Date.now(),
            connectionTime: Date.now(),
            
            // Frame metrics
            frameCount: 0,
            totalFrames: 0,
            frameRate: 0,
            averageLatency: 0,
            
            // Health status
            isHealthy: true,
            isStreaming: false,
            consecutiveFailures: 0,
            restartAttempts: 0,
            lastRestartTime: null,
            
            // Error tracking
            lastError: null,
            errorCount: 0,
            
            // Performance metrics
            bytesReceived: 0,
            bytesPerSecond: 0,
            lastMetricsUpdate: Date.now()
        };
        
        this.streams.set(clientId, streamData);
        this.log(`Registered stream for monitoring: ${clientId} (${clientType})`);
        
        // Set up WebSocket event listeners for health tracking
        this.setupStreamListeners(streamData);
        
        this.emit('stream_registered', { clientId, clientType });
    }
    
    /**
     * Unregister a stream from monitoring
     */
    unregisterStream(clientId) {
        if (this.streams.has(clientId)) {
            const streamData = this.streams.get(clientId);
            this.streams.delete(clientId);
            this.log(`Unregistered stream: ${clientId}`);
            this.emit('stream_unregistered', { clientId });
        }
    }
    
    /**
     * Alias for unregisterStream for compatibility
     */
    unregisterClient(clientId) {
        this.unregisterStream(clientId);
    }
    
    /**
     * Update stream activity (called when frames are received)
     */
    updateStreamActivity(clientId, frameData = null) {
        const streamData = this.streams.get(clientId);
        if (!streamData) {
            return;
        }
        
        const now = Date.now();
        streamData.lastFrameTime = now;
        streamData.frameCount++;
        streamData.totalFrames++;
        
        // Calculate frame rate (frames per second over last 10 seconds)
        const timeWindow = 10000; // 10 seconds
        if (streamData.frameCount >= 10 || (now - streamData.lastMetricsUpdate) >= timeWindow) {
            const timeDiff = now - streamData.lastMetricsUpdate;
            streamData.frameRate = (streamData.frameCount / timeDiff) * 1000;
            streamData.frameCount = 0;
            streamData.lastMetricsUpdate = now;
        }
        
        // Update bytes received if frame data is provided
        if (frameData && frameData.frameData) {
            const frameSize = frameData.frameData.length;
            streamData.bytesReceived += frameSize;
            
            // Calculate bytes per second
            const timeDiff = now - streamData.lastMetricsUpdate;
            if (timeDiff >= 1000) { // Update every second
                streamData.bytesPerSecond = streamData.bytesReceived / (timeDiff / 1000);
                streamData.bytesReceived = 0;
            }
        }
        
        // Reset consecutive failures on successful frame
        streamData.consecutiveFailures = 0;
        streamData.isStreaming = true;
        
        if (this.config.logHealthMetrics && Math.random() < 0.01) { // Log 1% of updates
            this.log(`Stream activity updated: ${clientId} (FPS: ${streamData.frameRate.toFixed(2)})`);
        }
    }
    
    /**
     * Update ping/pong activity
     */
    updatePingActivity(clientId, type = 'ping') {
        const streamData = this.streams.get(clientId);
        if (!streamData) {
            return;
        }
        
        const now = Date.now();
        if (type === 'ping') {
            streamData.lastPingTime = now;
        } else if (type === 'pong') {
            streamData.lastPongTime = now;
            // Calculate latency
            const latency = now - streamData.lastPingTime;
            streamData.averageLatency = (streamData.averageLatency + latency) / 2;
        }
    }
    
    /**
     * Perform comprehensive health check on all streams
     */
    performHealthCheck() {
        this.metrics.totalHealthChecks++;
        this.metrics.lastHealthCheckTime = Date.now();
        
        const now = Date.now();
        let healthyStreams = 0;
        let unhealthyStreams = 0;
        
        this.log('🔍 Performing health check on all streams...');
        
        for (const [clientId, streamData] of this.streams) {
            const health = this.checkStreamHealth(streamData, now);
            
            if (health.isHealthy) {
                healthyStreams++;
                streamData.isHealthy = true;
                streamData.consecutiveFailures = 0;
            } else {
                unhealthyStreams++;
                streamData.isHealthy = false;
                streamData.consecutiveFailures++;
                
                this.log(`⚠️ Unhealthy stream detected: ${clientId}`, health.issues);
                
                // Attempt to restart if thresholds are met
                if (this.shouldRestartStream(streamData)) {
                    this.restartStream(streamData);
                }
            }
        }
        
        // Log health summary
        this.log(`Health check complete: ${healthyStreams} healthy, ${unhealthyStreams} unhealthy streams`);
        
        // Emit health check event
        this.emit('health_check_complete', {
            totalStreams: this.streams.size,
            healthyStreams,
            unhealthyStreams,
            metrics: this.metrics
        });
    }
    
    /**
     * Check the health of a specific stream
     */
    checkStreamHealth(streamData, now = Date.now()) {
        const health = {
            isHealthy: true,
            issues: []
        };
        
        // Check WebSocket connection state
        if (!streamData.websocket || streamData.websocket.readyState !== 1) { // WebSocket.OPEN = 1
            health.isHealthy = false;
            health.issues.push('WebSocket connection not open');
        }
        
        // Check frame timeout
        const timeSinceLastFrame = now - streamData.lastFrameTime;
        if (timeSinceLastFrame > this.config.frameTimeoutThreshold) {
            health.isHealthy = false;
            health.issues.push(`No frames received for ${Math.round(timeSinceLastFrame / 1000)}s`);
        }
        
        // Check connection timeout
        const timeSinceLastPong = now - streamData.lastPongTime;
        if (timeSinceLastPong > this.config.connectionTimeoutThreshold) {
            health.isHealthy = false;
            health.issues.push(`No pong received for ${Math.round(timeSinceLastPong / 1000)}s`);
        }
        
        // Check frame rate
        if (streamData.isStreaming && streamData.frameRate < this.config.minFrameRate) {
            health.isHealthy = false;
            health.issues.push(`Low frame rate: ${streamData.frameRate.toFixed(2)} FPS`);
        }
        
        // Check latency
        if (streamData.averageLatency > this.config.maxLatency) {
            health.isHealthy = false;
            health.issues.push(`High latency: ${Math.round(streamData.averageLatency)}ms`);
        }
        
        return health;
    }
    
    /**
     * Determine if a stream should be restarted
     */
    shouldRestartStream(streamData) {
        // Check if we've exceeded max restart attempts
        if (streamData.restartAttempts >= this.config.maxRestartAttempts) {
            return false;
        }
        
        // Check cooldown period
        if (streamData.lastRestartTime) {
            const timeSinceRestart = Date.now() - streamData.lastRestartTime;
            if (timeSinceRestart < this.config.restartCooldownPeriod) {
                return false;
            }
        }
        
        // Check consecutive failures threshold
        return streamData.consecutiveFailures >= 3;
    }
    
    /**
     * Restart a stuck or unhealthy stream
     */
    async restartStream(streamData) {
        const { clientId, clientType } = streamData;
        
        this.log(`🔄 Attempting to restart stream: ${clientId} (attempt ${streamData.restartAttempts + 1})`);
        
        streamData.restartAttempts++;
        streamData.lastRestartTime = Date.now();
        this.metrics.totalRestarts++;
        
        try {
            // Emit restart event for external handling
            this.emit('stream_restart_requested', {
                clientId,
                clientType,
                restartAttempt: streamData.restartAttempts,
                reason: 'Health check failure'
            });
            
            // Reset stream metrics
            streamData.frameCount = 0;
            streamData.frameRate = 0;
            streamData.consecutiveFailures = 0;
            streamData.lastFrameTime = Date.now();
            streamData.lastPingTime = Date.now();
            streamData.lastPongTime = Date.now();
            
            this.log(`✅ Stream restart initiated: ${clientId}`);
            
        } catch (error) {
            this.log(`❌ Failed to restart stream ${clientId}:`, error.message);
            streamData.lastError = error.message;
            streamData.errorCount++;
            this.metrics.totalStreamFailures++;
        }
    }
    
    /**
     * Set up WebSocket event listeners for health tracking
     */
    setupStreamListeners(streamData) {
        const { websocket, clientId } = streamData;
        
        // Track connection close
        websocket.on('close', () => {
            this.log(`WebSocket closed for stream: ${clientId}`);
            streamData.isHealthy = false;
            this.emit('stream_disconnected', { clientId });
        });
        
        // Track connection errors
        websocket.on('error', (error) => {
            this.log(`WebSocket error for stream ${clientId}:`, error.message);
            streamData.lastError = error.message;
            streamData.errorCount++;
            streamData.isHealthy = false;
        });
    }
    
    /**
     * Get health status for all streams
     */
    getHealthStatus() {
        const status = {
            isMonitoring: this.isMonitoring,
            totalStreams: this.streams.size,
            healthyStreams: 0,
            unhealthyStreams: 0,
            streams: {},
            metrics: { ...this.metrics }
        };
        
        for (const [clientId, streamData] of this.streams) {
            const health = this.checkStreamHealth(streamData);
            
            if (health.isHealthy) {
                status.healthyStreams++;
            } else {
                status.unhealthyStreams++;
            }
            
            status.streams[clientId] = {
                clientId: streamData.clientId,
                clientType: streamData.clientType,
                isHealthy: health.isHealthy,
                isStreaming: streamData.isStreaming,
                frameRate: streamData.frameRate,
                averageLatency: streamData.averageLatency,
                restartAttempts: streamData.restartAttempts,
                consecutiveFailures: streamData.consecutiveFailures,
                totalFrames: streamData.totalFrames,
                connectionTime: streamData.connectionTime,
                lastFrameTime: streamData.lastFrameTime,
                issues: health.issues
            };
        }
        
        return status;
    }
    
    /**
     * Get health status for a specific stream
     */
    getStreamHealth(clientId) {
        const streamData = this.streams.get(clientId);
        if (!streamData) {
            return null;
        }
        
        const health = this.checkStreamHealth(streamData);
        
        return {
            clientId: streamData.clientId,
            clientType: streamData.clientType,
            isHealthy: health.isHealthy,
            isStreaming: streamData.isStreaming,
            frameRate: streamData.frameRate,
            averageLatency: streamData.averageLatency,
            restartAttempts: streamData.restartAttempts,
            consecutiveFailures: streamData.consecutiveFailures,
            totalFrames: streamData.totalFrames,
            connectionTime: streamData.connectionTime,
            lastFrameTime: streamData.lastFrameTime,
            lastError: streamData.lastError,
            issues: health.issues
        };
    }
    
    /**
     * Reset health metrics for a stream
     */
    resetStreamHealth(clientId) {
        const streamData = this.streams.get(clientId);
        if (!streamData) {
            return false;
        }
        
        streamData.consecutiveFailures = 0;
        streamData.restartAttempts = 0;
        streamData.lastRestartTime = null;
        streamData.errorCount = 0;
        streamData.lastError = null;
        streamData.isHealthy = true;
        
        this.log(`Reset health metrics for stream: ${clientId}`);
        return true;
    }
    
    /**
     * Logging utility
     */
    log(message, ...args) {
        if (this.config.enableDetailedLogging) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [StreamHealthMonitor] ${message}`, ...args);
        }
    }
}

export default StreamHealthMonitor;