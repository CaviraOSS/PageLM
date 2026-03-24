import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @langchain/openai before importing minimax module
vi.mock('@langchain/openai', () => {
  const MockChatOpenAI = vi.fn(function (this: any, opts: any) {
    this.invoke = vi.fn().mockResolvedValue({ content: 'mock response' })
    this._opts = opts
  })
  const MockOpenAIEmbeddings = vi.fn(function (this: any, opts: any) {
    this.embedDocuments = vi.fn().mockResolvedValue([[0.1, 0.2]])
    this.embedQuery = vi.fn().mockResolvedValue([0.1, 0.2])
    this._opts = opts
  })
  return { ChatOpenAI: MockChatOpenAI, OpenAIEmbeddings: MockOpenAIEmbeddings }
})

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { makeLLM, makeEmbeddings } from '../minimax'

describe('MiniMax LLM provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('makeLLM', () => {
    it('should create a ChatOpenAI instance with MiniMax defaults', () => {
      const cfg = { minimax: 'test-api-key' }
      const llm = makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'MiniMax-M2.7',
          apiKey: 'test-api-key',
          configuration: { baseURL: 'https://api.minimax.io/v1' },
        }),
      )
      expect(llm).toHaveProperty('invoke')
      expect(llm).toHaveProperty('call')
    })

    it('should use configured model when provided', () => {
      const cfg = { minimax: 'key', minimax_model: 'MiniMax-M2.5-highspeed' }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'MiniMax-M2.5-highspeed',
        }),
      )
    })

    it('should clamp temperature to [0, 1]', () => {
      const cfg = { minimax: 'key', temp: 2.5 }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 1,
        }),
      )
    })

    it('should handle temperature of 0', () => {
      const cfg = { minimax: 'key', temp: 0 }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0,
        }),
      )
    })

    it('should default temperature to 0.7 when not set', () => {
      const cfg = { minimax: 'key' }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        }),
      )
    })

    it('should pass max_tokens from config', () => {
      const cfg = { minimax: 'key', max_tokens: 4096 }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 4096,
        }),
      )
    })

    it('should read MINIMAX_API_KEY from env when cfg.minimax is empty', () => {
      process.env.MINIMAX_API_KEY = 'env-key'
      const cfg = {} as any
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'env-key',
        }),
      )
      delete process.env.MINIMAX_API_KEY
    })

    it('should return an object with invoke and call methods', async () => {
      const cfg = { minimax: 'key' }
      const llm = makeLLM(cfg)

      expect(typeof llm.invoke).toBe('function')
      expect(typeof llm.call).toBe('function')

      const result = await llm.invoke([{ role: 'user', content: 'Hello' }])
      expect(result).toEqual({ content: 'mock response' })
    })

    it('should handle negative temperature by clamping to 0', () => {
      const cfg = { minimax: 'key', temp: -1 }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0,
        }),
      )
    })
  })

  describe('makeEmbeddings', () => {
    it('should create OpenAI embeddings as fallback', () => {
      const cfg = { openai: 'oai-key' }
      const emb = makeEmbeddings(cfg)

      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-large',
          apiKey: 'oai-key',
        }),
      )
      expect(emb).toHaveProperty('embedDocuments')
      expect(emb).toHaveProperty('embedQuery')
    })

    it('should use configured embed model', () => {
      const cfg = { openai: 'oai-key', openai_embed_model: 'text-embedding-3-small' }
      makeEmbeddings(cfg)

      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
        }),
      )
    })

    it('should read OPENAI_API_KEY from env when cfg.openai is empty', () => {
      process.env.OPENAI_API_KEY = 'env-oai-key'
      const cfg = {} as any
      makeEmbeddings(cfg)

      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'env-oai-key',
        }),
      )
      delete process.env.OPENAI_API_KEY
    })
  })
})
