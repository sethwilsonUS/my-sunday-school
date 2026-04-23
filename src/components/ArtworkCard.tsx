'use client'

import { MouseEvent, useRef } from 'react'

type ArtworkCardProps = {
  alt: string
  artist?: string | null
  caption?: string | null
  medium?: string | null
  sourceLabel?: string
  sourceUrl?: string | null
  src?: string | null
  workDate?: string | null
}

export function ArtworkCard({
  alt,
  artist,
  caption,
  medium,
  sourceLabel = 'View on Wikimedia Commons',
  sourceUrl,
  src,
  workDate,
}: ArtworkCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const metadata = [artist, medium, workDate].filter(Boolean) as string[]
  const dialogTitle = (caption ?? alt) || 'Artwork'

  const closeLightbox = () => {
    dialogRef.current?.close()
  }

  const openLightbox = () => {
    if (!src) {
      return
    }

    dialogRef.current?.showModal()
  }

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      closeLightbox()
    }
  }

  return (
    <>
      <figure className="artwork-card">
        {src ? (
          <button
            aria-label={`Open full image for ${dialogTitle}`}
            className="artwork-card__trigger"
            onClick={openLightbox}
            type="button"
          >
            <span className="artwork-card__image-shell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={alt} className="artwork-card__image" src={src} />
              <span className="artwork-card__zoom-hint">Open full image</span>
            </span>
          </button>
        ) : null}
        <figcaption>
          {caption ? <span>{caption}</span> : null}
          {metadata.map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
          {sourceUrl ? (
            <a className="artwork-card__source" href={sourceUrl} rel="noopener noreferrer" target="_blank">
              {sourceLabel}
            </a>
          ) : null}
        </figcaption>
      </figure>

      {src ? (
        <dialog aria-label={`${dialogTitle} full image`} className="artwork-lightbox" onClick={handleDialogClick} ref={dialogRef}>
          <div className="artwork-lightbox__frame">
            <div className="artwork-lightbox__header">
              <p className="artwork-lightbox__title">{dialogTitle}</p>
              <button className="artwork-lightbox__close" onClick={closeLightbox} type="button">
                Close
              </button>
            </div>
            <div className="artwork-lightbox__image-shell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={alt} className="artwork-lightbox__image" src={src} />
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  )
}
