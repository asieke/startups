import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: integer('id').primaryKey(),
	age: integer('age')
});

export const companies = sqliteTable('companies', {
	company_id: text('Company ID').primaryKey(),
	companies: text('Companies'),
	primary_contact_title: text('Primary Contact Title'),
	primary_contact_email: text('Primary Contact Email'),
	first_financing_valuation: text('First Financing Valuation'),
	first_financing_size: text('First Financing Size'),
	last_financing_status: text('Last Financing Status'),
	first_financing_date: text('First Financing Date'),
	employee_history: text('Employee History'),
	business_status: text('Business Status'),
	keywords: text('Keywords'),
	last_known_valuation_date: text('Last Known Valuation Date'),
	last_known_valuation: text('Last Known Valuation'),
	last_financing_valuation: text('Last Financing Valuation'),
	total_raised: text('Total Raised'),
	universe: text('Universe'),
	emerging_spaces: text('Emerging Spaces'),
	linkedin_url: text('LinkedIn URL'),
	competitors: text('Competitors'),
	financing_status_note: text('Financing Status Note'),
	primary_industry_code: text('Primary Industry Code'),
	description: text('Description'),
	verticals: text('Verticals'),
	last_financing_date: text('Last Financing Date'),
	last_financing_size: text('Last Financing Size'),
	last_financing_deal_type: text('Last Financing Deal Type'),
	active_investors: text('Active Investors'),
	company_financing_status: text('Company Financing Status'),
	employees: integer('Employees'),
	primary_contact: text('Primary Contact'),
	ownership_status: text('Ownership Status'),
	year_founded: integer('Year Founded'),
	hq_location: text('HQ Location'),
	website: text('Website')
});
