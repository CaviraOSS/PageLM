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
vi.mock('../minimax', () => ({ makeLLM: vi.fn(), makeEmbeddings: vi.fn() }))
vi.mock('../apiroute', () => ({
  makeLLM: vi.fn().mockReturnValue({ invoke: vi.fn(), call: vi.fn() }),
  makeEmbeddings: vi.fn().mockReturnValue({
    embedDocuments: vi.fn(),
    embedQuery: vi.fn(),
  }),
}))

// Mock config
vi.mock('../../../../config/env', () => ({
  config: { provider: 'apiroute', embeddings_provider: '' },
}))

import { makeModels } from '../index'
import * as apiroute from '../apiroute'
import { config } from '../../../../config/env'

describe('Factory integration – API Route provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should select API Route provider when config.provider is "apiroute"', () => {
    ;(config as any).provider = 'apiroute'
    const { llm, embeddings } = makeModels()

    expect(apiroute.makeLLM).toHaveBeenCalledWith(config)
    expect(apiroute.makeEmbeddings).toHaveBeenCalledWith(config)
    expect(llm).toBeDefined()
    expect(embeddings).toBeDefined()
  })

  it('should support alias "api_route" and "api-route"', () => {
    ;(config as any).provider = 'api_route'
    makeModels()
    expect(apiroute.makeLLM).toHaveBeenCalledWith(config)

    vi.clearAllMocks()
    ;(config as any).provider = 'api-route'
    makeModels()
    expect(apiroute.makeLLM).toHaveBeenCalledWith(config)
  })

  it('should fallback to embeddings_provider when API Route embeddings throw', () => {
    ;(config as any).provider = 'apiroute'
    ;(config as any).embeddings_provider = 'openai'
    ;(apiroute.makeEmbeddings as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('No API Route key')
    })

    const { llm, embeddings } = makeModels()

    expect(apiroute.makeLLM).toHaveBeenCalled()
    expect(llm).toBeDefined()
    expect(embeddings).toBeDefined()
  })

  it('should not select API Route when provider is "openai"', () => {
    ;(config as any).provider = 'openai'
    makeModels()

    expect(apiroute.makeLLM).not.toHaveBeenCalled()
  })
})
