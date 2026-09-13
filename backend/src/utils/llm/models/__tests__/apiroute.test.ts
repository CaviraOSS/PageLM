import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @langchain/openai before importing apiroute module
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
import { makeLLM, makeEmbeddings } from '../apiroute'

describe('API Route LLM provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('makeLLM', () => {
    it('should create a ChatOpenAI instance with API Route defaults', () => {
      const cfg = { apiroute: 'test-api-key' }
      const llm = makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5.4-mini',
          apiKey: 'test-api-key',
          configuration: { baseURL: 'https://www.api-route.com/v1' },
        }),
      )
      expect(llm).toHaveProperty('invoke')
      expect(llm).toHaveProperty('call')
    })

    it('should use configured model when provided', () => {
      const cfg = { apiroute: 'key', apiroute_model: 'deepseek-chat' }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-chat',
        }),
      )
    })

    it('should use custom baseURL when provided', () => {
      const cfg = { apiroute: 'key', apiroute_base: 'https://custom.api-route.com/v1' }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: { baseURL: 'https://custom.api-route.com/v1' },
        }),
      )
    })

    it('should clamp temperature to [0, 2]', () => {
      const cfg = { apiroute: 'key', temp: 3.5 }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 2,
        }),
      )
    })

    it('should handle temperature of 0', () => {
      const cfg = { apiroute: 'key', temp: 0 }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0,
        }),
      )
    })

    it('should default temperature to 0.7 when not set', () => {
      const cfg = { apiroute: 'key' }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        }),
      )
    })

    it('should pass max_tokens from config', () => {
      const cfg = { apiroute: 'key', max_tokens: 4096 }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 4096,
        }),
      )
    })

    it('should read API_ROUTE_API_KEY from env when cfg.apiroute is empty', () => {
      process.env.API_ROUTE_API_KEY = 'env-api-route-key'
      const cfg = {} as any
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'env-api-route-key',
        }),
      )
      delete process.env.API_ROUTE_API_KEY
    })

    it('should return an object with invoke and call methods', async () => {
      const cfg = { apiroute: 'key' }
      const llm = makeLLM(cfg)

      expect(typeof llm.invoke).toBe('function')
      expect(typeof llm.call).toBe('function')

      const result = await llm.invoke([{ role: 'user', content: 'Hello' }])
      expect(result).toEqual({ content: 'mock response' })
    })

    it('should handle negative temperature by clamping to 0', () => {
      const cfg = { apiroute: 'key', temp: -1 }
      makeLLM(cfg)

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0,
        }),
      )
    })
  })

  describe('makeEmbeddings', () => {
    it('should create embeddings with API Route baseURL and large model default', () => {
      const cfg = { apiroute: 'test-key' }
      const emb = makeEmbeddings(cfg)

      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-large',
          apiKey: 'test-key',
          configuration: { baseURL: 'https://www.api-route.com/v1' },
        }),
      )
      expect(emb).toHaveProperty('embedDocuments')
      expect(emb).toHaveProperty('embedQuery')
    })

    it('should use configured embed model', () => {
      const cfg = { apiroute: 'key', openai_embed_model: 'text-embedding-3-small' }
      makeEmbeddings(cfg)

      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
        }),
      )
    })

    it('should read API_ROUTE_API_KEY or OPENAI_API_KEY from env when cfg.apiroute is empty', () => {
      process.env.API_ROUTE_API_KEY = 'env-route-key'
      const cfg = {} as any
      makeEmbeddings(cfg)

      expect(OpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'env-route-key',
        }),
      )
      delete process.env.API_ROUTE_API_KEY
    })
  })
})
