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

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import {
  makeLLM,
  makeEmbeddings,
  litellmBase,
  fetchLiteLLMModels,
  pickChatModel,
  clampMaxTokens,
  outputLimit,
  resetLiteLLMCatalog,
  textContent,
} from '../litellm'

const MODEL_INFO = {
  data: [
    { model_name: 'text-embedding-3-small', model_info: { mode: 'embedding' } },
    { model_name: 'claude-sonnet', model_info: { mode: 'chat', max_output_tokens: 8192 } },
    { model_name: 'claude-sonnet', model_info: { mode: 'chat', max_output_tokens: 8192 } },
    { model_name: 'gpt-4.1-mini', model_info: { mode: 'chat', max_output_tokens: 32768 } },
    { model_name: 'legacy-out', model_info: { mode: 'chat', max_tokens: 4096, max_input_tokens: 128000 } },
    { model_name: 'legacy-in', model_info: { mode: 'chat', max_tokens: 128000, max_input_tokens: 128000 } },
  ],
}

const json = (body: any, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })

const fetchMock = vi.fn()
const msgs = [{ role: 'user' as const, content: 'hi' }]

describe('LiteLLM provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetLiteLLMCatalog()
    fetchMock.mockReset()
    fetchMock.mockImplementation(() => json(MODEL_INFO))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('normalizes the proxy URL with or without /v1', () => {
    expect(litellmBase()).toBe('http://localhost:4000')
    expect(litellmBase('http://proxy:4000/v1/')).toBe('http://proxy:4000')
    expect(litellmBase(' https://llm.example.test ')).toBe('https://llm.example.test')
  })

  it('reads models from /model/info and deduplicates deployments', async () => {
    const models = await fetchLiteLLMModels('http://proxy:4000', 'sk-test')

    expect(fetchMock).toHaveBeenCalledWith('http://proxy:4000/model/info', {
      headers: { Authorization: 'Bearer sk-test' },
    })
    expect(models).toEqual([
      { name: 'text-embedding-3-small', mode: 'embedding', maxOutputTokens: undefined },
      { name: 'claude-sonnet', mode: 'chat', maxOutputTokens: 8192 },
      { name: 'gpt-4.1-mini', mode: 'chat', maxOutputTokens: 32768 },
      { name: 'legacy-out', mode: 'chat', maxOutputTokens: 4096 },
      { name: 'legacy-in', mode: 'chat', maxOutputTokens: undefined },
    ])
  })

  it('reads the output limit from max_output_tokens, and max_tokens only when it is not the input limit', () => {
    expect(outputLimit({ max_output_tokens: 8192, max_tokens: 200000, max_input_tokens: 200000 })).toBe(8192)
    // Legacy max_tokens below the input limit can only be the output limit.
    expect(outputLimit({ max_tokens: 4096, max_input_tokens: 128000 })).toBe(4096)
    // Legacy max_tokens equal to the input limit is not an output cap.
    expect(outputLimit({ max_tokens: 128000, max_input_tokens: 128000 })).toBeUndefined()
    // Without max_input_tokens the meaning of max_tokens is unknown.
    expect(outputLimit({ max_tokens: 4096 })).toBeUndefined()
    expect(outputLimit({})).toBeUndefined()
    expect(outputLimit(undefined)).toBeUndefined()
  })

  it('falls back to /v1/models when /model/info is unavailable', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/model/info') ? json({}, 404) : json({ data: [{ id: 'gpt-4.1-mini' }] }),
    )

    const models = await fetchLiteLLMModels('http://proxy:4000')

    expect(fetchMock).toHaveBeenLastCalledWith('http://proxy:4000/v1/models', { headers: {} })
    expect(models).toEqual([{ name: 'gpt-4.1-mini' }])
  })

  it('picks the configured model or the first chat model', () => {
    const models = [
      { name: 'embed', mode: 'embedding' },
      { name: 'chat-a', mode: 'chat', maxOutputTokens: 4096 },
    ]
    expect(pickChatModel(models, 'chat-a')).toEqual(models[1])
    expect(pickChatModel(models)).toEqual(models[1])
    expect(pickChatModel(models, 'not-listed')).toEqual({ name: 'not-listed' })
    expect(() => pickChatModel([{ name: 'embed', mode: 'embedding' }])).toThrow(/LITELLM_MODEL/)
  })

  it('treats responses-mode models as chat models and skips other modes', () => {
    const models = [
      { name: 'embed', mode: 'embedding' },
      { name: 'dall-e', mode: 'image_generation' },
      { name: 'whisper', mode: 'audio_transcription' },
      { name: 'o3-pro', mode: 'responses', maxOutputTokens: 100000 },
      { name: 'chat-b', mode: 'chat' },
    ]
    expect(pickChatModel(models)).toEqual(models[3])
    expect(() => pickChatModel(models.slice(0, 3))).toThrow('litellm_no_chat_model')
  })

  it('clamps max tokens to the model output limit', () => {
    expect(clampMaxTokens(16384, { name: 'm', maxOutputTokens: 8192 })).toBe(8192)
    expect(clampMaxTokens(1024, { name: 'm', maxOutputTokens: 8192 })).toBe(1024)
    expect(clampMaxTokens(16384, { name: 'm' })).toBe(16384)
  })

  it('creates a ChatOpenAI client against the proxy with a clamped max tokens', async () => {
    const llm = makeLLM({
      litellm: 'sk-test',
      litellm_base: 'http://proxy:4000/v1',
      litellm_model: 'claude-sonnet',
      temp: 0.2,
      max_tokens: 16384,
    })

    expect(ChatOpenAI).not.toHaveBeenCalled()
    await expect(llm.invoke(msgs)).resolves.toEqual({ content: 'mock response' })
    expect(ChatOpenAI).toHaveBeenCalledWith({
      model: 'claude-sonnet',
      apiKey: 'sk-test',
      configuration: { baseURL: 'http://proxy:4000/v1' },
      temperature: 0.2,
      maxTokens: 8192,
    })
  })

  it('builds the client once and reuses it for call()', async () => {
    const llm = makeLLM({ litellm_model: 'gpt-4.1-mini' })

    await llm.invoke(msgs)
    await llm.call(msgs)

    expect(ChatOpenAI).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses the first chat model from the proxy when LITELLM_MODEL is not set', async () => {
    await makeLLM({}).invoke(msgs)

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet', configuration: { baseURL: 'http://localhost:4000/v1' } }),
    )
  })

  it('uses a placeholder key and no auth header when no key is set', async () => {
    await makeLLM({ litellm_model: 'gpt-4.1-mini' }).invoke(msgs)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/model/info', { headers: {} })
    expect(ChatOpenAI).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'no-key' }))
  })

  it('still uses a configured model when the catalog is unreachable', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('ECONNREFUSED')))

    await makeLLM({ litellm_model: 'gpt-4.1-mini', max_tokens: 16384 }).invoke(msgs)

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4.1-mini', maxTokens: 16384 }),
    )
  })

  it('surfaces the error and retries later when no model can be resolved', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('ECONNREFUSED')))
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('ECONNREFUSED')))
    const llm = makeLLM({})

    await expect(llm.invoke(msgs)).rejects.toThrow(
      /^litellm_unreachable: could not list models at http:\/\/localhost:4000 \(ECONNREFUSED\)\. Check LITELLM_BASE_URL/,
    )
    await expect(llm.invoke(msgs)).resolves.toEqual({ content: 'mock response' })
  })

  it('warns at first use when LITELLM_MODEL is not served by the proxy', async () => {
    await makeLLM({ litellm_model: 'gpt-5-typo' }).invoke(msgs)

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('LITELLM_MODEL=gpt-5-typo is not listed'))
    expect(ChatOpenAI).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5-typo' }))
  })

  it('does not warn when LITELLM_MODEL is served by the proxy', async () => {
    await makeLLM({ litellm_model: 'gpt-4.1-mini' }).invoke(msgs)

    expect(console.warn).not.toHaveBeenCalled()
  })

  it('flattens content blocks to text so callers get a string', async () => {
    ;(ChatOpenAI as any).mockImplementationOnce(function (this: any) {
      this.invoke = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hello ' }, { type: 'image_url', image_url: 'x' }, { type: 'text', text: 'world' }],
      })
    })

    const r = await makeLLM({ litellm_model: 'gemini-2.5-flash' }).invoke(msgs)

    expect(r.content).toBe('Hello world')
    expect(textContent(['a', { type: 'text', text: 'b' }, { type: 'thinking' }])).toBe('ab')
  })

  it('creates embeddings through the proxy when an embedding model is set', () => {
    makeEmbeddings({ litellm: 'sk-test', litellm_embed_model: 'text-embedding-3-small' })

    expect(OpenAIEmbeddings).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      apiKey: 'sk-test',
      configuration: { baseURL: 'http://localhost:4000/v1' },
    })
  })

  it('throws for embeddings without a model so the factory falls back', () => {
    expect(() => makeEmbeddings({})).toThrow('litellm_embed_model_not_set')
    expect(OpenAIEmbeddings).not.toHaveBeenCalled()
  })
})
