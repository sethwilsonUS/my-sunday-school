import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminField, publishedOrAdmin } from '../access'

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  access: {
    read: publishedOrAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'liturgicalSeason', 'status'],
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.title) {
          const datePrefix = data.date ? String(data.date).slice(0, 10) : ''
          data.slug = slugify([datePrefix, data.title].filter(Boolean).join(' '))
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Auto-generated from date and title when left blank.',
      },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
    },
    {
      name: 'liturgicalSeason',
      type: 'select',
      required: true,
      options: [
        { label: 'Advent', value: 'advent' },
        { label: 'Christmas', value: 'christmas' },
        { label: 'Epiphany / Ordinary Time (Winter)', value: 'epiphany' },
        { label: 'Lent', value: 'lent' },
        { label: 'Holy Week', value: 'holy-week' },
        { label: 'Easter', value: 'easter' },
        { label: 'Pentecost', value: 'pentecost' },
        { label: 'Ordinary Time', value: 'ordinary-time' },
      ],
    },
    {
      name: 'lectionaryYear',
      type: 'select',
      options: ['A', 'B', 'C'],
    },
    {
      name: 'scriptures',
      type: 'array',
      fields: [
        {
          name: 'reference',
          type: 'text',
          required: true,
        },
        {
          name: 'translation',
          type: 'text',
          defaultValue: 'NRSV-UE',
        },
        {
          name: 'passageText',
          type: 'richText',
          label: 'Passage Text',
          editor: lexicalEditor({
            admin: {
              placeholder:
                'Paste from Logos Copy Bible Verses using Bible paragraphs, no footnotes, no citation.',
            },
          }),
          admin: {
            description:
              'Recommended Logos format: Bible paragraphs, no footnotes, no citation. Keep verse numbers out unless this lesson specifically needs them.',
          },
        },
      ],
    },
    {
      name: 'studyQuestions',
      type: 'array',
      fields: [
        {
          name: 'question',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      name: 'quotes',
      type: 'array',
      fields: [
        {
          name: 'text',
          type: 'textarea',
          required: true,
        },
        {
          name: 'author',
          type: 'text',
        },
        {
          name: 'source',
          type: 'text',
        },
      ],
    },
    {
      name: 'artworks',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
        },
      ],
    },
    {
      name: 'videoLinks',
      type: 'array',
      label: 'Related Videos',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'youtubeUrl',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'links',
      type: 'array',
      label: 'Other Links',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
        },
      ],
    },
    {
      name: 'notes',
      type: 'richText',
      editor: lexicalEditor({}),
      label: 'Additional Notes (Admin Only)',
      access: {
        read: isAdminField,
      },
    },
    {
      name: 'status',
      type: 'select',
      options: ['draft', 'published'],
      defaultValue: 'draft',
      required: true,
    },
  ],
}
