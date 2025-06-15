import { GoogleGenAI } from "@google/genai";
import type { RequestHandler } from './$types';
import { GEMINI_API_KEY } from '$env/static/private';

/**
 * POST endpoint handler for the grounding API
 * This endpoint processes prompts and returns AI-generated responses with web search grounding
 * 
 * @param request - The incoming HTTP request
 * @returns JSON response containing the AI response and grounding metadata
 */
export const POST: RequestHandler = async ({ request }) => {

  try {
    // Extract the prompt from the request body
    const { prompt } = await request.json();


    // Initialize the Google Gemini AI client with API key from environment variables
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Generate content using the Gemini model with web search grounding enabled
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17", // Using the fast Gemini model
      contents: [prompt],
      config: {
        tools: [{ googleSearch: {} }], // Enable web search grounding
      },
    });

    // Structure the response data
    const result = {
      text: response.text, // The main AI-generated response
      grounding: response.candidates?.[0]?.groundingMetadata // Optional grounding data from web search
    };

    // Return the structured response with CORS headers
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
};
