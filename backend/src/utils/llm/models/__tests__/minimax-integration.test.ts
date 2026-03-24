import { describe, it, expect } from 'vitest'
import { makeLLM } from '../minimax'

/**
 * Integration tests for MiniMax LLM provider.
 * Requires MINIMAX_API_KEY environment variable.
 * Run with: MINIMAX_API_KEY=<key> npx vitest run --reporter=verbose minimax-integration
 */
describe('MiniMax integration', () => {
  const apiKey = process.env.MINIMAX_API_KEY

  it.skipIf(!apiKey)('should invoke MiniMax-M2.7 and return a response', async () => {
    const llm = makeLLM({ minimax: apiKey, temp: 0.1, max_tokens: 256 })
    const result = await llm.invoke([
      { role: 'user', content: 'Reply with exactly: hello world' },
    ])
    expect(result).toBeDefined()
    expect(typeof result.content).toBe('string')
    expect(result.content.toLowerCase()).toContain('hello')
  }, 30000)

  it.skipIf(!apiKey)('should invoke MiniMax-M2.5-highspeed model', async () => {
    const llm = makeLLM({
      minimax: apiKey,
      minimax_model: 'MiniMax-M2.5-highspeed',
      temp: 0.1,
      max_tokens: 128,
    })
    const result = await llm.invoke([
      { role: 'user', content: 'What is 2+2? Answer with just the number.' },
    ])
    expect(result).toBeDefined()
    expect(result.content).toContain('4')
  }, 30000)

  it.skipIf(!apiKey)('should work with call() method (alias for invoke)', async () => {
    const llm = makeLLM({ minimax: apiKey, temp: 0.1, max_tokens: 128 })
    const result = await llm.call([
      { role: 'user', content: 'Say "ok"' },
    ])
    expect(result).toBeDefined()
    expect(typeof result.content).toBe('string')
  }, 30000)
})
