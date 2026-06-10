import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import {
  createStyle,
  deleteStyle,
  duplicateStyle,
  listStyles,
} from '#/server/styles'
import { getImageDataUrl } from '#/server/images'
import { readStyleImport, type StyleExport } from '#/lib/export'

export const Route = createFileRoute('/styles/')({ component: StylesLibrary })

function CardThumb({ imageId }: { imageId: string }) {
  const { data } = useQuery({
    queryKey: ['image', imageId],
    queryFn: () => getImageDataUrl({ data: { id: imageId } }),
  })
  if (!data) return null
  return (
    <img
      src={data.dataUrl}
      alt=""
      className="mb-3 h-32 w-full rounded object-cover"
    />
  )
}

function StylesLibrary() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: styles = [], isLoading } = useQuery({
    queryKey: ['styles'],
    queryFn: () => listStyles({ data: {} }),
  })

  const allTags = useMemo(() => {
    const set = new Set<string>()
    styles.forEach((s) => s.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [styles])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return styles.filter((s) => {
      const matchesTag = !activeTag || s.tags.includes(activeTag)
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q)
      return matchesTag && matchesSearch
    })
  }, [styles, search, activeTag])

  const dup = useMutation({
    mutationFn: (id: string) => duplicateStyle({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['styles'] }),
  })
  const del = useMutation({
    mutationFn: (id: string) => deleteStyle({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['styles'] }),
  })
  const importMut = useMutation({
    mutationFn: (s: StyleExport) =>
      createStyle({
        data: {
          name: s.name,
          tags: s.tags,
          styleJson: s.styleJson,
          defaultParams: s.defaultParams,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['styles'] }),
  })

  // Versteckten File-Input öffnen und importierte JSON als neuen Stil anlegen
  async function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const parsed = await readStyleImport(file)
        importMut.mutate(parsed)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Import fehlgeschlagen.')
      }
    }
    // Zurücksetzen, damit dieselbe Datei erneut wählbar ist
    e.target.value = ''
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bibliothek</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Stil importieren
          </button>
          <Link
            to="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            + Neuer Stil (Playground)
          </Link>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche…"
          className="w-64 rounded-md border bg-background p-2 text-sm"
        />
        <div className="flex flex-wrap gap-1">
          <TagChip active={activeTag === null} onClick={() => setActiveTag(null)}>
            Alle
          </TagChip>
          {allTags.map((t) => (
            <TagChip
              key={t}
              active={activeTag === t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            >
              {t}
            </TagChip>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Lade…</p>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-10 text-center text-sm">
          {styles.length === 0
            ? 'Noch keine Stile gespeichert. Im Playground einen Stil finden und „Als Stil speichern".'
            : 'Keine Stile passend zum Filter.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="flex flex-col rounded-lg border p-4">
              {s.anchorImageIds.length > 0 && (
                <CardThumb imageId={s.anchorImageIds[0]} />
              )}
              <div className="flex items-start justify-between gap-2">
                <Link
                  to="/styles/$id"
                  params={{ id: s.id }}
                  className="font-medium hover:underline"
                >
                  {s.name}
                </Link>
                <span className="text-muted-foreground shrink-0 text-xs">
                  v{s.version}
                </span>
              </div>
              {s.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {s.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2 text-xs">
                <Link
                  to="/styles/$id"
                  params={{ id: s.id }}
                  className="rounded border px-2 py-1 font-medium"
                >
                  Öffnen
                </Link>
                <button
                  onClick={() => dup.mutate(s.id)}
                  className="rounded border px-2 py-1"
                >
                  Duplizieren
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Stil „${s.name}" löschen?`)) del.mutate(s.id)
                  }}
                  className="rounded border px-2 py-1 text-red-600"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs ${
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
      }`}
    >
      {children}
    </button>
  )
}
