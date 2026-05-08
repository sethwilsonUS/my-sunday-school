'use client'

import type { CSSProperties, MouseEvent } from 'react'
import { useId, useRef, useState } from 'react'
import Image from 'next/image'

type ArtworkCardProps = {
  alt: string
  artist?: string | null
  caption?: string | null
  imageHeight?: number | null
  imageWidth?: number | null
  lightboxImageHeight?: number | null
  lightboxImageWidth?: number | null
  medium?: string | null
  sourceLabel?: string
  sourceUrl?: string | null
  lightboxSrc?: string | null
  src?: string | null
  workDate?: string | null
}

export function ArtworkCard({
  alt,
  artist,
  caption,
  imageHeight,
  imageWidth,
  lightboxImageHeight,
  lightboxImageWidth,
  medium,
  sourceLabel = 'View on Wikimedia Commons',
  sourceUrl,
  lightboxSrc,
  src,
  workDate,
}: ArtworkCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogTitleId = useId()
  const dialogDescriptionId = useId()
  const [isLightboxImageVisible, setIsLightboxImageVisible] = useState(false)

  const metadata = [artist, medium, workDate].filter(Boolean) as string[]
  const imageLabel = alt || 'Artwork'
  const dialogLabel = `Larger image: ${imageLabel}`
  const imageShellStyle =
    imageWidth && imageHeight
      ? ({ '--artwork-aspect-ratio': `${imageWidth} / ${imageHeight}` } as CSSProperties)
      : undefined

  const closeLightbox = () => {
    if (dialogRef.current?.open) {
      dialogRef.current.close()
      return
    }

    setIsLightboxImageVisible(false)
  }

  const openLightbox = () => {
    if (!src || !dialogRef.current) {
      return
    }

    setIsLightboxImageVisible(true)
    dialogRef.current.showModal()
    requestAnimationFrame(() => closeButtonRef.current?.focus())
  }

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      closeLightbox()
    }
  }

  const handleDialogClose = () => {
    setIsLightboxImageVisible(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <>
      <figure className="artwork-card">
        {src ? (
          <button
            aria-label={`View larger image: ${imageLabel}`}
            className="artwork-card__trigger"
            onClick={openLightbox}
            ref={triggerRef}
            type="button"
          >
            <span className="artwork-card__image-shell" style={imageShellStyle}>
              <Image
                alt={alt}
                className="artwork-card__image"
                height={imageHeight ?? 1}
                sizes="(max-width: 720px) calc(100vw - 2rem), 32vw"
                src={src}
                width={imageWidth ?? 1}
              />
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
            <a
              className="artwork-card__source"
              href={sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {sourceLabel}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
        </figcaption>
      </figure>

      {src ? (
        <dialog
          aria-describedby={dialogDescriptionId}
          aria-labelledby={dialogTitleId}
          aria-modal="true"
          className="artwork-lightbox"
          onClick={handleDialogClick}
          onClose={handleDialogClose}
          ref={dialogRef}
        >
          <div className="artwork-lightbox__frame">
            <h2 className="sr-only" id={dialogTitleId}>
              {dialogLabel}
            </h2>
            <p className="sr-only" id={dialogDescriptionId}>
              Press Escape or use the close button to return to the lesson.
            </p>
            <button
              aria-label="Close image viewer"
              className="artwork-lightbox__close"
              onClick={closeLightbox}
              ref={closeButtonRef}
              type="button"
            >
              Close
            </button>
            <div className="artwork-lightbox__image-shell">
              {isLightboxImageVisible ? (
                <Image
                  alt={alt}
                  className="artwork-lightbox__image"
                  height={lightboxImageHeight ?? imageHeight ?? 1}
                  sizes="100vw"
                  src={lightboxSrc ?? src}
                  width={lightboxImageWidth ?? imageWidth ?? 1}
                />
              ) : null}
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  )
}
