import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import type { MkLLM, MkEmb, EmbeddingsLike, LLM, Msg } from './types'

export const DEFAULT_LITELLM_BASE = 'http://localhost:4000'

// The OpenAI SDK falls back to OPENAI_API_KEY when apiKey is empty, which would
// send that key to the proxy. A placeholder keeps keyless local proxies working.
const NO_KEY = 'no-key'

export type LiteLLMModel = {
  name: string
  mode?: string
  maxOutputTokens?: number
}

// Accepts the proxy root with or without a trailing /v1.
export function litellmBase(url?: string) {
  const base = (url || DEFAULT_LITELLM_BASE).trim().replace(/\/+$/, '')
  return base.replace(/\/v1$/, '')
}

function authHeaders(key?: string): Record<string, string> {
  return key ? { Authorization: `Bearer ${key}` } : {}
}

async function getJson(url: string, key?: string) {
  const res = await fetch(url, { headers: authHeaders(key) })
  if (!res.ok) throw new Error(`litellm_http_${res.status}: GET ${url}`)
  return res.json()
}

// model_info.max_tokens is a legacy field: LiteLLM sets it to the output limit
// when the provider publishes one and to the input limit otherwise. Only trust
// it as an output cap when it is known to differ from max_input_tokens.
export function outputLimit(info: any): number | undefined {
  if (info?.max_output_tokens > 0) return info.max_output_tokens
  const legacy = info?.max_tokens
  if (legacy > 0 && info?.max_input_tokens > 0 && legacy < info.max_input_tokens) return legacy
  return undefined
}

// Lists the proxy's models from /model/info (mode + output limit per model),
// falling back to /v1/models on proxies that do not expose /model/info.
export async function fetchLiteLLMModels(base: string, key?: string): Promise<LiteLLMModel[]> {
  try {
    const body = await getJson(`${base}/model/info`, key)
    const seen = new Set<string>()
    const models: LiteLLMModel[] = []
    for (const d of body?.data || []) {
      if (!d?.model_name || seen.has(d.model_name)) continue
      seen.add(d.model_name)
      const info = d.model_info || {}
      models.push({
        name: d.model_name,
        mode: info.mode || undefined,
        maxOutputTokens: outputLimit(info),
      })
    }
    return models
  } catch {
    const body = await getJson(`${base}/v1/models`, key)
    return (body?.data || []).filter((m: any) => m?.id).map((m: any) => ({ name: m.id }))
  }
}

const catalogs = new Map<string, Promise<LiteLLMModel[]>>()

function loadCatalog(base: string, key?: string) {
  const id = `${base}|${key || ''}`
  let p = catalogs.get(id)
  if (!p) {
    p = fetchLiteLLMModels(base, key)
    p.catch(() => catalogs.delete(id))
    catalogs.set(id, p)
  }
  return p
}

export function resetLiteLLMCatalog() {
  catalogs.clear()
}

// Models without a mode come from /v1/models and are assumed to be chat models.
const isChatModel = (m: LiteLLMModel) => !m.mode || m.mode === 'chat' || m.mode === 'responses'

export function pickChatModel(models: LiteLLMModel[], wanted?: string): LiteLLMModel {
  if (wanted) return models.find(m => m.name === wanted) || { name: wanted }
  const first = models.find(isChatModel)
  if (!first) throw new Error('litellm_no_chat_model: set LITELLM_MODEL or add a chat model to the proxy')
  return first
}

// LLM_MAXTOK applies to every provider, but a gateway serves models with
// different output limits; asking for more than the model allows is a 400.
export function clampMaxTokens(requested: number | undefined, model: LiteLLMModel) {
  if (!requested || !model.maxOutputTokens) return requested
  return Math.min(requested, model.maxOutputTokens)
}

export function textContent(blocks: any[]) {
  return blocks
    .map(b => (typeof b === 'string' ? b : b?.type === 'text' ? b.text || '' : ''))
    .join('')
}

export const makeLLM: MkLLM = (cfg: any): LLM => {
  const base = litellmBase(cfg.litellm_base)
  const key = cfg.litellm || undefined
  let chat: Promise<ChatOpenAI> | undefined

  const build = async () => {
    let model: LiteLLMModel
    let models: LiteLLMModel[] | undefined
    try {
      models = await loadCatalog(base, key)
    } catch (e) {
      const reason = (e as Error).message
      // A configured model still works when the catalog is unreachable.
      if (!cfg.litellm_model) {
        throw new Error(`litellm_unreachable: could not list models at ${base} (${reason}). Check LITELLM_BASE_URL and LITELLM_API_KEY, or set LITELLM_MODEL`)
      }
      console.warn(`[litellm] model catalog unavailable at ${base}, using ${cfg.litellm_model}: ${reason}`)
    }
    if (models) {
      model = pickChatModel(models, cfg.litellm_model)
      if (cfg.litellm_model && !models.some(m => m.name === cfg.litellm_model)) {
        console.warn(`[litellm] LITELLM_MODEL=${cfg.litellm_model} is not listed by the proxy at ${base}; requests may fail`)
      }
    } else {
      model = { name: cfg.litellm_model }
    }
    if (!cfg.litellm_model) console.info(`[litellm] LITELLM_MODEL not set, using ${model.name} from the proxy`)
    return new ChatOpenAI({
      model: model.name,
      apiKey: key || NO_KEY,
      configuration: { baseURL: `${base}/v1` },
      temperature: cfg.temp ?? 0.7,
      maxTokens: clampMaxTokens(cfg.max_tokens, model),
    })
  }

  const getChat = () => {
    if (!chat) {
      chat = build()
      chat.catch(() => { chat = undefined })
    }
    return chat
  }

  const invoke = async (ms: Msg[]) => {
    const r: any = await (await getChat()).invoke(ms)
    // The proxy adds `images` / `thinking_blocks` to some replies (e.g. Gemini),
    // which makes @langchain/openai return content blocks instead of a string.
    // Callers read `content` as text, so flatten the text blocks.
    if (Array.isArray(r?.content)) r.content = textContent(r.content)
    return r
  }
  return { invoke, call: invoke }
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  // Without an embedding model the factory falls back to EMB_PROVIDER.
  if (!cfg.litellm_embed_model) throw new Error('litellm_embed_model_not_set')
  return new OpenAIEmbeddings({
    model: cfg.litellm_embed_model,
    apiKey: cfg.litellm || NO_KEY,
    configuration: { baseURL: `${litellmBase(cfg.litellm_base)}/v1` },
  })
}
