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
import { makeLLM, makeEmbeddings } from '../requesty'

describe('Requesty LLM provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a ChatOpenAI instance with Requesty defaults', () => {
    const llm = makeLLM({ requesty: 'test-key' })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-4o-mini',
        apiKey: 'test-key',
        configuration: { baseURL: 'https://router.requesty.ai/v1' },
      }),
    )
    expect(typeof llm.invoke).toBe('function')
    expect(typeof llm.call).toBe('function')
  })

  it('should use configured model and base URL', () => {
    makeLLM({
      requesty: 'key',
      requesty_model: 'anthropic/claude-sonnet-4-5',
      requesty_base: 'https://router.eu.requesty.ai/v1',
    })

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'anthropic/claude-sonnet-4-5',
        configuration: { baseURL: 'https://router.eu.requesty.ai/v1' },
      }),
    )
  })

  it('should create embeddings with Requesty baseURL and prefixed model', () => {
    makeEmbeddings({ requesty: 'test-key' })

    expect(OpenAIEmbeddings).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/text-embedding-3-large',
        apiKey: 'test-key',
        configuration: { baseURL: 'https://router.requesty.ai/v1' },
      }),
    )
  })
})
