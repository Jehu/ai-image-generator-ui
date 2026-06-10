import { describe, expect, it } from 'vitest'
import { compilePrompt } from './compile'

describe('compilePrompt', () => {
  it('verbindet Stil-Block mit subject', () => {
    const { promptObject, promptText } = compilePrompt({
      styleJson: { camera: { lens_mm: 35 }, mood: 'calm' },
      subject: 'a red apple',
    })
    expect(promptObject.subject).toBe('a red apple')
    expect(promptObject.camera).toEqual({ lens_mm: 35 })
    expect(JSON.parse(promptText)).toEqual(promptObject)
  })

  it('fügt style_reference nur bei Referenzbildern hinzu', () => {
    const withRef = compilePrompt({
      styleJson: { mood: 'calm' },
      subject: 'x',
      hasReferences: true,
    })
    expect(withRef.promptObject.style_reference).toBeDefined()

    const withoutRef = compilePrompt({ styleJson: { mood: 'calm' }, subject: 'x' })
    expect(withoutRef.promptObject.style_reference).toBeUndefined()
  })
})
