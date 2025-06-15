import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'papaparse';
import { db } from '../server/db/index';
import { companies } from '../server/db/schema';
import 'dotenv/config';

//Use papaparse to parse the _data.tsv file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('-');
  if (!day || !month || !year) return null;
  const monthMap: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  const monthNum = monthMap[month];
  if (monthNum === undefined) return null;
  const dayNum = parseInt(day);
  const yearNum = parseInt(year);
  if (isNaN(dayNum) || isNaN(yearNum)) return null;
  const date = new Date(yearNum, monthNum, dayNum);
  if (isNaN(date.getTime())) return null;
  return `${yearNum.toString().padStart(4, '0')}-${(monthNum + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
}

async function main() {
  const filePath = path.resolve(__dirname, '_data.tsv');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const records = parse(fileContent, {
    header: true,
    delimiter: '\t',
    skipEmptyLines: true,
  });

  const data = records.data as Record<string, string>[];

  for (const record of data) {
    // Map TSV fields to schema fields, converting types as needed
    const upsertData = {
      company_id: record['Company ID'],
      companies: record['Companies'],
      primary_contact_title: record['Primary Contact Title'],
      primary_contact_email: record['Primary Contact Email'],
      first_financing_valuation: record['First Financing Valuation'] ? Number(record['First Financing Valuation']) : null,
      first_financing_size: record['First Financing Size'] ? Number(record['First Financing Size']) : null,
      last_financing_status: record['Last Financing Status'],
      first_financing_date: parseDate(record['First Financing Date']),
      employee_history: record['Employee History'],
      business_status: record['Business Status'],
      keywords: record['Keywords'],
      last_known_valuation_date: parseDate(record['Last Known Valuation Date']),
      last_known_valuation: record['Last Known Valuation'] ? Number(record['Last Known Valuation']) : null,
      last_financing_valuation: record['Last Financing Valuation'] ? Number(record['Last Financing Valuation']) : null,
      total_raised: record['Total Raised'] ? Number(record['Total Raised']) : null,
      universe: record['Universe'],
      emerging_spaces: record['Emerging Spaces'],
      linkedin_url: record['LinkedIn URL'],
      competitors: record['Competitors'],
      financing_status_note: record['Financing Status Note'],
      primary_industry_code: record['Primary Industry Code'],
      description: record['Description'],
      verticals: record['Verticals'],
      last_financing_date: parseDate(record['Last Financing Date']),
      last_financing_size: record['Last Financing Size'] ? Number(record['Last Financing Size']) : null,
      last_financing_deal_type: record['Last Financing Deal Type'],
      active_investors: record['Active Investors'],
      company_financing_status: record['Company Financing Status'],
      employees: record['Employees'] ? Number(record['Employees']) : null,
      primary_contact: record['Primary Contact'],
      ownership_status: record['Ownership Status'],
      year_founded: record['Year Founded'] ? Number(record['Year Founded']) : null,
      hq_location: record['HQ Location'],
      website: record['Website'],
    };
    try {
      await db.insert(companies)
        .values(upsertData)
        .onConflictDoUpdate({
          target: companies.company_id,
          set: upsertData,
        });
      console.log(`Upserted company: ${record['Companies']} (${record['Company ID']})`);
    } catch (err) {
      console.error(`Failed to upsert company: ${record['Companies']} (${record['Company ID']})`, err);
    }
  }

  console.log('Upsert complete.');
}

main();