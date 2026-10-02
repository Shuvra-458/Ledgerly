const { GoogleGenAI } = require('@google/genai');

const PROVIDER = (process.env.LLM_PROVIDER || 'none').toLowerCase();
const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash';
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
const TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10);

const enabled = PROVIDER === 'gemini' && API_KEY.trim() !== '';

let ai = null;
if (enabled) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

function isEnabled() {
  return enabled;
}

function supportsEmbeddings() {
  return enabled && EMBEDDING_MODEL.trim() !== '';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('timed out')
  );
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function complete({ system, user, temperature = 0.7, jsonMode = true }) {
  if (!enabled) throw new Error('LLM is not configured');

  const modelsToTry = [MODEL, FALLBACK_MODEL].filter(Boolean);
  let lastErr;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: user,
            config: {
              systemInstruction: system,
              temperature,
              responseMimeType: jsonMode ? 'application/json' : 'text/plain',
              maxOutputTokens: 2048,
            },
          }),
          TIMEOUT_MS,
          `Gemini ${modelName}`
        );

        const text = response.text || '';
        const usage = response.usageMetadata || {};

        return {
          text,
          tokensUsed: {
            prompt: usage.promptTokenCount || 0,
            completion: usage.candidatesTokenCount || 0,
          },
          model: modelName,
        };
      } catch (err) {
        lastErr = err;
        const shortMsg = (err.message || '').slice(0, 120);
        console.warn(`⚠️  ${modelName} attempt ${attempt + 1}/3 failed: ${shortMsg}`);

        if (attempt < 2 && isRetryable(err)) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
          continue;
        }
        break;
      }
    }
  }

  throw lastErr;
}

async function embed(text) {
  if (!supportsEmbeddings()) throw new Error('Embeddings not supported');

  const result = await withTimeout(
    ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: [text],
    }),
    TIMEOUT_MS,
    'Gemini embedContent'
  );

  const embedding = result.embeddings?.[0]?.values || result.embedding?.values;
  if (!embedding) {
    throw new Error('Embedding response missing values: ' + JSON.stringify(result).slice(0, 200));
  }
  return embedding;
}

module.exports = {
  isEnabled,
  supportsEmbeddings,
  complete,
  embed,
  provider: PROVIDER,
  model: MODEL,
};