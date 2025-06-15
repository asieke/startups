import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const companies = sqliteTable('companies', {
	company_id: text('company_id').primaryKey(),
	companies: text('companies').notNull(),
	markdown: text('markdown', { length: 1000000 }),
	summary: text('summary', { mode: 'json' }),
	embedding: text('embedding', { mode: 'json' }),
	primary_contact_title: text('primary_contact_title'),
	primary_contact_email: text('primary_contact_email'),
	first_financing_valuation: integer('first_financing_valuation'),
	first_financing_size: integer('first_financing_size'),
	last_financing_status: text('last_financing_status'),
	first_financing_date: text('first_financing_date'),
	employee_history: text('employee_history'),
	business_status: text('business_status'),
	keywords: text('keywords'),
	last_known_valuation_date: text('last_known_valuation_date'),
	last_known_valuation: integer('last_known_valuation'),
	last_financing_valuation: integer('last_financing_valuation'),
	total_raised: integer('total_raised'),
	universe: text('universe'),
	emerging_spaces: text('emerging_spaces'),
	linkedin_url: text('linkedin_url'),
	competitors: text('competitors'),
	financing_status_note: text('financing_status_note'),
	primary_industry_code: text('primary_industry_code'),
	description: text('description'),
	verticals: text('verticals'),
	last_financing_date: text('last_financing_date'),
	last_financing_size: integer('last_financing_size'),
	last_financing_deal_type: text('last_financing_deal_type'),
	active_investors: text('active_investors'),
	company_financing_status: text('company_financing_status'),
	employees: integer('employees'),
	primary_contact: text('primary_contact'),
	ownership_status: text('ownership_status'),
	year_founded: integer('year_founded'),
	hq_location: text('hq_location'),
	website: text('website')
});

export type Company = typeof companies.$inferSelect;
export type Summary = {
	similarity?: number;
	name: string;
	description: string;
	tags: string;
	target_customer: string;
	competitors: {
		name: string;
		website: string;
	}[];
	funding: {
		last_date: string;
		size: number;
		type: string;
		total: number;
		valuation: number;
	};
	investors: string;
	linkedin: string;
	website: string;
	employees: number;
	hq: string;
	founded: number;
};