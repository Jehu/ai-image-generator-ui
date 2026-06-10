# AGENTS.md — src/server/

## Purpose

Alle serverseitigen Server Functions (TanStack Start `createServerFn`). Diese Dateien laufen ausschließlich im Nitro-Server-Kontext — API-Key, Prisma und Storage sind hier gekapselt.

## Ownership

Alle `.ts`-Dateien in diesem Verzeichnis.

## Local Contracts

- **Prisma und Storage zwingend dynamisch importieren**: `const { prisma } = await import('#/db')` und `const { getStorage } = await import('#/lib/storage')` — immer innerhalb des `.handler()`-Callbacks, nie auf Modul-Top-Level. Statische Imports crashen den Browser-Build.
- **Jede Server Function gibt serialisierbare Typen zurück** — DTOs aus `src/lib/types.ts` oder primitive Typen. Keine `Date`-Objekte, keine Prisma-Row-Typen mit `unknown`-Feldern direkt zurückgeben.
- **`asJson`-Helper** für Prisma-`InputJsonValue`-Casts: `const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue` — Pattern aus `styles.ts` / `generate.ts` wiederverwenden.
- **Validierung via `.validator()`**: Input immer validieren bevor er den Handler erreicht; Fehler als `new Error(...)` werfen.

## Dateien-Übersicht

| Datei | Funktion |
|---|---|
| `generate.ts` | `generateImage` — Kern-Generierungsfunktion; lädt Anker, kompiliert Prompt, ruft Provider auf; persistiert bei Produce (`styleId` gesetzt) die Output-Bilder via Storage (`Image kind='output'`, `Generation.outputImageId`). Playground (ohne `styleId`) bleibt ephemer |
| `styles.ts` | CRUD für `Style` + `StyleVersion`; `listGenerations` |
| `images.ts` | `addAnchorImage`, `removeAnchorImage`, `getImageDataUrl` |
| `cameras.ts` | `listCameraBodies`, `upsertCameraBody`, `deleteCameraBody` |
| `settings.ts` | App-weite Einstellungen (derzeit Kamera-Bodies) |

## Work Guidance

- Neue Server-seitige Features als neue `createServerFn`-Exporte in die thematisch passende Datei; bei größerem Scope neue Datei anlegen.
- `generate.ts` ist der kritischste Pfad (API-Kosten, Konsistenz): Anker-Logik und Provider-Aufruf dort nicht duplizieren.
