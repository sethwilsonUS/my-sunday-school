'use client'

import { CSSProperties, MouseEvent, useRef, useState } from 'react'
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
  const [isLightboxImageVisible, setIsLightboxImageVisible] = useState(false)

  const metadata = [artist, medium, workDate].filter(Boolean) as string[]
  const imageLabel = alt || 'Artwork'
  const dialogLabel = `Larger image: ${imageLabel}`
  const imageShellStyle =
    imageWidth && imageHeight
      ? ({ '--artwork-aspect-ratio': `${imageWidth} / ${imageHeight}` } as CSSProperties)
      : undefined

  const closeLightbox = () => {
    dialogRef.current?.close()
    setIsLightboxImageVisible(false)
  }

  const openLightbox = () => {
    if (!src) {
      return
    }

    setIsLightboxImageVisible(true)
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
          onClose={() => setIsLightboxImageVisible(false)}
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
