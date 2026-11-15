import { ChatOpenAI } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

// Groq exposes an OpenAI-compatible chat endpoint and serves no embedding
// models, so makeEmbeddings throws and the factory falls back to EMB_PROVIDER.
export const makeLLM: MkLLM = (cfg: any) => {
  const temp = Math.max(0, Math.min(cfg.temp ?? 0.7, 2))
  const m = new ChatOpenAI({
    model: cfg.groq_model || 'openai/gpt-oss-120b',
    apiKey: cfg.groq || process.env.GROQ_API_KEY || '',
    configuration: { baseURL: cfg.groq_base || 'https://api.groq.com/openai/v1' },
    temperature: temp,
    maxTokens: cfg.groq_max_tokens || 4500,
    timeout: cfg.groq_timeout || 60000,
    maxRetries: 0,
    // gpt-oss is a reasoning model: reasoning tokens consume the completion
    // budget. Low effort leaves most of that budget for the visible answer.
    modelKwargs: {
      reasoning_effort: cfg.groq_reasoning_effort || 'low',
      include_reasoning: false,
    },
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (): EmbeddingsLike => {
  throw new Error('groq_has_no_embeddings')
}
