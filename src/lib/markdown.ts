const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const renderInlineMarkdown = (value: string) => {
  const codeTokens: Array<{ token: string; html: string }> = []

  let html = escapeHtml(value).replace(/`([^`]+)`/g, (_, code: string) => {
    const token = `@@CODETOKEN${codeTokens.length}@@`
    codeTokens.push({
      token,
      html: `<code>${code}</code>`,
    })

    return token
  })

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
    const safeHref = href.trim()

    if (!/^(https?:\/\/|mailto:|\/)/i.test(safeHref)) {
      return label
    }

    return `<a href="${escapeHtml(safeHref)}">${label}</a>`
  })

  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')

  for (const { token, html: codeHtml } of codeTokens) {
    html = html.replaceAll(token, codeHtml)
  }

  return html
}

export const markdownToHTML = (value: string | null | undefined) => {
  if (!value?.trim()) {
    return null
  }

  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let paragraph: string[] = []
  let blockquote: string[] = []
  let listMode: 'ul' | 'ol' | null = null
  let listItems: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return

    html.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  const flushBlockquote = () => {
    if (!blockquote.length) return

    html.push(
      `<blockquote>${blockquote
        .map((line) => `<p>${renderInlineMarkdown(line)}</p>`)
        .join('')}</blockquote>`,
    )
    blockquote = []
  }

  const flushList = () => {
    if (!listMode || !listItems.length) return

    html.push(`<${listMode}>${listItems.join('')}</${listMode}>`)
    listMode = null
    listItems = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushBlockquote()
      flushList()
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)

    if (headingMatch) {
      flushParagraph()
      flushBlockquote()
      flushList()
      const level = headingMatch[1].length
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/)

    if (blockquoteMatch) {
      flushParagraph()
      flushList()
      blockquote.push(blockquoteMatch[1])
      continue
    }

    flushBlockquote()

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)

    if (unorderedMatch || orderedMatch) {
      flushParagraph()
      const nextListMode = unorderedMatch ? 'ul' : 'ol'

      if (listMode && listMode !== nextListMode) {
        flushList()
      }

      listMode = nextListMode
      listItems.push(
        `<li>${renderInlineMarkdown(unorderedMatch?.[1] ?? orderedMatch?.[1] ?? '')}</li>`,
      )
      continue
    }

    flushList()
    paragraph.push(trimmed)
  }

  flushParagraph()
  flushBlockquote()
  flushList()

  return html.join('')
}
