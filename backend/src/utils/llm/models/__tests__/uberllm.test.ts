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
import { makeLLM, makeEmbeddings } from '../uberllm'

describe('UberLLM LLM provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a ChatOpenAI instance with UberLLM defaults', () => {
    const llm = makeLLM({ uberllm: 'test-key' })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'deepseek/deepseek-v3.2',
        apiKey: 'test-key',
        configuration: { baseURL: 'https://api.uberllm.dev/v1' },
      }),
    )
    expect(typeof llm.invoke).toBe('function')
    expect(typeof llm.call).toBe('function')
  })

  it('should use configured model and base URL', () => {
    makeLLM({
      uberllm: 'key',
      uberllm_model: 'qwen/qwen3-235b-a22b-2507',
      uberllm_base: 'https://gateway.example.test/v1',
    })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'qwen/qwen3-235b-a22b-2507',
        configuration: { baseURL: 'https://gateway.example.test/v1' },
      }),
    )
  })

  it('should pass temperature and max tokens through', () => {
    makeLLM({ uberllm: 'key', temp: 0.2, max_tokens: 1024 })

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
