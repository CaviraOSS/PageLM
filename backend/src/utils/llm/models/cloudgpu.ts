import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const m = new ChatOpenAI({
    model: cfg.cloudgpu_model || 'deepseek-v4-flash',
    apiKey: cfg.cloudgpu || '',
    configuration: { baseURL: cfg.cloudgpu_base || 'https://cloudgpu.app/v1' },
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens,
  })
  return wrapChat(m)
}

// CloudGPU is used here for chat completions only, so embeddings fall back to
// the OpenAI settings, the same way the other chat-only gateways here do.
export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.openai_embed_model || 'text-embedding-3-large',
    apiKey: cfg.openai || process.env.OPENAI_API_KEY,
  })
}
