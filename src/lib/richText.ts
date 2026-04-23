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

  return promotePsalmSuperscription(cleanedHTML) || null
}
