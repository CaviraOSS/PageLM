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
import { makeLLM, makeEmbeddings } from '../opper'

describe('Opper LLM provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a ChatOpenAI instance with Opper defaults', () => {
    const llm = makeLLM({ opper: 'test-key' })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-6',
        apiKey: 'test-key',
        configuration: { baseURL: 'https://api.opper.ai/v3/compat' },
      }),
    )
    expect(typeof llm.invoke).toBe('function')
    expect(typeof llm.call).toBe('function')
  })

  it('should use configured model and base URL', () => {
    makeLLM({
      opper: 'key',
      opper_model: 'gpt-5.4-mini',
      opper_base: 'https://example.test/v3/compat',
    })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.4-mini',
        configuration: { baseURL: 'https://example.test/v3/compat' },
      }),
    )
  })

  it('should create embeddings with the Opper baseURL', () => {
    makeEmbeddings({ opper: 'test-key' })

    expect(OpenAIEmbeddings).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'text-embedding-3-large',
        apiKey: 'test-key',
        configuration: { baseURL: 'https://api.opper.ai/v3/compat' },
      }),
    )
  })
})
