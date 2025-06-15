import { db } from '$lib/server/db/index';
import type { Actions } from './$types';
import { getEmbedding } from '$lib/ai/llm';

export const actions: Actions = {
  default: async ({ request }) => {
    console.log('Search request received');

    const formData = await request.formData();


    const query = (formData.get('idea') as string)?.toLowerCase() || '';

    const embedding = await getEmbedding(query);

    const results = await db.getSummariesByEmbedding(embedding);


    return { results };
  }
};
