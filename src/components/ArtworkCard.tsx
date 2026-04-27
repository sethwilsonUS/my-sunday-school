'use client'

import { CSSProperties, MouseEvent, useRef } from 'react'

type ArtworkCardProps = {
  alt: string
  artist?: string | null
  caption?: string | null
  imageHeight?: number | null
  imageWidth?: number | null
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
  imageHeight,
  imageWidth,
  medium,
  sourceLabel = 'View on Wikimedia Commons',
  sourceUrl,
  src,
  workDate,
}: ArtworkCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const metadata = [artist, medium, workDate].filter(Boolean) as string[]
  const imageLabel = alt || 'Artwork'
  const dialogLabel = `Larger image: ${imageLabel}`
  const imageShellStyle =
    imageWidth && imageHeight
      ? ({ '--artwork-aspect-ratio': `${imageWidth} / ${imageHeight}` } as CSSProperties)
      : undefined

  const closeLightbox = () => {
    dialogRef.current?.close()
  }

  const openLightbox = () => {
    if (!src) {
      return
    }

    dialogRef.current?.showModal()
    requestAnimationFrame(() => closeButtonRef.current?.focus())
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
            aria-label={`View larger image: ${imageLabel}`}
            className="artwork-card__trigger"
            onClick={openLightbox}
            type="button"
          >
            <span className="artwork-card__image-shell" style={imageShellStyle}>
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
        <dialog
          aria-label={dialogLabel}
          className="artwork-lightbox"
          onClick={handleDialogClick}
          ref={dialogRef}
        >
          <div className="artwork-lightbox__frame">
            <button
              className="artwork-lightbox__close"
              onClick={closeLightbox}
              ref={closeButtonRef}
              type="button"
            >
              Close
            </button>
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
