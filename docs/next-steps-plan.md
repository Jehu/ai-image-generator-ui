# Image Style Studio — Plan: Nächste Features

Status: Der ursprüngliche Plan (M1–M5) ist vollständig umgesetzt und verifiziert. Dieses
Dokument plant die drei als Nächstes gewählten Themen. **Reihenfolge-Empfehlung:**
1. Output-Persistenz + Export (schließt Lücke, klein) → 2. Stil aus Referenzbild (hoher Nutzen,
mittel) → 3. Illustrationen & Infografiken (großer Scope, Refactor).

**Fortschritt:**
- ✅ **Feature A vollständig umgesetzt** (A1 Output-Persistenz, A2 Historie-Thumbnails,
  A3 ZIP-/Stil-Export + Stil-Import). Verifiziert: tsc + Build + 17 Tests grün, UI im Browser geprüft.
- ✅ **Feature B vollständig umgesetzt** (`analyzeStyleFromImage` in `src/server/analyze.ts` via
  Gemini-Vision, Default-Modell `gemini-2.5-flash` über `GEMINI_ANALYSIS_MODEL`; UI „Stil aus Bild
  ableiten" im Playground; geteilter Helper `src/lib/fileToDataUrl.ts`). Verifiziert: tsc + Build +
  Tests + Lint grün. Hinweis: echter Vision-API-Call (Credits + reales Bild) noch manuell zu testen.
**Nächster Punkt: Feature C — Illustrationen & Infografiken.**

## Architektur-Kontext (gilt für alle Features)

Wiederkehrende Muster, die eingehalten werden müssen (sonst bricht es):

- **Prisma/Storage nur dynamisch in Server-Function-Handlern importieren**
  (`const { prisma } = await import('#/db')`, `const s = await (await import('#/lib/storage')).getStorage()`).
  Statischer Top-Level-Import leakt Node-Code ins Client-Bundle (`fileURLToPath`-Crash).
- **Server-Function-Returns müssen serialisierbar sein** — keine `unknown`-Werte. DTOs in
  `src/lib/types.ts`, JSON-Typen in `src/lib/json.ts`. Dates als ISO-String.
- **Json-Writes** an Prisma per `asJson(...)`-Helper casten (`Prisma.InputJsonValue`).
- **Nach Prisma-Schema-Änderungen**: `npm run db:push && npm run db:generate` **und Dev-Server
  neu starten** (sonst alter Client im Speicher → `prisma.<model> is undefined`).
- Neue Komponente + ihre Referenzstelle möglichst in einem Schritt anlegen (sonst transienter
  HMR-Fehler „X is not defined").
- Provider/Compile (`src/lib/providers/`, `src/lib/prompt/compile.ts`) sind bewusst generisch.

Relevante bestehende Dateien: `src/server/{generate,styles,images,cameras,settings}.ts`,
`src/lib/storage/{index,local}.ts`, `src/components/{StyleEditor,ResultGrid,AnchorManager,PromptPreview}.tsx`,
`src/routes/{index,styles.$id,styles.index,settings}.tsx`, `prisma/schema.prisma`.

---

## Feature A — Output-Persistenz + Export

**Ziel:** Generierte Produktionsbilder dauerhaft speichern (aktuell nur Metadaten/Kosten in der
Historie), Thumbnails in der Historie zeigen, und Bilder/Stil exportieren.

### A1 — Output-Bilder persistieren
- In `src/server/generate.ts` (Produce-Pfad, `data.styleId` gesetzt): jedes Ergebnis-Bild über
  den Storage-Adapter speichern und `Image`-Row anlegen (`kind: 'output'`, `generationId`),
  dann `Generation.outputImageId` (erstes Bild) setzen. Storage dynamisch importieren.
- Optional konfigurierbar (z.B. nur bei Produce, nicht im Playground — Playground bleibt
  ephemer, um Plattenmüll zu vermeiden). Default: Produce persistiert.
- `referenceImageIds` ist bereits vorhanden; analog `outputImageIds` über die `Image`-Relation
  abrufbar (Modell `Image.generationId` existiert schon).

### A2 — Historie mit Thumbnails
- `listGenerations` liefert bereits `outputImageIds`. In `src/routes/styles.$id.tsx` die
  Historie-Einträge um ein Thumbnail erweitern: `getImageDataUrl({id})` (existiert in
  `src/server/images.ts`) je erstes Output-Bild, kleine Vorschau + Klick zum Vergrößern.

### A3 — Export
- **Bild-Set als ZIP:** Dependency `jszip` (client). Button „Alle Bilder herunterladen" auf der
  Detailseite: lädt die `dataUrl`s der Output-Bilder, packt sie als ZIP (`<style-slug>-<n>.png`,
  alternativ nach Motiv benannt) und triggert Download. Slug aus Stilname ableiten.
- **Stil exportieren/importieren:** Button „Stil als JSON exportieren" (Download von
  `{ name, tags, styleJson, defaultParams, kind }`) und „Stil importieren" (Datei einlesen →
  `createStyle`). Nützlich für Backup/Teilen. Reiner Client + bestehende Server Functions.

### Key files
- `src/server/generate.ts` (Persistenz), `src/server/images.ts` (ggf. `listGenerationImages`),
  `src/routes/styles.$id.tsx` (Thumbnails + Export-Buttons), `src/lib/export.ts` (neu: zip + slug),
  `package.json` (jszip).

### Verifikation
- Produce generieren → Datei in `data/images/` + `Image`-Row (`kind=output`) + Thumbnail in
  Historie. Persistenz über Neustart hinweg. ZIP-Download enthält alle Bilder. Stil-JSON-Export
  re-importierbar. Keine Konsolen-Fehler.

---

## Feature B — Stil aus Referenzbild ableiten

**Ziel:** Bestehendes (Kunden-)Bild hochladen → Gemini analysiert es und füllt das Stil-Formular
automatisch vor. Trifft Marken-Looks schnell.

### Design
- Neue Server Function `analyzeStyleFromImage({ imageBase64, mimeType })` in
  `src/server/analyze.ts`:
  - Nutzt ein **Text-/Vision-Modell** (NICHT das Bildgenerierungsmodell) via `@google/genai`,
    z.B. `gemini-3-pro` (Modell-ID in `@google/genai` verifizieren). Bild als `inlineData`-Part +
    Text-Anweisung: „Analysiere den fotografischen Stil und gib NUR JSON gemäß folgendem Schema
    zurück …".
  - **Structured Output:** `config.responseMimeType = 'application/json'` und möglichst
    `responseSchema` (aus dem Zod-Schema ableiten oder kompaktes JSON-Schema mitgeben). Felder =
    `photoStyleSchema` (camera, optics, lighting, color, post_processing, composition, mood,
    negative). `subject` NICHT füllen (nur Stil).
  - Ergebnis parsen → `validatePhotoStyle` → als `JsonObject` zurückgeben (serialisierbar).
- UI im Playground (`src/routes/index.tsx`): Button „Stil aus Bild ableiten" → Datei-Upload
  (`fileToDataUrl` aus `AnchorManager` extrahieren/teilen) → Mutation → `setStyle(result)` +
  kurze Info, welche Felder erkannt wurden. Loading/Fehler-States.
- Kostenhinweis: Analyse kostet Tokens (Input-Bild + Output-JSON) — grob beziffern.

### Key files
- `src/server/analyze.ts` (neu), `src/lib/providers/` (ggf. Text-Modell-ID/Helper),
  `src/components/AnalyzeImageButton.tsx` (neu) oder inline in `index.tsx`,
  ggf. `src/lib/fileToDataUrl.ts` (Helper aus AnchorManager extrahieren, dann beide nutzen).

### Verifikation
- Bekanntes Foto hochladen (z.B. ein generiertes mit klarem Look) → vorgeschlagenes Stil-JSON
  ist plausibel (Film-Emulation/Licht/Grade getroffen), Formular füllt sich, JSON-Tab spiegelt es.
  Anschließend ein Motiv generieren und prüfen, ob der Look zum Referenzbild passt.

---

## Feature C — Illustrationen & Infografiken (mehrere Bildarten)

**Ziel:** Neben Fotos auch Illustrationen und Infografiken als eigene Bildarten mit eigenen
Stil-Parametern. Der ursprünglich aufgeschobene große Scope.

### Kernidee: „Bildart"-Dimension + Schema-Registry
Das Foto-Schema ist aktuell hart verdrahtet (`src/lib/schema/photoStyle.ts`,
`src/lib/schema/fields.ts`, `src/lib/taxonomy.ts`). Generalisieren auf eine **Registry pro Bildart**.

- Typ `ImageKind = 'foto' | 'illustration' | 'infografik'`.
- Registry `src/lib/kinds/index.ts`: `KINDS[kind] = { label, schema (zod), groups (FieldDef[]),
  defaultStyle (JsonObject), presets, taxonomy }`. Bestehendes Foto-Material dorthin als
  `kinds/foto.ts` umziehen.
- Neue Schemas/Felder:
  - **Illustration** (`kinds/illustration.ts`): style (flat, 3D-render, line-art, watercolor,
    isometric, comic, claymation…), line_weight, shading (cel/soft/none), color (palette,
    saturation, harmony), detail_level, background (solid/gradient/scene/transparent), texture,
    mood. Negative-Guards.
  - **Infografik** (`kinds/infografik.ts`): layout (grid/flow/timeline/comparison), visual_system
    (icon_style: line/filled/duotone), color_system (palette + accent), typography_hint
    (sans/serif, weight — Nano Banana Pro rendert Text gut), data_density, labels (on/off),
    background. Hinweis: Inhalt/Daten kommen über `subject`/Motiv; der Stil definiert das
    visuelle System.
- `compile.ts` bleibt generisch (Stil-JSON + subject). Bei Infografiken ggf. zusätzlicher
  System-Hinweis (analog `style_reference`), dass Text/Labels scharf gerendert werden sollen.

### Datenmodell
- `Style.kind String @default("foto")` in `prisma/schema.prisma` ergänzen (+ `db:push/generate`,
  Server-Neustart). `schemaVersion` pro Kind interpretieren.
- DTO `StyleDTO` um `kind` erweitern (`src/lib/types.ts`, `src/server/styles.ts` Mapper +
  `createStyle`/`duplicateStyle`).

### UI
- **Playground** (`src/routes/index.tsx`): „Bildart"-Auswahl ganz oben (Segmented Control). Wechsel
  lädt `KINDS[kind].defaultStyle` + reicht `kind` an `StyleEditor` und `PresetPicker` durch.
- **StyleEditor** (`src/components/StyleEditor.tsx`): nimmt `kind`-Prop, rendert
  `KINDS[kind].groups` statt der festen `GROUPS`. `dynamicOptions` (Kamera-Bodys) nur bei `foto`.
- **PresetPicker**: Presets aus `KINDS[kind].presets`.
- **Bibliothek** (`styles.index.tsx`): Kind-Badge je Karte + Filter nach Bildart.
- **Detail/Produce** (`styles.$id.tsx`): `kind` aus dem Stil laden, an `StyleEditor` geben.

### Migration/Kompatibilität
- Bestehende Stile ohne `kind` → Default `foto` (DB-Default deckt das ab).
- `fields.ts`/`taxonomy.ts`/`photoStyle.ts` werden zu `kinds/foto.*` umgezogen; Importpfade
  anpassen (PaletteEditor/colorlist, InfoHint-Help bleiben generisch im StyleEditor).

### Key files
- `prisma/schema.prisma` (+`kind`), `src/lib/kinds/{index,foto,illustration,infografik}.ts` (neu),
  `src/lib/types.ts`, `src/server/styles.ts`, `src/components/StyleEditor.tsx`,
  `src/components/PresetPicker.tsx`, `src/routes/{index,styles.index,styles.$id}.tsx`.

### Verifikation
- Pro Bildart: Default-Stil + Presets laden, Formular zeigt die richtigen Gruppen, JSON↔Formular
  synchron, speichern → Bibliothek zeigt Kind-Badge + Filter. Je 1 Test-Generierung pro Kind
  (Illustration + Infografik) visuell prüfen (Infografik: Text/Labels lesbar?). Foto-Stile von
  vorher funktionieren unverändert (Regression).

---

## Offene, NICHT in diesem Plan enthaltene Themen (für später)
- Team-Deployment (Coolify): Produktions-Build mit nativem `better-sqlite3`/Nitro, Postgres,
  Objekt-Storage, Auth.
- Imagen 4 als zweiter Provider (echte Seeds → 100 % Determinismus); Abstraktion steht bereits.
- Palette-Extras (Drag-Sort, „Farben aus Anker-Bild extrahieren").
