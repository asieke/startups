import { db } from '$lib/server/db/index';
import { companies } from '$lib/server/db/schema';
import { isNull, not } from 'drizzle-orm';

export async function load() {
  // Get all companies where summary is not null
  const summaries = await db.getSummaries();
  // Return only the summary column for each company
  return {
    summaries
  };
}
