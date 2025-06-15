import { db } from '$lib/server/db/index';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const query = (formData.get('idea') as string)?.toLowerCase() || '';
    const summaries = await db.getSummaries();
    const results = summaries.filter((summary) => {
      return (
        summary.name?.toLowerCase().includes(query) ||
        summary.description?.toLowerCase().includes(query) ||
        summary.tags?.toLowerCase().includes(query)
      );
    });
    return { results };
  }
};
