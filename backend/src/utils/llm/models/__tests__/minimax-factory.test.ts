import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all provider modules
vi.mock('../ollama', () => ({ makeLLM: vi.fn(), makeEmbeddings: vi.fn() }))
vi.mock('../gemini', () => ({ makeLLM: vi.fn(), makeEmbeddings: vi.fn() }))
vi.mock('../openai', () => ({
  makeLLM: vi.fn().mockReturnValue({ invoke: vi.fn(), call: vi.fn() }),
  makeEmbeddings: vi.fn().mockReturnValue({ embedDocuments: vi.fn(), embedQuery: vi.fn() }),
}))
vi.mock('../grok', () => ({ makeLLM: vi.fn(), makeEmbeddings: vi.fn() }))
vi.mock('../claude', () => ({ makeLLM: vi.fn(), makeEmbeddings: vi.fn() }))
vi.mock('../openrouter', () => ({ makeLLM: vi.fn(), makeEmbeddings: vi.fn() }))
vi.mock('../minimax', () => ({
  makeLLM: vi.fn().mockReturnValue({ invoke: vi.fn(), call: vi.fn() }),
  makeEmbeddings: vi.fn().mockReturnValue({
    embedDocuments: vi.fn(),
    embedQuery: vi.fn(),
  }),
}))

// Mock config
vi.mock('../../../../config/env', () => ({
  config: { provider: 'minimax', embeddings_provider: '' },
}))

import { makeModels } from '../index'
import * as minimax from '../minimax'
import { config } from '../../../../config/env'

describe('Factory integration – MiniMax provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should select MiniMax provider when config.provider is "minimax"', () => {
    ;(config as any).provider = 'minimax'
    const { llm, embeddings } = makeModels()

    expect(minimax.makeLLM).toHaveBeenCalledWith(config)
    expect(minimax.makeEmbeddings).toHaveBeenCalledWith(config)
    expect(llm).toBeDefined()
    expect(embeddings).toBeDefined()
  })

  it('should fallback to embeddings_provider when MiniMax embeddings throw', () => {
    ;(config as any).provider = 'minimax'
    ;(config as any).embeddings_provider = 'openai'
    ;(minimax.makeEmbeddings as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('No OpenAI key')
    })

    const { llm, embeddings } = makeModels()

    expect(minimax.makeLLM).toHaveBeenCalled()
    expect(llm).toBeDefined()
    expect(embeddings).toBeDefined()
  })

  it('should not select MiniMax when provider is "openai"', () => {
    ;(config as any).provider = 'openai'
    makeModels()

    expect(minimax.makeLLM).not.toHaveBeenCalled()
  })
})
