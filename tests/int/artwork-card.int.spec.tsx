// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ArtworkCard } from '../../src/components/ArtworkCard'

describe('ArtworkCard', () => {
  it('renders the artwork title separately from the lesson theme', () => {
    const { container } = render(
      <ArtworkCard
        alt="Rebekah and Abraham’s servant meet beside a crowded well."
        artist="Domenico Gargiulo"
        medium="Oil painting"
        sourceUrl="https://commons.wikimedia.org/wiki/File:Example.jpg"
        theme="Providence, hospitality, and consent"
        title="Rebecca and Eliezer at the Well"
        workDate="17th century"
      />,
    )

    expect(screen.getByText('Rebecca and Eliezer at the Well').tagName).toBe('CITE')
    expect(screen.getByText('Providence, hospitality, and consent').tagName).toBe('SPAN')
    expect(screen.getByText('Domenico Gargiulo')).toBeTruthy()
    expect(screen.getByText('Oil painting')).toBeTruthy()
    expect(screen.getByText('17th century')).toBeTruthy()

    const text = container.querySelector('figcaption')?.textContent ?? ''
    expect(text.indexOf('Rebecca and Eliezer at the Well')).toBeLessThan(
      text.indexOf('Domenico Gargiulo'),
    )
    expect(text.indexOf('Domenico Gargiulo')).toBeLessThan(text.indexOf('Oil painting'))
    expect(text.indexOf('Oil painting')).toBeLessThan(text.indexOf('17th century'))
    expect(text.indexOf('17th century')).toBeLessThan(
      text.indexOf('Providence, hospitality, and consent'),
    )
    expect(text.indexOf('Providence, hospitality, and consent')).toBeLessThan(
      text.indexOf('View on Wikimedia Commons'),
    )
  })

  it('falls back to the lesson caption when theme is blank', () => {
    render(
      <ArtworkCard
        alt="Rebekah and Abraham’s servant meet beside a crowded well."
        caption="A caption preserved on the lesson artwork row"
        theme="   "
        title="Rebecca and Eliezer at the Well"
      />,
    )

    expect(screen.getByText('A caption preserved on the lesson artwork row')).toBeTruthy()
  })
})
