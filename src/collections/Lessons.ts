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
      name: 'collect',
      label: 'Collect of the Day',
      type: 'textarea',
      admin: {
        description: 'Paste the collect or prayer appointed for the day as plain text.',
      },
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
                'Paste from Logos Copy Bible Verses using Bible paragraphs, verse numbers, no footnotes, no citation.',
            },
          }),
          admin: {
            description:
              'Recommended Logos format: Bible paragraphs with verse numbers, no footnotes, no citation. The public site styles verse numbers as superscripts and tightens wrapped poetic lines.',
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
      name: 'musings',
      type: 'textarea',
      admin: {
        description:
          'Public lesson notes in Markdown. Supports headings, lists, emphasis, blockquotes, and links.',
        placeholder:
          '## A thread worth pulling\n\nWrite a few reflections, questions, or teaching notes here in Markdown.',
      },
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
        {
          name: 'year',
          type: 'text',
          admin: {
            description: 'Optional publication or quotation year, such as 1962 or c. 415.',
          },
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
