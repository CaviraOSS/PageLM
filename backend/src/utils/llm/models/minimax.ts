import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const temp = cfg.temp ?? 0.7
  const m = new ChatOpenAI({
    model: cfg.minimax_model || 'MiniMax-M2.7',
    apiKey: cfg.minimax || process.env.MINIMAX_API_KEY,
    configuration: { baseURL: 'https://api.minimax.io/v1' },
    temperature: Math.max(0, Math.min(temp, 1)),
    maxTokens: cfg.max_tokens,
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.openai_embed_model || 'text-embedding-3-large',
    apiKey: cfg.openai || process.env.OPENAI_API_KEY,
  })
}
