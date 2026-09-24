import { describe, expect, it, vi } from 'vitest'
import { finalizeWav, parseVoxCpmSse, requestVoxCpm } from './voxcpm'

function wavWithUnknownLengths() {
  const wav = new Uint8Array(52)
  wav.set(new TextEncoder().encode('RIFF'), 0)
  wav.set(new TextEncoder().encode('WAVE'), 8)
  wav.set(new TextEncoder().encode('fmt '), 12)
  wav.set(new TextEncoder().encode('data'), 36)
  wav.set([1, 2, 3, 4, 5, 6, 7, 8], 44)
  const view = new DataView(wav.buffer)
  view.setUint32(4, 0xffffffff, true)
  view.setUint32(40, 0xffffffff, true)
  return wav
}

describe('VoxCPM TTS helpers', () => {
  it('repairs streamed WAV lengths', () => {
    const wav = finalizeWav(wavWithUnknownLengths())
    const view = new DataView(wav.buffer)
    expect(view.getUint32(4, true)).toBe(wav.length - 8)
    expect(view.getUint32(40, true)).toBe(8)
  })

  it('parses audio deltas and requires a done event', () => {
    const source = wavWithUnknownLengths()
    const encoded = Buffer.from(source).toString('base64')
    const body = [
      `data: ${JSON.stringify({ type: 'speech.audio.delta', audio: encoded })}`,
      '',
      `data: ${JSON.stringify({ type: 'speech.audio.done' })}`
    ].join('\n')

    expect(parseVoxCpmSse(body).length).toBe(source.length)
    expect(() => parseVoxCpmSse(`data: ${JSON.stringify({ type: 'speech.audio.delta', audio: encoded })}`)).toThrow('voxcpm_stream_incomplete')
    expect(() => parseVoxCpmSse(`data: ${JSON.stringify({ type: 'speech.audio.delta', audio: 'not-base64' })}\n\ndata: ${JSON.stringify({ type: 'speech.audio.done' })}`)).toThrow('voxcpm_invalid_audio_base64')
    expect(() => parseVoxCpmSse(`data: ${JSON.stringify({ type: 'error', error: { message: 'bad request' } })}`)).toThrow('{"message":"bad request"}')
  })

  it('sends the ModelBest payload with the protocol default voice', async () => {
    const source = wavWithUnknownLengths()
    const encoded = Buffer.from(source).toString('base64')
    const fetchMock = vi.fn(async () => new Response([
      `data: ${JSON.stringify({ type: 'speech.audio.delta', audio: encoded })}`,
      '',
      `data: ${JSON.stringify({ type: 'speech.audio.done' })}`,
      ''
    ].join('\n'), { status: 200 }))

    await requestVoxCpm('你好，PageLM。', {
      apiKey: 'test-key',
      model: 'VoxCPM2',
      baseUrl: 'https://api.modelbest.cn/v1/'
    }, fetchMock as typeof fetch)

    expect(fetchMock).toHaveBeenCalledOnce()
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    const [url, init] = calls[0]
    expect(url).toBe('https://api.modelbest.cn/v1/audio/speech')
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'VoxCPM2',
      input: '你好，PageLM。',
      voice: 'default',
      response_format: 'wav',
      stream: true
    })
  })
})
