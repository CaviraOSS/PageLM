import { describe, it, expect, vi, beforeEach } from 'vitest'

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
import { makeLLM, makeEmbeddings } from '../atlascloud'

describe('Atlas Cloud LLM provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a ChatOpenAI instance with Atlas Cloud defaults', () => {
    const llm = makeLLM({ atlascloud: 'test-key' })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'deepseek-ai/deepseek-v4-flash',
        apiKey: 'test-key',
        configuration: { baseURL: 'https://api.atlascloud.ai/v1' },
      }),
    )
    expect(typeof llm.invoke).toBe('function')
    expect(typeof llm.call).toBe('function')
  })

  it('should use configured model and base URL', () => {
    makeLLM({
      atlascloud: 'key',
      atlascloud_model: 'zai-org/glm-5.3-flash',
      atlascloud_base: 'https://gateway.example.test/v1',
    })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'zai-org/glm-5.3-flash',
        configuration: { baseURL: 'https://gateway.example.test/v1' },
      }),
    )
  })

  it('should pass temperature and max tokens through', () => {
    makeLLM({ atlascloud: 'key', temp: 0.2, max_tokens: 1024 })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.2, maxTokens: 1024 }),
    )
  })

  it('should create embeddings with the OpenAI settings', () => {
    makeEmbeddings({ openai: 'openai-key' })

    expect(OpenAIEmbeddings).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'text-embedding-3-large',
        apiKey: 'openai-key',
      }),
    )
  })
})
