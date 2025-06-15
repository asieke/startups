import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, or, isNull, and, ne, not, inArray } from 'drizzle-orm';
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
  getSummariesByEmbedding: (embeddings: number[]) => Promise<Summary[]>;
};


export const db = baseDb as DbWithMethods;

//how do I add a method to the db class?

function cosineDistance(embeddings: number[], embedding: number[]) {
  return embeddings.map((value, index) => value * embedding[index]).reduce((a, b) => a + b, 0);
}

db.getSummariesByEmbedding = async function (embeddings: number[]) {
  //get the company_id and the embeddings of the companies that have embeddings
  const companies = await this.select({ company_id: schema.companies.company_id, embedding: schema.companies.embedding }).from(schema.companies).where(not(isNull(schema.companies.embedding)));

  console.log('Embedding search...', companies.length)

  const sorted: { company_id: string, distance: number }[] = [];

  for (const company of companies) {
    const distance = cosineDistance(embeddings, company.embedding as number[]);
    sorted.push({ company_id: company.company_id, distance });
  }

  sorted.sort((a, b) => b.distance - a.distance);

  const top5 = sorted.slice(0, 5).map(company => company.company_id);


  const summaries = await this.select({ summary: schema.companies.summary, company_id: schema.companies.company_id }).from(schema.companies).where(inArray(schema.companies.company_id, top5));

  const summariesWithSimilarity = summaries.map(summary => (
    {
      ...(summary.summary as Summary),
      similarity: sorted.find(s => s.company_id === summary.company_id)?.distance
    }))

  summariesWithSimilarity.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

  return summariesWithSimilarity;


}

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


