// Kompiliert den fixierten Stil-Block (styleJson) + variables Motiv (subject)
// zu genau dem Prompt-Text, der an die Bild-API geht. Bei vorhandenen
// Referenzbildern wird eine Stil-Transfer-Anweisung vorangestellt.

import type { JsonObject } from '#/lib/json'

export interface CompileInput {
  /** fixierter Parameter-Block ohne subject */
  styleJson: JsonObject
  /** das variable Motiv */
  subject: string
  /** ob Referenzbilder mitgeschickt werden */
  hasReferences?: boolean
}

export interface CompileOutput {
  /** strukturiertes Prompt-Objekt (für Speicherung/Reproduzierbarkeit) */
  promptObject: JsonObject
  /** serialisierter Prompt-Text (geht als text-Part an die API) */
  promptText: string
}

const STYLE_REFERENCE_INSTRUCTION =
  'Use the photographic style, lighting, color grading, and overall look from the provided reference image(s). Keep the visual style perfectly consistent; only change the subject as described below.'

export function compilePrompt(input: CompileInput): CompileOutput {
  const { styleJson, subject, hasReferences = false } = input

  const promptObject: JsonObject = {
    ...(hasReferences ? { style_reference: STYLE_REFERENCE_INSTRUCTION } : {}),
    ...styleJson,
    subject,
  }

  return {
    promptObject,
    promptText: JSON.stringify(promptObject, null, 2),
  }
}
