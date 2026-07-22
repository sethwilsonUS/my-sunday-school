// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { richTextToHTML } from '@/lib/richText'

const stateWithChildren = (children: Array<Record<string, unknown>>) => ({
  root: {
    children: [
      {
        children,
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const textNode = (text: string, format = 0) => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
})

describe('scripture rich-text rendering', () => {
  it('styles every semantic superscript verse number, not only the first one', () => {
    const html = richTextToHTML(
      stateWithChildren([
        textNode('19', 64),
        textNode(' First sentence. '),
        textNode('20', 64),
        textNode(' Second sentence.'),
      ]),
    )

    expect(html?.match(/class="scripture-verse-number"/g)).toHaveLength(2)
    expect(html).toContain('<sup class="scripture-verse-number">20</sup>')
  })

  it('repairs every nonbreaking-space-delimited legacy verse number', () => {
    const html = richTextToHTML(
      stateWithChildren([textNode('19\u00a0First sentence.\u00a020\u00a0Second sentence.')]),
    )

    expect(html?.match(/class="scripture-verse-number"/g)).toHaveLength(2)
    expect(html).not.toContain('\u00a0')
    expect(html).not.toContain('&nbsp;')
  })

  it('does not apply verse-start indentation to an inline verse marker', () => {
    const html = richTextToHTML(
      stateWithChildren([
        textNode('First sentence. '),
        textNode('20', 64),
        textNode(' Second sentence.'),
      ]),
    )

    expect(html).toContain('<sup class="scripture-verse-number">20</sup>')
    expect(html).toContain('class="scripture-line"')
    expect(html).not.toContain('scripture-verse-start')
  })
})
