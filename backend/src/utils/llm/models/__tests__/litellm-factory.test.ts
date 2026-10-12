import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

vi.mock('../openai', () => ({
  makeLLM: vi.fn().mockReturnValue({ invoke: vi.fn(), call: vi.fn() }),
  makeEmbeddings: vi.fn().mockReturnValue({ embedDocuments: vi.fn(), embedQuery: vi.fn() }),
}))

// Wrap the real LiteLLM module so the test can see that the factory picked it.
vi.mock('../litellm', async (importOriginal) => {
  const actual: any = await importOriginal()
  return { ...actual, makeLLM: vi.fn(actual.makeLLM), makeEmbeddings: vi.fn(actual.makeEmbeddings) }
})

vi.mock('../../../../config/env', () => ({
  config: {
    provider: 'litellm',
    embeddings_provider: 'openai',
    litellm: 'sk-litellm',
    litellm_base: 'http://proxy:4000/v1',
    litellm_model: 'gpt-4.1-mini',
  },
}))

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { makeModels } from '../index'
import * as openai from '../openai'
import * as litellm from '../litellm'
import { config } from '../../../../config/env'

describe('Factory integration – LiteLLM provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(config as any).provider = 'litellm'
    ;(config as any).litellm_embed_model = ''
    litellm.resetLiteLLMCatalog()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [{ model_name: 'gpt-4.1-mini', model_info: { mode: 'chat' } }] }),
    })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should select LiteLLM when config.provider is "litellm"', async () => {
    const { llm } = makeModels()

    expect(litellm.makeLLM).toHaveBeenCalledWith(config)
    expect(openai.makeLLM).not.toHaveBeenCalled()

    await expect(llm.invoke([{ role: 'user', content: 'hi' }])).resolves.toEqual({ content: 'mock response' })
    expect(fetch).toHaveBeenCalledWith('http://proxy:4000/model/info', {
      headers: { Authorization: 'Bearer sk-litellm' },
    })
    expect(ChatOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4.1-mini',
      apiKey: 'sk-litellm',
      configuration: { baseURL: 'http://proxy:4000/v1' },
    }))
  })

  it('should embed through the proxy when LITELLM_EMBED_MODEL is set', () => {
    ;(config as any).litellm_embed_model = 'text-embedding-3-small'
    makeModels()

    expect(litellm.makeEmbeddings).toHaveBeenCalledWith(config)
    expect(OpenAIEmbeddings).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      apiKey: 'sk-litellm',
      configuration: { baseURL: 'http://proxy:4000/v1' },
    })
    expect(openai.makeEmbeddings).not.toHaveBeenCalled()
  })

  it('should fall back to embeddings_provider without LITELLM_EMBED_MODEL', () => {
    makeModels()

    expect(openai.makeEmbeddings).toHaveBeenCalledWith(config)
  })
})
