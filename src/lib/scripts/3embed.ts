import { GoogleGenAI, Type } from "@google/genai"

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