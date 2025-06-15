import { getEmbedding } from "../ai/llm";

async function main() {
  const embedding = await getEmbedding("What is the capital of France?");
  console.log(embedding);
}

main();