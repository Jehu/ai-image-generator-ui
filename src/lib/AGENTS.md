# AGENTS.md — src/lib/

## Purpose

Gemeinsam genutzte Bibliothek: Typen, Utilities, Prompt-Kompilierung und sonstige frameworkunabhängige Logik. Nur `src/lib/storage/` und `src/lib/providers/` dürfen serverseitige Abhängigkeiten haben.

## Ownership

Alle Dateien in `src/lib/` außer den drei Subdomains mit eigenem AGENTS.md.

## Local Contracts

- `types.ts` definiert die serialisierbaren DTO-Typen (`StyleDTO`, `GenerationDTO`, `StyleVersionDTO`). Diese sind die einzige erlaubte Form für Server-Function-Rückgaben.
- `json.ts` definiert `JsonValue` und `JsonObject` — die kanonischen Typen für beliebige JSON-Daten im System.
- `styleObject.ts` enthält die Lese/Schreib-Helfer für das Style-JSON-Objekt (`getGroupField`, `setGroupField`, `getTop`, `setTop`, `parseList`, `formatList`).
- `taxonomy.ts` enthält statische Preset-Listen (z. B. `CAMERA_BODIES`).
- `presets.ts` enthält vordefinierte Stil-Vorlagen für den `PresetPicker`.
- `prompt/compile.ts` ist die einzige Stelle, die `styleJson + subject → promptText` kompiliert. Diese Funktion nie duplizieren.
- `export.ts` — **Browser-only** (nutzt `window`/`document`/`Blob`/`File`/`jszip`, keine Node-Module). Stellt `slugify`, `downloadImagesAsZip`, `downloadStyleAsJson`, `readStyleImport` für Bild-ZIP- und Stil-JSON-Im-/Export bereit. Nur aus React-Komponenten verwenden.

## Work Guidance

- Neue Stil-Felder: in `src/lib/schema/photoStyle.ts` zum Zod-Schema hinzufügen, dann in `src/lib/schema/fields.ts` als `FieldDef` erfassen — dann rendert `StyleEditor` sie automatisch.
- Änderungen an `compilePrompt` betreffen das Laufzeitverhalten jeder Generierung; bestehende Tests in `compile.test.ts` müssen grün bleiben.

## Verification

```bash
npm test   # deckt compile.test.ts, photoStyle.test.ts, styleObject.test.ts, export.test.ts ab
```

## Child DOX Index

- [`providers/AGENTS.md`](providers/AGENTS.md) — ImageProvider-Interface, Gemini-Implementierung
- [`schema/AGENTS.md`](schema/AGENTS.md) — Zod-Fotostil-Schema (Single Source of Truth)
- [`storage/AGENTS.md`](storage/AGENTS.md) — StorageAdapter-Interface, lokale Implementierung
