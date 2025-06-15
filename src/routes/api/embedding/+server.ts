// routes/api/embedding/+server.ts
import { GoogleGenAI } from '@google/genai'
import type { RequestHandler } from './$types';
import { GEMINI_API_KEY } from '$env/static/private';

// POST endpoint handler for generating embeddings
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Extract the prompt from the request body
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid prompt' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Initialize the Google Gemini AI client with API key from environment variables
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Generate the embedding using the Gemini embedding model
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-exp-03-07',
      contents: prompt,
      config: {
        taskType: 'SEMANTIC_SIMILARITY',
      },
    });

    // Return the embedding in the response
    return new Response(
      JSON.stringify({ embedding: response.embeddings }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error?.message || 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};