import { createServerFn } from '@tanstack/react-start'
import type { Prisma } from '#/generated/prisma/client'
import type { JsonObject } from '#/lib/json'
import type { GenerateParams } from '#/lib/providers/types'
import type { GenerationDTO, StyleDTO, StyleVersionDTO } from '#/lib/types'

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue

// Prisma serverseitig laden — dynamischer Import hält den Client (Node-only,
// `fileURLToPath`) aus dem Browser-Bundle heraus.
const db = async () => (await import('#/db')).prisma

// ---------- Mapper (Prisma-Row -> serialisierbares DTO) ----------

type StyleRow = {
  id: string
  name: string
  description: string | null
  tags: unknown
  styleJson: unknown
  schemaVersion: number
  version: number
  provider: string
  modelId: string
  defaultParams: unknown
  anchorImageIds: unknown
  createdAt: Date
  updatedAt: Date
}

function toStyleDTO(s: StyleRow): StyleDTO {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    tags: (s.tags as Array<string>) ?? [],
    styleJson: (s.styleJson as JsonObject) ?? {},
    schemaVersion: s.schemaVersion,
    version: s.version,
    provider: s.provider,
    modelId: s.modelId,
    defaultParams: (s.defaultParams as GenerateParams) ?? {},
    anchorImageIds: (s.anchorImageIds as Array<string>) ?? [],
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

// ---------- Inputs ----------

export interface CreateStyleInput {
  name: string
  description?: string
  tags?: Array<string>
  styleJson: JsonObject
  defaultParams?: GenerateParams
  anchorImageIds?: Array<string>
  provider?: string
  modelId?: string
}

export interface UpdateStyleInput {
  id: string
  name?: string
  description?: string | null
  tags?: Array<string>
  styleJson?: JsonObject
  defaultParams?: GenerateParams
  anchorImageIds?: Array<string>
}

// ---------- Server Functions ----------

export const listStyles = createServerFn({ method: 'GET' })
  .validator((input?: { tag?: string; search?: string }) => input ?? {})
  .handler(async ({ data }): Promise<Array<StyleDTO>> => {
    const prisma = await db()
    const rows = await prisma.style.findMany({ orderBy: { updatedAt: 'desc' } })
    let styles = rows.map(toStyleDTO)

    if (data.tag) {
      styles = styles.filter((s) => s.tags.includes(data.tag as string))
    }
    if (data.search) {
      const q = data.search.toLowerCase()
      styles = styles.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q),
      )
    }
    return styles
  })

export const getStyle = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<StyleDTO | null> => {
    const prisma = await db()
    const row = await prisma.style.findUnique({ where: { id: data.id } })
    return row ? toStyleDTO(row) : null
  })

export const createStyle = createServerFn({ method: 'POST' })
  .validator((input: CreateStyleInput) => {
    if (!input?.name?.trim()) throw new Error('Name ist erforderlich.')
    if (typeof input.styleJson !== 'object' || input.styleJson === null) {
      throw new Error('styleJson muss ein Objekt sein.')
    }
    return input
  })
  .handler(async ({ data }): Promise<StyleDTO> => {
    const prisma = await db()
    const row = await prisma.style.create({
      data: {
        name: data.name.trim(),
        description: data.description ?? null,
        tags: asJson(data.tags ?? []),
        styleJson: asJson(data.styleJson),
        defaultParams: asJson(data.defaultParams ?? {}),
        anchorImageIds: asJson(data.anchorImageIds ?? []),
        provider: data.provider ?? 'gemini',
        modelId: data.modelId ?? 'gemini-3-pro-image',
        version: 1,
        versions: {
          create: { version: 1, styleJson: asJson(data.styleJson) },
        },
      },
    })
    return toStyleDTO(row)
  })

export const updateStyle = createServerFn({ method: 'POST' })
  .validator((input: UpdateStyleInput) => {
    if (!input?.id) throw new Error('id ist erforderlich.')
    return input
  })
  .handler(async ({ data }): Promise<StyleDTO> => {
    const prisma = await db()
    const current = await prisma.style.findUnique({ where: { id: data.id } })
    if (!current) throw new Error('Stil nicht gefunden.')

    const styleChanged =
      data.styleJson !== undefined &&
      JSON.stringify(data.styleJson) !== JSON.stringify(current.styleJson)
    const nextVersion = styleChanged ? current.version + 1 : current.version

    const row = await prisma.style.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.tags !== undefined ? { tags: asJson(data.tags) } : {}),
        ...(data.styleJson !== undefined ? { styleJson: asJson(data.styleJson) } : {}),
        ...(data.defaultParams !== undefined
          ? { defaultParams: asJson(data.defaultParams) }
          : {}),
        ...(data.anchorImageIds !== undefined
          ? { anchorImageIds: asJson(data.anchorImageIds) }
          : {}),
        version: nextVersion,
        ...(styleChanged
          ? {
              versions: {
                create: { version: nextVersion, styleJson: asJson(data.styleJson) },
              },
            }
          : {}),
      },
    })
    return toStyleDTO(row)
  })

export const deleteStyle = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const prisma = await db()
    await prisma.style.delete({ where: { id: data.id } })
    return { id: data.id }
  })

export const duplicateStyle = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<StyleDTO> => {
    const prisma = await db()
    const src = await prisma.style.findUnique({ where: { id: data.id } })
    if (!src) throw new Error('Stil nicht gefunden.')
    const row = await prisma.style.create({
      data: {
        name: `${src.name} (Kopie)`,
        description: src.description,
        tags: asJson(src.tags ?? []),
        styleJson: asJson(src.styleJson ?? {}),
        defaultParams: asJson(src.defaultParams ?? {}),
        anchorImageIds: asJson([]), // Anker werden nicht mitkopiert
        provider: src.provider,
        modelId: src.modelId,
        version: 1,
        versions: { create: { version: 1, styleJson: asJson(src.styleJson ?? {}) } },
      },
    })
    return toStyleDTO(row)
  })

export const listStyleVersions = createServerFn({ method: 'GET' })
  .validator((input: { styleId: string }) => input)
  .handler(async ({ data }): Promise<Array<StyleVersionDTO>> => {
    const prisma = await db()
    const rows = await prisma.styleVersion.findMany({
      where: { styleId: data.styleId },
      orderBy: { version: 'desc' },
    })
    return rows.map((v) => ({
      version: v.version,
      styleJson: (v.styleJson as JsonObject) ?? {},
      createdAt: v.createdAt.toISOString(),
    }))
  })

export const listGenerations = createServerFn({ method: 'GET' })
  .validator((input?: { styleId?: string; limit?: number }) => input ?? {})
  .handler(async ({ data }): Promise<Array<GenerationDTO>> => {
    const prisma = await db()
    const rows = await prisma.generation.findMany({
      where: data.styleId ? { styleId: data.styleId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: data.limit ?? 50,
      include: { images: { select: { id: true } } },
    })
    return rows.map((g) => ({
      id: g.id,
      styleId: g.styleId,
      subject: g.subject,
      promptText: JSON.stringify(g.compiledPrompt, null, 2),
      provider: g.provider,
      modelId: g.modelId,
      params: (g.params as GenerateParams) ?? {},
      status: g.status,
      errorMessage: g.errorMessage,
      costUsd: g.costUsd,
      outputImageIds: g.images.map((i) => i.id),
      createdAt: g.createdAt.toISOString(),
    }))
  })
