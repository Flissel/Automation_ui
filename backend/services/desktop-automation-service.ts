// Desktop Automation Service
// Extended from Supabase desktop-actions function for virtual desktop management

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface AutomationAction {
  type: 'click' | 'type' | 'key' | 'screenshot' | 'scroll' | 'wait';
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  amount?: number;
}

interface AutomationRequest {
  actions: AutomationAction[];
  desktopId?: string;
  sessionId?: string;
}

interface AutomationResponse {
  success: boolean;
  results: any[];
  error?: string;
  screenshots?: string[];
}

class DesktopAutomationService {
  private port: number;
  private activeDesktops: Map<string, any> = new Map();

  constructor(port: number = 8002) {
    this.port = port;
  }

  async start() {
    console.log(`🤖 Desktop Automation Service starting on port ${this.port}`);
    
    await serve(this.handleRequest.bind(this), { port: this.port });
  }

  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      switch (path) {
        case '/health':
          return this.handleHealth();
        
        case '/automation/execute':
          if (method === 'POST') {
            return await this.handleExecuteActions(request);
          }
          break;
        
        case '/automation/screenshot':
          if (method === 'POST') {
            return await this.handleScreenshot(request);
          }
          break;
        
        case '/automation/status':
          if (method === 'GET') {
            return this.handleStatus();
          }
          break;
        
        default:
          return new Response('Not Found', { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
          });
      }
    } catch (error) {
      console.error('Request error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method Not Allowed', { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }

  private handleHealth(): Response {
    return new Response(JSON.stringify({
      status: 'healthy',
      service: 'desktop-automation',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleExecuteActions(request: Request): Promise<Response> {
    const body: AutomationRequest = await request.json();
    const { actions, desktopId, sessionId } = body;

    console.log(`Executing ${actions.length} actions for desktop ${desktopId}`);

    const results: any[] = [];
    const screenshots: string[] = [];

    try {
      for (const action of actions) {
        const result = await this.executeAction(action);
        results.push(result);

        // Take screenshot after certain actions
        if (['click', 'type', 'key'].includes(action.type)) {
          const screenshot = await this.takeScreenshot();
          if (screenshot) {
            screenshots.push(screenshot);
          }
        }

        // Wait between actions
        await this.wait(500);
      }

      const response: AutomationResponse = {
        success: true,
        results,
        screenshots
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Action execution error:', error);
      
      const response: AutomationResponse = {
        success: false,
        results,
        error: error.message,
        screenshots
      };

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async executeAction(action: AutomationAction): Promise<any> {
    console.log(`Executing action: ${action.type}`, action);

    switch (action.type) {
      case 'click':
        return await this.simulateClick(action.x!, action.y!);
      
      case 'type':
        return await this.simulateType(action.text!);
      
      case 'key':
        return await this.simulateKey(action.key!);
      
      case 'screenshot':
        return await this.takeScreenshot();
      
      case 'scroll':
        return await this.simulateScroll(action.direction!, action.amount || 3);
      
      case 'wait':
        await this.wait(action.duration || 1000);
        return { type: 'wait', duration: action.duration || 1000 };
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async simulateClick(x: number, y: number): Promise<any> {
    try {
      // Use xdotool for clicking
      const process = new Deno.Command("xdotool", {
        args: ["mousemove", x.toString(), y.toString(), "click", "1"],
        stdout: "piped",
        stderr: "piped"
      });

      const { code, stdout, stderr } = await process.output();
      
      if (code !== 0) {
        const error = new TextDecoder().decode(stderr);
        throw new Error(`Click failed: ${error}`);
      }

      return {
        type: 'click',
        x,
        y,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Click simulation error:', error);
      return {
        type: 'click',
        x,
        y,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async simulateType(text: string): Promise<any> {
    try {
      // Use xdotool for typing
      const process = new Deno.Command("xdotool", {
        args: ["type", text],
        stdout: "piped",
        stderr: "piped"
      });

      const { code, stdout, stderr } = await process.output();
      
      if (code !== 0) {
        const error = new TextDecoder().decode(stderr);
        throw new Error(`Type failed: ${error}`);
      }

      return {
        type: 'type',
        text,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Type simulation error:', error);
      return {
        type: 'type',
        text,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async simulateKey(key: string): Promise<any> {
    try {
      // Use xdotool for key press
      const process = new Deno.Command("xdotool", {
        args: ["key", key],
        stdout: "piped",
        stderr: "piped"
      });

      const { code, stdout, stderr } = await process.output();
      
      if (code !== 0) {
        const error = new TextDecoder().decode(stderr);
        throw new Error(`Key press failed: ${error}`);
      }

      return {
        type: 'key',
        key,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Key simulation error:', error);
      return {
        type: 'key',
        key,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async takeScreenshot(): Promise<string | null> {
    try {
      const filename = `screenshot_${Date.now()}.png`;
      const filepath = `/app/screenshots/${filename}`;

      // Use scrot for screenshot
      const process = new Deno.Command("scrot", {
        args: [filepath],
        stdout: "piped",
        stderr: "piped"
      });

      const { code, stdout, stderr } = await process.output();
      
      if (code !== 0) {
        const error = new TextDecoder().decode(stderr);
        throw new Error(`Screenshot failed: ${error}`);
      }

      // Read and encode screenshot as base64
      const imageData = await Deno.readFile(filepath);
      const base64 = btoa(String.fromCharCode(...imageData));
      
      // Clean up file
      await Deno.remove(filepath);

      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Screenshot error:', error);
      return null;
    }
  }

  private async simulateScroll(direction: string, amount: number): Promise<any> {
    try {
      let scrollArg: string;
      switch (direction) {
        case 'up':
          scrollArg = '4';
          break;
        case 'down':
          scrollArg = '5';
          break;
        default:
          throw new Error(`Unsupported scroll direction: ${direction}`);
      }

      // Use xdotool for scrolling
      const process = new Deno.Command("xdotool", {
        args: ["click", "--repeat", amount.toString(), scrollArg],
        stdout: "piped",
        stderr: "piped"
      });

      const { code, stdout, stderr } = await process.output();
      
      if (code !== 0) {
        const error = new TextDecoder().decode(stderr);
        throw new Error(`Scroll failed: ${error}`);
      }

      return {
        type: 'scroll',
        direction,
        amount,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Scroll simulation error:', error);
      return {
        type: 'scroll',
        direction,
        amount,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async handleScreenshot(request: Request): Promise<Response> {
    try {
      const screenshot = await this.takeScreenshot();
      
      if (!screenshot) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to take screenshot'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        screenshot,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private handleStatus(): Response {
    return new Response(JSON.stringify({
      service: 'desktop-automation',
      status: 'running',
      activeDesktops: this.activeDesktops.size,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the service
const port = parseInt(Deno.env.get("SERVICE_PORT") || "8002");
const service = new DesktopAutomationService(port);
await service.start();