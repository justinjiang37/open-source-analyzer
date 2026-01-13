import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { GoogleGenAI } from "@google/genai";

async function main() {
  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
  });

  // Optional: list models
  // for await (const m of client.models.list()) {
  //   console.log(m.name);
  // }

  const response = await client.models.generateContent({
    model: "models/gemini-2.5-flash",
    contents: "hi john! I love youuuuuu",
  });

  console.log(response.text);
}

main();
