const OpenAI = require('openai');

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/cr-discord-bot',
    'X-Title': 'CR Discord Bot'
  }
});

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-3-27b-it:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

async function ask(systemPrompt, userMessage, maxTokens = 600) {
  let lastError;
  for (const model of MODELS) {
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      });
      const choice = response.choices[0];
      if (!choice?.message?.content) continue;
      if (model !== MODELS[0]) console.log(`Fell back to model: ${model}`);
      return choice.message.content;
    } catch (err) {
      console.warn(`Model ${model} failed:`, err?.message);
      lastError = err;
    }
  }
  throw lastError ?? new Error('All models unavailable');
}

module.exports = { ask };
