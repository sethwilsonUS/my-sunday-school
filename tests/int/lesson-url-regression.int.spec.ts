import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = join(import.meta.dirname, '..', '..')

const workflowFiles = [
  'scripts/create-lesson-draft.ts',
]

describe('lesson URL workflow canon', () => {
  it('uses lectionarylessons.org without the hallucinated dash or www prefix', () => {
    const workflowSource = workflowFiles
      .map((file) => readFileSync(join(projectRoot, file), 'utf8'))
      .join('\n')

    expect(workflowSource).not.toContain('lectionary-lessons.org')
    expect(workflowSource).not.toContain('www.lectionarylessons.org')
    expect(workflowSource).toContain('https://lectionarylessons.org/lessons/')
  })
})
