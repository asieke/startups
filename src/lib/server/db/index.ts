import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, or, isNull, and, ne, not } from 'drizzle-orm';
import * as schema from './schema';
import 'dotenv/config';

import { type Summary } from './schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: process.env.DATABASE_URL });

const baseDb = drizzle(client, { schema });
type BaseDb = typeof baseDb;

type DbWithMethods = BaseDb & {
  getCompanies: (hasMarkdown?: boolean) => Promise<typeof schema.companies.$inferSelect[]>; // adjust return type as needed
  getSummaries: () => Promise<Summary[]>;
};


export const db = baseDb as DbWithMethods;

//how do I add a method to the db class?

db.getSummaries = async function () {
  const summaries = await this.select({ summary: schema.companies.summary }).from(schema.companies).where(not(isNull(schema.companies.summary)));
  return summaries.map(summary => summary.summary) as unknown as Summary[];
}

db.getCompanies = async function (hasMarkdown = false) {
  if (hasMarkdown) {
    // Return companies where markdown is not null and not empty
    return this.select().from(schema.companies).where(
      and(
        not(isNull(schema.companies.markdown)),
        ne(schema.companies.markdown, "")
      )
    );
  } else {
    // Return companies where markdown is null or empty
    return this.select().from(schema.companies).where(
      or(
        eq(schema.companies.markdown, ""),
        isNull(schema.companies.markdown)
      )
    );
  }
};


