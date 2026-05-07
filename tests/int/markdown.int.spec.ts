import { describe, expect, it } from 'vitest'

import { markdownToHTML } from '../../src/lib/markdown'

describe('markdownToHTML', () => {
  it('renders headings from level one by default', () => {
    expect(markdownToHTML('# Opening\n\n## Follow up')).toBe('<h1>Opening</h1><h2>Follow up</h2>')
  })

  it('can nest author-supplied headings under surrounding page structure', () => {
    expect(
      markdownToHTML('# Opening\n\n## Follow up\n\n#### Deep cut', { headingBaseLevel: 4 }),
    ).toBe('<h4>Opening</h4><h5>Follow up</h5><h6>Deep cut</h6>')
  })
})
