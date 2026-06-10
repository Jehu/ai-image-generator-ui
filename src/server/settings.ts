import { createServerFn } from '@tanstack/react-start'

export interface SettingsInfo {
  hasApiKey: boolean
  apiKeyMasked: string | null
  imageDir: string
  databaseUrl: string
}

/** Liest serverseitige Konfiguration (API-Key wird nie im Klartext gesendet). */
export const getSettingsInfo = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SettingsInfo> => {
    const key = process.env.GEMINI_API_KEY ?? ''
    const masked =
      key.length > 0
        ? `${key.slice(0, 4)}…${key.slice(-4)} (${key.length} Zeichen)`
        : null
    return {
      hasApiKey: key.trim().length > 0,
      apiKeyMasked: masked,
      imageDir: process.env.IMAGE_DIR ?? 'data/images',
      databaseUrl: (process.env.DATABASE_URL ?? 'file:./prisma/data/dev.db').replace(
        /(:\/\/[^:]+:)[^@]+(@)/,
        '$1***$2',
      ),
    }
  },
)
