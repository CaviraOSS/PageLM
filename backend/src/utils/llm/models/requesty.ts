import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const m = new ChatOpenAI({
    model: cfg.requesty_model || 'openai/gpt-4o-mini',
    apiKey: cfg.requesty || '',
    configuration: { baseURL: cfg.requesty_base || 'https://router.requesty.ai/v1' },
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens,
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.requesty_embed_model || 'openai/text-embedding-3-large',
    apiKey: cfg.requesty || process.env.REQUESTY_API_KEY,
    configuration: { baseURL: cfg.requesty_base || 'https://router.requesty.ai/v1' },
  })
}
