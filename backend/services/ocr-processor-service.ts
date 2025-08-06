// OCR Processor Service
// Extended from Supabase ocr-processor function for virtual desktop management

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface OCRRequest {
  image: string; // base64 encoded image
  regions?: OCRRegion[];
  language?: string;
  options?: OCROptions;
}

interface OCRRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
}

interface OCROptions {
  psm?: number; // Page segmentation mode
  oem?: number; // OCR Engine mode
  whitelist?: string; // Character whitelist
  blacklist?: string; // Character blacklist
}

interface OCRResponse {
  success: boolean;
  text?: string;
  regions?: OCRRegionResult[];
  confidence?: number;
  error?: string;
  processingTime?: number;
}

interface OCRRegionResult {
  name?: string;
  text: string;
  confidence: number;
  boundingBox: OCRRegion;
}

class OCRProcessorService {
  private port: number;
  private tempDir: string = '/app/temp';

  constructor(port: number = 8003) {
    this.port = port;
  }

  async start() {
    console.log(`🔍 OCR Processor Service starting on port ${this.port}`);
    
    // Ensure temp directory exists
    try {
      await Deno.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
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
        
        case '/ocr/process':
          if (method === 'POST') {
            return await this.handleOCRProcess(request);
          }
          break;
        
        case '/ocr/analyze-regions':
          if (method === 'POST') {
            return await this.handleAnalyzeRegions(request);
          }
          break;
        
        case '/ocr/capabilities':
          if (method === 'GET') {
            return this.handleCapabilities();
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
      service: 'ocr-processor',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async handleOCRProcess(request: Request): Promise<Response> {
    const startTime = Date.now();
    
    try {
      const body: OCRRequest = await request.json();
      const { image, language = 'eng', options = {} } = body;

      if (!image) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No image provided'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.processOCR(image, language, options);
      const processingTime = Date.now() - startTime;

      const response: OCRResponse = {
        ...result,
        processingTime
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('OCR processing error:', error);
      
      const response: OCRResponse = {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleAnalyzeRegions(request: Request): Promise<Response> {
    const startTime = Date.now();
    
    try {
      const body: OCRRequest = await request.json();
      const { image, regions = [], language = 'eng', options = {} } = body;

      if (!image) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No image provided'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (regions.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No regions specified'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const regionResults = await this.processRegions(image, regions, language, options);
      const processingTime = Date.now() - startTime;

      const response: OCRResponse = {
        success: true,
        regions: regionResults,
        processingTime
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Region analysis error:', error);
      
      const response: OCRResponse = {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async processOCR(imageBase64: string, language: string, options: OCROptions): Promise<Partial<OCRResponse>> {
    const tempImagePath = `${this.tempDir}/ocr_${Date.now()}.png`;
    const tempTextPath = `${this.tempDir}/ocr_${Date.now()}`;

    try {
      // Decode base64 image
      const imageData = this.base64ToUint8Array(imageBase64);
      await Deno.writeFile(tempImagePath, imageData);

      // Build tesseract command
      const args = [
        tempImagePath,
        tempTextPath,
        '-l', language
      ];

      // Add PSM (Page Segmentation Mode)
      if (options.psm !== undefined) {
        args.push('--psm', options.psm.toString());
      }

      // Add OEM (OCR Engine Mode)
      if (options.oem !== undefined) {
        args.push('--oem', options.oem.toString());
      }

      // Add character whitelist/blacklist
      if (options.whitelist) {
        args.push('-c', `tessedit_char_whitelist=${options.whitelist}`);
      }
      if (options.blacklist) {
        args.push('-c', `tessedit_char_blacklist=${options.blacklist}`);
      }

      // Run tesseract
      const process = new Deno.Command("tesseract", {
        args,
        stdout: "piped",
        stderr: "piped"
      });

      const { code, stdout, stderr } = await process.output();
      
      if (code !== 0) {
        const error = new TextDecoder().decode(stderr);
        throw new Error(`Tesseract failed: ${error}`);
      }

      // Read extracted text
      const textContent = await Deno.readTextFile(`${tempTextPath}.txt`);
      
      // Clean up temporary files
      await this.cleanup([tempImagePath, `${tempTextPath}.txt`]);

      return {
        success: true,
        text: textContent.trim(),
        confidence: 85 // Default confidence, could be extracted from tesseract output
      };

    } catch (error) {
      // Clean up on error
      await this.cleanup([tempImagePath, `${tempTextPath}.txt`]);
      throw error;
    }
  }

  private async processRegions(imageBase64: string, regions: OCRRegion[], language: string, options: OCROptions): Promise<OCRRegionResult[]> {
    const results: OCRRegionResult[] = [];
    const tempImagePath = `${this.tempDir}/ocr_full_${Date.now()}.png`;

    try {
      // Decode and save full image
      const imageData = this.base64ToUint8Array(imageBase64);
      await Deno.writeFile(tempImagePath, imageData);

      // Process each region
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        const regionImagePath = `${this.tempDir}/ocr_region_${Date.now()}_${i}.png`;
        const regionTextPath = `${this.tempDir}/ocr_region_${Date.now()}_${i}`;

        try {
          // Extract region using ImageMagick
          const cropArgs = [
            tempImagePath,
            '-crop',
            `${region.width}x${region.height}+${region.x}+${region.y}`,
            regionImagePath
          ];

          const cropProcess = new Deno.Command("convert", {
            args: cropArgs,
            stdout: "piped",
            stderr: "piped"
          });

          const { code: cropCode } = await cropProcess.output();
          
          if (cropCode !== 0) {
            console.warn(`Failed to crop region ${i}`);
            continue;
          }

          // Run OCR on region
          const ocrResult = await this.processOCR(
            await this.fileToBase64(regionImagePath),
            language,
            options
          );

          if (ocrResult.success) {
            results.push({
              name: region.name || `region_${i}`,
              text: ocrResult.text || '',
              confidence: ocrResult.confidence || 0,
              boundingBox: region
            });
          }

          // Clean up region files
          await this.cleanup([regionImagePath, `${regionTextPath}.txt`]);

        } catch (regionError) {
          console.error(`Error processing region ${i}:`, regionError);
          await this.cleanup([regionImagePath, `${regionTextPath}.txt`]);
        }
      }

      // Clean up full image
      await this.cleanup([tempImagePath]);

      return results;

    } catch (error) {
      await this.cleanup([tempImagePath]);
      throw error;
    }
  }

  private handleCapabilities(): Response {
    return new Response(JSON.stringify({
      service: 'ocr-processor',
      capabilities: {
        languages: ['eng', 'deu', 'fra', 'spa', 'ita'],
        formats: ['png', 'jpg', 'jpeg', 'bmp', 'tiff'],
        features: [
          'full-page-ocr',
          'region-based-ocr',
          'confidence-scoring',
          'multiple-languages',
          'custom-psm-oem'
        ]
      },
      version: '1.0.0',
      tesseract_version: 'Available'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  }

  private async fileToBase64(filePath: string): Promise<string> {
    const fileData = await Deno.readFile(filePath);
    const base64 = btoa(String.fromCharCode(...fileData));
    return `data:image/png;base64,${base64}`;
  }

  private async cleanup(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await Deno.remove(file);
      } catch (error) {
        // File might not exist, ignore error
      }
    }
  }
}

// Start the service
const port = parseInt(Deno.env.get("SERVICE_PORT") || "8003");
const service = new OCRProcessorService(port);
await service.start();