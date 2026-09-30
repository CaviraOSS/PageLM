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
import { makeLLM, makeEmbeddings } from '../cheaperinference'

describe('Cheaper Inference LLM provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a ChatOpenAI instance with Cheaper Inference defaults', () => {
    const llm = makeLLM({ cheaperinference: 'test-key' })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.4-mini',
        apiKey: 'test-key',
        configuration: { baseURL: 'https://api.cheaperinference.com/v1' },
      }),
    )
    expect(typeof llm.invoke).toBe('function')
    expect(typeof llm.call).toBe('function')
  })

  it('should use configured model and base URL', () => {
    makeLLM({
      cheaperinference: 'key',
      cheaperinference_model: 'claude-sonnet-5',
      cheaperinference_base: 'https://gateway.example.test/v1',
    })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-5',
        configuration: { baseURL: 'https://gateway.example.test/v1' },
      }),
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
