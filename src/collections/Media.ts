import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'altText',
      type: 'text',
      required: true,
    },
    {
      name: 'artist',
      type: 'text',
    },
    {
      name: 'artistDates',
      type: 'text',
    },
    {
      name: 'medium',
      type: 'text',
      admin: {
        description: 'Optional material or technique, such as "oil on canvas".',
      },
    },
    {
      name: 'workDate',
      type: 'text',
    },
    {
      name: 'wikimediaUrl',
      type: 'text',
      label: 'Wikimedia Commons URL',
    },
  ],
  upload: true,
}
