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
  }).trim()

  return html || null
}
