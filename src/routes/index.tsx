import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { generateImage } from '#/server/generate'
import { StyleEditor } from '#/components/StyleEditor'
import { ResultGrid } from '#/components/ResultGrid'
import { PromptPreview } from '#/components/PromptPreview'
import { PresetPicker } from '#/components/PresetPicker'
import { SaveStyleDialog } from '#/components/SaveStyleDialog'
import type { JsonObject } from '#/lib/json'
import type {
  AspectRatio,
  ImageSize,
  ThinkingLevelOpt,
} from '#/lib/providers/types'

export const Route = createFileRoute('/')({ component: Playground })

const ASPECT_RATIOS: Array<AspectRatio> = [
  '1:1',
  '4:5',
  '3:4',
  '2:3',
  '3:2',
  '4:3',
  '16:9',
  '9:16',
  '21:9',
]
const IMAGE_SIZES: Array<ImageSize> = ['1K', '2K', '4K']
const THINKING_LEVELS: Array<ThinkingLevelOpt> = ['minimal', 'low', 'medium', 'high']

const DEFAULT_STYLE: JsonObject = {
  type: 'photographic',
  camera: { lens_mm: 35, aperture: 'f/2.0' },
  lighting: {
    setup: 'soft window light',
    quality: 'soft, diffused',
    color_temperature_k: 5200,
  },
  color: {
    film_emulation: 'Kodak Portra 400',
    grade: 'lifted shadows, muted saturation',
    temperature: 'warm',
  },
  post_processing: { grain: 'fine, subtle' },
  composition: { framing: 'medium', rule_of_thirds: true },
  mood: 'calm, editorial, premium',
  negative: 'no HDR look, no oversaturation, no harsh shadows',
}

function Playground() {
  const [style, setStyle] = useState<JsonObject>(DEFAULT_STYLE)
  const [subject, setSubject] = useState(
    'a ceramic coffee cup on a wooden desk next to a laptop',
  )
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5')
  const [imageSize, setImageSize] = useState<ImageSize>('2K')
  const [count, setCount] = useState(2)
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevelOpt>('high')
  const [saveOpen, setSaveOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: (vars: Parameters<typeof generateImage>[0]['data']) =>
      generateImage({ data: vars }),
  })

  function handleGenerate() {
    mutation.mutate({
      styleJson: style,
      subject,
      params: { aspectRatio, imageSize, count, thinkingLevel },
    })
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Image Style Studio</h1>
        <p className="text-muted-foreground text-sm">
          Playground — Stil + Motiv testen (Gemini 3 Pro Image)
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Linke Spalte: Editor */}
        <div className="flex min-w-0 flex-col gap-4">
          <PresetPicker
            onApply={(preset) => {
              setStyle(preset.styleJson)
              if (preset.params?.aspectRatio) setAspectRatio(preset.params.aspectRatio)
              if (preset.params?.imageSize) setImageSize(preset.params.imageSize)
              if (preset.params?.thinkingLevel)
                setThinkingLevel(preset.params.thinkingLevel)
            }}
          />
          <StyleEditor value={style} onChange={setStyle} />

          <div>
            <label className="mb-1 block text-sm font-medium">Motiv (subject)</label>
            <textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-20 w-full resize-y rounded-md border bg-background p-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Format">
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                {ASPECT_RATIOS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Größe">
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as ImageSize)}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                {IMAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Varianten">
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Thinking">
              <select
                value={thinkingLevel}
                onChange={(e) => setThinkingLevel(e.target.value as ThinkingLevelOpt)}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                {THINKING_LEVELS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <PromptPreview styleJson={style} subject={subject} />

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={mutation.isPending || subject.trim() === ''}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {mutation.isPending ? 'Generiere…' : 'Bilder generieren'}
            </button>
            <button
              onClick={() => setSaveOpen(true)}
              className="rounded-md border px-4 py-2 text-sm font-medium"
              title="Aktuellen Stil in die Bibliothek speichern"
            >
              Als Stil speichern
            </button>
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600">
              Fehler: {(mutation.error as Error).message}
            </p>
          )}
        </div>

        {/* Rechte Spalte: Ergebnisse */}
        <div className="flex min-w-0 flex-col gap-4">
          {mutation.isPending && (
            <div className="text-muted-foreground text-sm">
              Generiere {count} {count === 1 ? 'Bild' : 'Bilder'}…
            </div>
          )}

          {mutation.data && (
            <ResultGrid
              images={mutation.data.images}
              promptText={mutation.data.promptText}
              costUsd={mutation.data.costUsd}
            />
          )}

          {!mutation.isPending && !mutation.data && (
            <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
              Noch keine Bilder. Stil + Motiv eingeben und generieren.
            </div>
          )}
        </div>
      </div>

      <SaveStyleDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        styleJson={style}
        defaultParams={{ aspectRatio, imageSize, count, thinkingLevel }}
      />
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}
