import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  baseURL: "https://useful-services-litellm-449e40-152-67-3-182.ujwalbhagat.com",
  apiKey: process.env.LITELLM_API_KEY,
});

export const chatModel = openai("gpt-5.4-nano");