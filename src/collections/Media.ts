import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

const generateMediaSizeFilename = ({
  extension,
  height,
  originalName,
  sizeName,
  width,
}: {
  extension: string
  height: number
  originalName: string
  sizeName: string
  width: number
}) => `${originalName}-${sizeName}-${width}x${height}.${extension}`

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    description:
      'Store artwork and supporting media here. Add the work title, write alt text for what the image shows, then add artist and source details so public credits stay clear.',
    useAsTitle: 'title',
    defaultColumns: ['filename', 'title', 'artist', 'medium'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      admin: {
        description: 'The artwork, photograph, or media title when known.',
        placeholder: 'Rebecca and Eliezer at the Well',
      },
    },
    {
      name: 'theme',
      type: 'text',
      admin: {
        description: 'Short lesson-facing theme or tagline shown with the artwork.',
        placeholder: 'Providence, hospitality, and consent',
      },
    },
    {
      name: 'altText',
      type: 'text',
      required: true,
      admin: {
        description:
          'Describe the visual information a reader needs if they cannot see the image. Avoid filenames or subject tags by themselves.',
        placeholder: 'Christ seated on the shore, offering bread to the disciples at dawn.',
      },
    },
    {
      name: 'artist',
      type: 'text',
      admin: {
        placeholder: 'Duccio di Buoninsegna',
      },
    },
    {
      name: 'artistDates',
      type: 'text',
      admin: {
        placeholder: 'c. 1255-1319',
      },
    },
    {
      name: 'medium',
      type: 'text',
      admin: {
        description: 'Optional material or technique, such as "oil on canvas".',
        placeholder: 'Tempera on panel',
      },
    },
    {
      name: 'workDate',
      type: 'text',
      admin: {
        placeholder: 'c. 1311',
      },
    },
    {
      name: 'wikimediaUrl',
      type: 'text',
      label: 'Wikimedia Commons URL',
      admin: {
        description:
          'Optional source URL for attribution, provenance, or a higher-resolution original.',
        placeholder: 'https://commons.wikimedia.org/wiki/File:...',
      },
    },
  ],
  upload: {
    adminThumbnail: 'thumbnail',
    imageSizes: [
      {
        name: 'thumbnail',
        generateImageName: generateMediaSizeFilename,
        width: 240,
        withoutEnlargement: true,
      },
      {
        name: 'card',
        generateImageName: generateMediaSizeFilename,
        width: 640,
        withoutEnlargement: true,
      },
      {
        name: 'large',
        generateImageName: generateMediaSizeFilename,
        width: 1280,
        withoutEnlargement: true,
      },
    ],
  },
}
