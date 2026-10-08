import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const m = new ChatOpenAI({
    model: cfg.opper_model || 'claude-sonnet-4-6',
    apiKey: cfg.opper || '',
    configuration: { baseURL: cfg.opper_base || 'https://api.opper.ai/v3/compat' },
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens,
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.opper_embed_model || 'text-embedding-3-large',
    apiKey: cfg.opper || process.env.OPPER_API_KEY,
    configuration: { baseURL: cfg.opper_base || 'https://api.opper.ai/v3/compat' },
  })
}
