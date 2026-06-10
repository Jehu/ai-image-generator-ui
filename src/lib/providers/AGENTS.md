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
  apiKeyEnv: string            // Name der Env-Variable mit dem API-Key
  models: Array<ModelDescriptor>
  generate(req: GenerateRequest): Promise<GenerateResult>
}
```

- `GenerateRequest.promptText` ist der fertig kompilierte Text aus `compilePrompt()`.
- `GenerateRequest.references` enthält Base64-Bilder ohne `data:`-Präfix.
- `GenerateResult.costUsd` ist eine Schätzung (Bildpreis × Anzahl); Token-Overhead wird vernachlässigt.
- `apiKeyEnv` ist die einzige Stelle, an der ein Provider seinen Key bekanntgibt. `listAvailableModels` (`src/server/models.ts`) prüft darüber, welche Provider konfiguriert sind, und füllt die UI-Modellauswahl.
- `ModelDescriptor.supportsReferences` steuert, ob Anker-/Referenzbilder genutzt werden.

### Registrierung (`index.ts`)

Neue Provider in `PROVIDERS`-Record eintragen; `getProvider(id)` wirft bei unbekannter ID.

### Gemini-Besonderheiten (`gemini.ts`)

- `gemini-3-pro-image` liefert **pro API-Call genau 1 Bild** → N Varianten = N parallele Calls.
- **Keine Seed-Unterstützung** (`supportsSeed: false`) — Konsistenz nur über Referenzbilder.
- Preistabelle (`PRICE_PER_IMAGE`) bei Preisänderungen hier aktualisieren.
- `GEMINI_API_KEY` aus `process.env` — nie hardcoden.

### OpenAI-Besonderheiten (`openai.ts`)

- Modelle: `gpt-image-1` (feste Pro-Bild-Preise, Anker via `images.edit`) und `gpt-image-2`
  (`supportsReferences: false`, token-basiert → Kosten nur grob geschätzt).
- `images.generate` liefert mehrere Bilder pro Call (`n`); mit Ankern wird `images.edit`
  genutzt (`input_fidelity: 'high'`).
- Param-Mapping Gemini→OpenAI: `aspectRatio`→`size` (1024er-Varianten), `imageSize`→`quality`,
  `thinkingLevel` entfällt. Preistabellen (`PRICE_GPT_IMAGE_1/2`) bei Änderungen hier pflegen.
- `OPENAI_API_KEY` aus `process.env`.

## Work Guidance

Neuen Provider anlegen:
1. Datei `src/lib/providers/<name>.ts` mit `ImageProvider`-Implementierung erstellen (inkl. `apiKeyEnv`).
2. In `src/lib/providers/index.ts` unter neuem Key registrieren.
3. `ModelDescriptor` korrekt befüllen (`maxReferenceImages`, `supportsSeed`, `supportsReferences`, `imageSizes`, `aspectRatios`).
4. Sobald der Key gesetzt ist, erscheinen die Modelle automatisch in der UI-Auswahl (`ModelPicker` ⇄ `listAvailableModels`).
