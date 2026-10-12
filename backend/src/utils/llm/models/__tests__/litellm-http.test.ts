import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeLLM, resetLiteLLMCatalog } from '../litellm'

// Uses the real @langchain/openai client and intercepts the HTTP requests it
// makes, so these tests check what actually goes over the wire to the proxy.

const OPENAI_KEY = 'sk-openai-must-not-leak'

type Req = { url: string; auth: string | null; body: any }

const jsonResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const completion = (content: any, extra: Record<string, any> = {}) => ({
  id: 'chatcmpl-test',
  object: 'chat.completion',
  created: 0,
  model: 'gpt-4.1-mini',
  choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content, ...extra } }],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
})

let requests: Req[]
let reply: any

function fakeFetch(input: any, init?: any) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  const body = init?.body ? JSON.parse(String(init.body)) : undefined
  requests.push({ url, auth: headers.get('authorization'), body })
  if (url.endsWith('/model/info')) {
    return Promise.resolve(jsonResponse({
      data: [
        { model_name: 'gpt-4.1-mini', model_info: { mode: 'chat', max_output_tokens: 32768 } },
        { model_name: 'legacy-out', model_info: { mode: 'chat', max_tokens: 4096, max_input_tokens: 128000 } },
      ],
    }))
  }
  if (url.endsWith('/chat/completions')) return Promise.resolve(jsonResponse(reply))
  return Promise.resolve(jsonResponse({ error: 'not found' }, 404))
}

const msgs = [{ role: 'user' as const, content: 'hi' }]
const chatRequest = () => requests.find(r => r.url.endsWith('/chat/completions'))!

describe('LiteLLM provider over HTTP', () => {
  beforeEach(() => {
    resetLiteLLMCatalog()
    requests = []
    reply = completion('Hello from the proxy')
    vi.stubGlobal('fetch', vi.fn(fakeFetch))
    vi.stubEnv('OPENAI_API_KEY', OPENAI_KEY)
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('sends the LiteLLM key to the proxy, not OPENAI_API_KEY', async () => {
    const r = await makeLLM({ litellm: 'sk-litellm', litellm_base: 'http://proxy:4000/v1', litellm_model: 'gpt-4.1-mini' }).invoke(msgs)

    expect(r.content).toBe('Hello from the proxy')
    const chat = chatRequest()
    expect(chat.url).toBe('http://proxy:4000/v1/chat/completions')
    expect(chat.auth).toBe('Bearer sk-litellm')
    expect(chat.body.model).toBe('gpt-4.1-mini')
    expect(requests.every(q => !q.auth?.includes(OPENAI_KEY))).toBe(true)
  })

  it('never sends OPENAI_API_KEY to the proxy when no key is set', async () => {
    await makeLLM({ litellm_model: 'gpt-4.1-mini' }).invoke(msgs)

    const chat = chatRequest()
    expect(chat.url).toBe('http://localhost:4000/v1/chat/completions')
    expect(chat.auth).toBe('Bearer no-key')
    expect(requests.find(q => q.url.endsWith('/model/info'))!.auth).toBeNull()
    expect(requests.every(q => !q.auth?.includes(OPENAI_KEY))).toBe(true)
  })

  it('caps max_tokens in the request body at the model output limit', async () => {
    await makeLLM({ litellm_model: 'legacy-out', max_tokens: 40000 }).invoke(msgs)

    expect(chatRequest().body.max_tokens).toBe(4096)
  })

  it('returns string content when the proxy adds images to the reply', async () => {
    reply = completion('Chlorophyll absorbs light.', { images: [{ type: 'image_url', image_url: { url: 'data:,' } }] })

    const r = await makeLLM({ litellm_model: 'gpt-4.1-mini' }).invoke(msgs)

    expect(typeof r.content).toBe('string')
    expect(r.content).toContain('Chlorophyll absorbs light.')
  })
})
