import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState, SerializedLexicalNode } from '@payloadcms/richtext-lexical/lexical'

const escapeHTML = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const isSerializedEditorState = (
  value: unknown,
): value is SerializedEditorState<SerializedLexicalNode> =>
  typeof value === 'object' &&
  value !== null &&
  'root' in value &&
  typeof (value as { root?: unknown }).root === 'object'

const psalmSuperscriptions = ['A Psalm of David. ', 'A Psalm of David']

const addClassToTag = (tag: string, className: string) => {
  const classAttribute = tag.match(/\sclass=(["'])(.*?)\1/)

  if (classAttribute) {
    const classes = classAttribute[2].split(/\s+/)

    if (classes.includes(className)) {
      return tag
    }

    return tag.replace(
      classAttribute[0],
      ` class=${classAttribute[1]}${classes.join(' ')} ${className}${classAttribute[1]}`,
    )
  }

  return tag.replace(/>$/, ` class="${className}">`)
}

const addParagraphClass = (paragraph: string, className: string) =>
  paragraph.replace(/^<p\b[^>]*>/i, (tag) => addClassToTag(tag, className))

const addSuperscriptClass = (superscript: string) =>
  superscript.replace(/^<sup\b[^>]*>/i, (tag) => addClassToTag(tag, 'scripture-verse-number'))

const promotePsalmSuperscription = (html: string) =>
  html.replace(/^<p>([^<]+)<\/p>/, (paragraph, text: string) => {
    const trimmedText = text.trim()

    for (const superscription of psalmSuperscriptions) {
      if (trimmedText === superscription.trim()) {
        return `<p class="scripture-superscription">${trimmedText}</p>`
      }

      if (trimmedText.startsWith(superscription)) {
        const passageText = trimmedText.slice(superscription.length).trimStart()

        if (/^[A-Z"']/.test(passageText)) {
          return `<p class="scripture-superscription">${superscription.trim()}</p><p>${passageText}</p>`
        }
      }
    }

    return paragraph
  })

const styleScriptureLines = (html: string) =>
  html.replace(
    /<p\b(?![^>]*\bscripture-superscription\b)[^>]*>(.*?)<\/p>/gis,
    (paragraph, content: string) => {
      const leadingSuperscript = content.match(
        /^(\s*)(<sup\b[^>]*>\s*(\d{1,3})\s*<\/sup>)(\s*)/i,
      )

      if (leadingSuperscript) {
        const styledSuperscript = addSuperscriptClass(leadingSuperscript[2])
        const styledContent = content.replace(
          leadingSuperscript[0],
          `${leadingSuperscript[1]}${styledSuperscript} `,
        )

        return addParagraphClass(
          paragraph.replace(content, styledContent),
          'scripture-verse-start',
        )
      }

      const leadingNumber = content.match(/^(\s*)(\d{1,3})(?:[\s.)]+|(?=[A-Z"']))(.*)$/s)

      if (leadingNumber) {
        const verseNumber = `<sup class="scripture-verse-number">${leadingNumber[2]}</sup>`
        const styledContent = `${leadingNumber[1]}${verseNumber} ${leadingNumber[3].trimStart()}`

        return addParagraphClass(
          paragraph.replace(content, styledContent),
          'scripture-verse-start',
        )
      }

      return addParagraphClass(paragraph, 'scripture-line')
    },
  )

export const richTextToHTML = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const text = value.trim()

    return text ? `<p>${escapeHTML(text).replaceAll('\n', '<br />')}</p>` : null
  }

  if (!isSerializedEditorState(value)) {
    return null
  }

  const html = convertLexicalToHTML({
    data: value,
    disableContainer: true,
    disableIndent: true,
    disableTextAlign: true,
  }).trim()
  const cleanedHTML = html
    .replaceAll('\u00a0', ' ')
    .replace(/<p(?:\s[^>]*)?>\s*(?:<br\s*\/?>|&nbsp;|\s)*<\/p>/gi, '')
    .trim()

  return styleScriptureLines(promotePsalmSuperscription(cleanedHTML)) || null
}
