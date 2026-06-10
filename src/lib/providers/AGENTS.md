# AGENTS.md — src/lib/providers/

## Purpose

Provider-Abstraktion für KI-Bildgenerierung. Definiert das `ImageProvider`-Interface und registriert konkrete Implementierungen. Neue Provider (Imagen, GPT-Image, …) können hinzugefügt werden, ohne Aufrufer anzupassen.

## Ownership

`types.ts`, `index.ts`, `gemini.ts` und künftige Provider-Dateien.

## Local Contracts

### Interface-Vertrag (`types.ts`)

Jeder Provider implementiert `ImageProvider`:
```ts
interface ImageProvider {
  id: string
  models: Array<ModelDescriptor>
  generate(req: GenerateRequest): Promise<GenerateResult>
}
```

- `GenerateRequest.promptText` ist der fertig kompilierte Text aus `compilePrompt()`.
- `GenerateRequest.references` enthält Base64-Bilder ohne `data:`-Präfix.
- `GenerateResult.costUsd` ist eine Schätzung (Bildpreis × Anzahl); Token-Overhead wird vernachlässigt.

### Registrierung (`index.ts`)

Neue Provider in `PROVIDERS`-Record eintragen; `getProvider(id)` wirft bei unbekannter ID.

### Gemini-Besonderheiten (`gemini.ts`)

- `gemini-3-pro-image` liefert **pro API-Call genau 1 Bild** → N Varianten = N parallele Calls.
- **Keine Seed-Unterstützung** (`supportsSeed: false`) — Konsistenz nur über Referenzbilder.
- Preistabelle (`PRICE_PER_IMAGE`) bei Preisänderungen hier aktualisieren.
- `GEMINI_API_KEY` aus `process.env` — nie hardcoden.

## Work Guidance

Neuen Provider anlegen:
1. Datei `src/lib/providers/<name>.ts` mit `ImageProvider`-Implementierung erstellen.
2. In `src/lib/providers/index.ts` unter neuem Key registrieren.
3. `ModelDescriptor` korrekt befüllen (`maxReferenceImages`, `supportsSeed`, `imageSizes`, `aspectRatios`).
