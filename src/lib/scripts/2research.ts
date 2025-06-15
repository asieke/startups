import { db } from '../server/db/index.js';
import { companies, type Company } from '../server/db/schema';
import { groundedSearch, flashSearch } from './llm';
import { eq, or, isNull } from 'drizzle-orm';
import { Type } from '@google/genai';

import 'dotenv/config';

const CHUNK_SIZE = 10;
async function main() {
  try {
    const list = await db.getCompanies();
    const totalCompanies = list.length;

    for (let i = 0; i < list.length; i += CHUNK_SIZE) {
      const chunk = list.slice(i, i + CHUNK_SIZE);
      console.log(`Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(totalCompanies / CHUNK_SIZE)}`);

      // Print initial status with magnifying glass
      chunk.forEach((company: Company) => {
        console.log(`🔍 ${company.companies}`);
      });
      // CURSOR_BASE is effectively here, after the last company line is printed.

      const promises = chunk.map(async (company: Company, index: number) => {
        const success = await researchCompany(company);
        const statusEmoji = success ? '✅' : '❌';
        // Calculate how many lines to move up from the CURSOR_BASE
        // to reach the line for the current company.
        const linesToMove = chunk.length - index;

        process.stdout.write(`\x1b[${linesToMove}A`);   // Move cursor UP to the target line
        process.stdout.write(`\x1b[2K`);                // Clear the entire line
        process.stdout.write(`${statusEmoji} ${company.companies}`); // Write status (NO NEWLINE)
        // Cursor is now at the end of the text on this line.
        process.stdout.write(`\r`);                     // Move cursor to the beginning of the current line.
        process.stdout.write(`\x1b[${linesToMove}B`);   // Move cursor DOWN to the original baseline.
        // Cursor is now at the beginning of the baseline.
        return success;
      });

      await Promise.all(promises);
      // After all promises in the chunk, cursor is at the baseline.
      // Next console.log will naturally start from there.
    }

    console.log(`\n📚 Found ${totalCompanies} companies to research`);
    console.log(`\n🎉 All ${totalCompanies} companies processed!`);
  } catch (e) {
    // Catch errors like db.getCompanies failure
    console.error('❌ Main process error:', e);
  }
}

const schema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "The name of the company",
    },
    description: {
      type: Type.STRING,
      description: "Do not use any extraneous words. Immediately provide a very succinct summary of what the company does.",
    },
    target_customer: {
      type: Type.STRING,
      description: "A very succinct summary of who the target customer is",
    },
    tags: {
      type: Type.STRING,
      description: "A comma separated list of 3–5 canonical tags that describe what space the company is in",
    },
    competitors: {
      type: Type.ARRAY,
      description: "A list of competitor companies",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The name of the competitor",
          },
          website: {
            type: Type.STRING,
            description: "The website of the competitor",
          },
        },
        required: ["name", "website"],
      },
    },
  },
  required: ["name", "description", "target_customer", "tags", "competitors"],
};

async function researchCompany(company: Company): Promise<boolean> {
  let success = false;
  try {
    const prompt = getPrompt(company);
    const result = await groundedSearch(prompt);
    if (result && result.text) {

      const summary = await flashSearch('Summarize this company into a JSON object' + result.text, schema);
      summary.funding = {
        last_date: company.last_financing_date,
        size: company.last_financing_size || 0 * 1000000,
        type: company.last_financing_deal_type,
        total: company.total_raised,
        valuation: company.last_financing_valuation
      }
      summary.investors = company.active_investors;
      summary.linkedin = company.linkedin_url;
      summary.website = company.website;
      summary.employees = company.employees;
      summary.hq = company.hq_location;
      summary.founded = company.year_founded;


      await db.update(companies)
        .set({ markdown: result.text, summary: summary })
        .where(eq(companies.company_id, company.company_id));


      success = true;


    } else {
      success = false;
    }

  } catch (error) {
    // Optionally log error details elsewhere
    success = false;
  }
  return success;
}

function getPrompt(company: Company) {
  return `
   Here is some information about a company:
   Name: ${company.companies}
   Founder: ${company?.primary_contact}
   Description: ${company?.description}
   Website: ${company?.website}
   Competitors: ${company?.competitors}
   Industry: ${company?.primary_industry_code}
   Location: ${company?.hq_location}
   Founded: ${company?.year_founded}
   ======
   Your job is to prepare a 1 page investment memo for this company.
   Search Google and create a document in markdown

   ## [Company Name]
    (Briefly re-state website, location, founder(s) below the title for quick reference)
    2 Sentence executive summary that captures the customer, problem and solution.

    ### 1. Problem
    Goal: Clearly articulate the primary pain point, challenge, or unmet need in the market that the company aims to address.
    Guiding Questions:
    What specific issue does this company's product/service tackle?
    Why is this problem significant for its potential customers?
    What are the consequences of this problem if left unsolved?
    Research Focus: "About Us," "Mission," "Solutions," product descriptions on the website; founder interviews; industry reports identifying market gaps.
    
    ### 2. Addressable Market
    Goal: Quantify the market opportunity and growth potential.
    Guiding Questions:
    What is the Total Addressable Market (TAM) size in dollars?
    What is the Serviceable Addressable Market (SAM) - the portion of TAM that can be realistically reached?
    What is the Serviceable Obtainable Market (SOM) - the portion of SAM that can be captured in 3-5 years?
    What is the current market growth rate?
    Are there any market trends or tailwinds that could accelerate growth?
    Research Focus: Industry reports, market research firms (e.g., Gartner, Forrester), government statistics, analyst reports, competitor market sizing.
    
    ### 3. Target Customer
    Goal: Define the specific audience or market segment the company serves.
    Guiding Questions:
    Who experiences the problem the company is solving most acutely? (B2C, B2B, specific demographics, industries, roles?)
    Are there distinct customer segments? If so, describe the primary one.
    What are the key characteristics or needs of this target customer?
    Research Focus: "Solutions for X," "Case Studies," "Who We Serve" sections on the website; marketing materials; customer testimonials.
    
    ### 4. Solution
    Goal: Describe the company's product(s) or service(s) and how they address the identified problem for the target customer.
    Guiding Questions:
    What does the company offer (product, service, platform)?
    How does this offering directly solve the identified problem?
    What are the key features or unique aspects of the solution?
    What is the core value proposition for the customer?
    Research Focus: "Products," "Services," "Features," "How it Works," demo videos on the website; product reviews.
    
    ### 5. Competitive Landscape
    Goal: Briefly identify key competitors and the company's differentiation.
    Guiding Questions:
    Who are 2-3 main direct competitors offering similar solutions?  INCLUDE THEIR WEBSITES.
    Are there significant indirect competitors (solving the same problem differently)?
    What makes this company's solution different or better (e.g., price, features, technology, user experience, niche focus)?
    Research Focus: Competitor websites (look for comparisons), industry analysis reports, news articles mentioning competitors, "Why [Company Name]" sections on their site.
    
    ### 6. Business Model
    Goal: Explain how the company generates revenue and sustains its operations.
    Guiding Questions:
    How does the company make money? (e.g., subscriptions, one-time sales, freemium, advertising, commissions, licensing, service fees).
    What is their primary revenue stream?
    Is there a clear pricing strategy visible (e.g., tiers, per-user)?
    How do they reach their customers (e.g., direct sales, online marketing, partnerships)?
    Research Focus: "Pricing" page on the website, terms of service, investor relations (if public), news articles discussing funding/monetization strategy.
    General Research Guidelines:
    Prioritize information from the company's official website.
    Supplement with information from credible third-party sources like reputable news outlets (e.g., TechCrunch, Forbes, industry-specific publications), business databases (e.g., Crunchbase, LinkedIn), and market analysis reports where accessible.
    Focus on factual information and avoid speculation.
    Synthesize information to be concise. Use bullet points where appropriate within sections for readability. The goal is a 1-pager.
   
   Don't provide any other information, or any \`\`\` markdown formatting, just start with the ##heading.
    `;
}

main().catch(console.error);