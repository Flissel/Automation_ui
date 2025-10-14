/**
 * OCR Backend Service
 * API client for communication with Python OCR backend
 */

// Mock OCR server is running on port 8007 (Python OCR backend crashed - missing dependencies)
const OCR_BACKEND_URL = 'http://localhost:8007/api/v1/ocr';

export interface OCRRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  language?: string;
  confidence_threshold?: number;
}

export interface OCRResult {
  zone_id: string;
  text: string;
  confidence: number;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata: {
    processing_time: number;
    engine: string;
    language: string;
    timestamp: string;
  };
}

export interface OCRExtractResponse {
  success: boolean;
  results: OCRResult[];
  total_regions: number;
  processing_time: number;
}

export interface OCRStatusResponse {
  success: boolean;
  status: {
    available: boolean;
    engines: string[];
    initialized: boolean;
    healthy: boolean;
  };
  service_name: string;
}

export interface OCREnginesResponse {
  success: boolean;
  engines: Array<{
    name: string;
    available: boolean;
    version: string;
  }>;
}

export class OCRBackendService {
  /**
   * Check OCR backend health and availability
   */
  static async getStatus(): Promise<OCRStatusResponse> {
    try {
      const response = await fetch(`${OCR_BACKEND_URL}/status`);
      if (!response.ok) {
        throw new Error(`OCR status check failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to check OCR status:', error);
      throw error;
    }
  }

  /**
   * Get list of available OCR engines
   */
  static async getEngines(): Promise<OCREnginesResponse> {
    try {
      const response = await fetch(`${OCR_BACKEND_URL}/engines`);
      if (!response.ok) {
        throw new Error(`OCR engines fetch failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch OCR engines:', error);
      throw error;
    }
  }

  /**
   * Extract text from multiple regions in an image (batch processing)
   * @param imageData Base64 encoded image data
   * @param regions Array of OCR regions to extract
   */
  static async extractText(
    imageData: string,
    regions: OCRRegion[]
  ): Promise<OCRExtractResponse> {
    try {
      // Use batch endpoint for multiple regions
      if (regions.length === 0) {
        return {
          success: true,
          results: [],
          total_regions: 0,
          processing_time: 0
        };
      }

      // For single region, use the single-region endpoint
      if (regions.length === 1) {
        const result = await this.extractTextFromRegion(imageData, regions[0]);
        return {
          success: true,
          results: [result],
          total_regions: 1,
          processing_time: result.metadata.processing_time
        };
      }

      // For multiple regions, use batch endpoint
      const response = await fetch(`${OCR_BACKEND_URL}/extract-regions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: `data:image/png;base64,${imageData}`,
          regions: regions.map(r => ({
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height
          })),
          language: regions[0]?.language || 'eng+deu',
          confidence_threshold: regions[0]?.confidence_threshold || 0.7
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch OCR extraction failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform batch response to match expected format
      const results: OCRResult[] = data.results.map((result: any, index: number) => ({
        zone_id: regions[index]?.id || `region_${index}`,
        text: result.text || '',
        confidence: result.confidence || 0,
        region: {
          x: regions[index].x,
          y: regions[index].y,
          width: regions[index].width,
          height: regions[index].height
        },
        metadata: {
          processing_time: result.processing_time || 0,
          engine: result.engine || 'unknown',
          language: result.language || 'eng+deu',
          timestamp: new Date().toISOString()
        }
      }));

      return {
        success: data.success,
        results,
        total_regions: data.total_regions,
        processing_time: data.processing_time
      };
    } catch (error) {
      console.error('Failed to extract text:', error);
      throw error;
    }
  }

  /**
   * Extract text from a single region
   * @param imageData Base64 encoded image data
   * @param region Single OCR region to extract
   */
  static async extractTextFromRegion(
    imageData: string,
    region: OCRRegion
  ): Promise<OCRResult> {
    try {
      const response = await fetch(`${OCR_BACKEND_URL}/extract-region`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: imageData,
          region: {
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height
          },
          language: region.language || 'eng+deu',
          confidence_threshold: region.confidence_threshold || 0.7
        }),
      });

      if (!response.ok) {
        throw new Error(`OCR region extraction failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        zone_id: region.id || 'region',
        text: data.result?.text || '',
        confidence: data.result?.confidence || 0,
        region: {
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height
        },
        metadata: {
          processing_time: data.result?.processing_time || 0,
          engine: data.result?.engine || 'unknown',
          language: region.language || 'eng+deu',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to extract region text:', error);
      throw error;
    }
  }

  /**
   * Convert canvas to base64 image data
   * @param canvas HTMLCanvasElement from stream
   */
  static canvasToBase64(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png').split(',')[1];
  }

  /**
   * Check if backend is available and healthy
   */
  static async isHealthy(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.success && status.status.healthy && status.status.available;
    } catch {
      return false;
    }
  }
}
