// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ArtworkCard } from '../../src/components/ArtworkCard'

describe('ArtworkCard', () => {
  it('renders the artwork title separately from the lesson theme', () => {
    render(
      <ArtworkCard
        alt="Rebekah and Abraham’s servant meet beside a crowded well."
        artist="Domenico Gargiulo"
        medium="Oil painting"
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
  })
})
