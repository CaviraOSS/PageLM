import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const temp = cfg.temp ?? 0.7
  const m = new ChatOpenAI({
    model: cfg.apiroute_model || 'gpt-5.4-mini',
    apiKey: cfg.apiroute || process.env.API_ROUTE_API_KEY || '',
    configuration: { baseURL: cfg.apiroute_base || 'https://www.api-route.com/v1' },
    temperature: Math.max(0, Math.min(temp, 2)),
    maxTokens: cfg.max_tokens,
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.openai_embed_model || 'text-embedding-3-large',
    apiKey: cfg.apiroute || process.env.API_ROUTE_API_KEY || process.env.OPENAI_API_KEY || '',
    configuration: { baseURL: cfg.apiroute_base || 'https://www.api-route.com/v1' },
  })
}
