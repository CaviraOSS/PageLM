import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const m = new ChatOpenAI({
    model: cfg.uberllm_model || 'deepseek/deepseek-v3.2',
    apiKey: cfg.uberllm || '',
    configuration: { baseURL: cfg.uberllm_base || 'https://api.uberllm.dev/v1' },
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens,
  })
  return wrapChat(m)
}

// UberLLM is used here for chat completions only, so embeddings fall back to
// the OpenAI settings, the same way the other chat-only gateways here do.
export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.openai_embed_model || 'text-embedding-3-large',
    apiKey: cfg.openai || process.env.OPENAI_API_KEY,
  })
}
