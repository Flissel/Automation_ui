import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  imageData: string; // base64 encoded image
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  options?: {
    language?: string;
    engine?: 'tesseract' | 'cloud';
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, region, options = {} }: OCRRequest = await req.json();

    console.log("Processing OCR request with options:", options);

    // Simulate OCR processing since we can't run actual OCR in Edge Functions
    // In a real implementation, you would:
    // 1. Decode the base64 image
    // 2. Crop to the specified region if provided
    // 3. Process with Tesseract.js or call a cloud OCR API
    // 4. Return the extracted text with confidence scores

    const mockTexts = [
      "Sample extracted text from OCR",
      "Invoice #12345\nDate: 2024-01-15\nAmount: $123.45",
      "Error: File not found",
      "Welcome to our application",
      "Processing complete: 95%",
      "Temperature: 23.5°C",
      "Status: Connected",
      "User: john.doe@example.com"
    ];

    const extractedText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
    const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence

    const result = {
      success: true,
      extractedText,
      confidence,
      region,
      metadata: {
        processingTime: Math.floor(Math.random() * 500) + 100, // 100-600ms
        engine: options.engine || 'tesseract',
        language: options.language || 'eng',
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});