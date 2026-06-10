import { geminiProvider } from './gemini'
import { openaiProvider } from './openai'
import type { ImageProvider } from './types'

const PROVIDERS: Record<string, ImageProvider> = {
  gemini: geminiProvider,
  openai: openaiProvider,
}

export function getProvider(id: string): ImageProvider {
  const provider = PROVIDERS[id]
  if (!provider) {
    throw new Error(`Unbekannter Bild-Provider: "${id}"`)
  }
  return provider
}

export const providers = PROVIDERS
export * from './types'
