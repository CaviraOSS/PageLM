const MAX_AUDIO_BYTES = 100 * 1024 * 1024

export type VoxCpmSettings = { apiKey: string; model: string; baseUrl: string }

export function finalizeWav(wav: Uint8Array): Uint8Array {
  const text = new TextDecoder()
  if (wav.length < 12 || text.decode(wav.slice(0, 4)) !== 'RIFF' || text.decode(wav.slice(8, 12)) !== 'WAVE') {
    throw new Error('voxcpm_invalid_wav')
  }

  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
  let cursor = 12
  let dataOffset = -1
  while (cursor + 8 <= wav.length) {
    const chunkSize = view.getUint32(cursor + 4, true)
    if (text.decode(wav.slice(cursor, cursor + 4)) === 'data') {
      dataOffset = cursor + 8
      break
    }
    cursor += 8 + chunkSize + (chunkSize & 1)
  }

  if (dataOffset < 0 || dataOffset > wav.length) throw new Error('voxcpm_wav_data_missing')

  const normalized = new Uint8Array(wav)
  const normalizedView = new DataView(normalized.buffer, normalized.byteOffset, normalized.byteLength)
  normalizedView.setUint32(4, normalized.length - 8, true)
  normalizedView.setUint32(dataOffset - 4, normalized.length - dataOffset, true)
  return normalized
}

export function parseVoxCpmSse(body: string): Uint8Array {
  const audioParts: Uint8Array[] = []
  let total = 0
  let completed = false
  let eventData: string[] = []

  function processEvent() {
    if (eventData.length === 0) return
    let event: any
    try {
      event = JSON.parse(eventData.join('\n'))
    } catch {
      throw new Error('voxcpm_invalid_sse_event')
    }
    eventData = []

    if (event.type === 'error') {
      const detail = typeof event.error === 'string' ? event.error : JSON.stringify(event.error || {})
      throw new Error(detail || 'voxcpm_provider_error')
    }
    if (event.type === 'speech.audio.delta') {
      if (typeof event.audio !== 'string' || !event.audio) throw new Error('voxcpm_empty_audio_chunk')
      const chunk = Buffer.from(event.audio, 'base64')
      const normalizedInput = event.audio.replace(/\s/g, '').replace(/=+$/, '')
      if (chunk.length === 0 || chunk.toString('base64').replace(/=+$/, '') !== normalizedInput) {
        throw new Error('voxcpm_invalid_audio_base64')
      }
      total += chunk.length
      if (total > MAX_AUDIO_BYTES) throw new Error('voxcpm_audio_too_large')
      audioParts.push(chunk)
    }
    if (event.type === 'speech.audio.done') completed = true
  }

  for (const line of body.split(/\r?\n/)) {
    if (line === '') {
      processEvent()
    } else if (line.startsWith('data:')) {
      eventData.push(line.slice(5).trim())
    }
  }
  processEvent()

  if (!completed) throw new Error('voxcpm_stream_incomplete')
  if (audioParts.length === 0) throw new Error('voxcpm_audio_missing')

  const audio = new Uint8Array(total)
  let offset = 0
  for (const part of audioParts) {
    audio.set(part, offset)
    offset += part.length
  }
  return finalizeWav(audio)
}

export async function requestVoxCpm(text: string, settings: VoxCpmSettings, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(`${settings.baseUrl.replace(/\/$/, '')}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({
      model: settings.model,
      input: text,
      voice: 'default',
      response_format: 'wav',
      stream: true
    }),
    signal: AbortSignal.timeout(120000)
  })

  if (!response.ok) throw new Error(`voxcpm_http_${response.status}`)
  return parseVoxCpmSse(await response.text())
}
