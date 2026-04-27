import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminField, publishedOrAdmin } from '../access'
import { SEASON_OPTIONS } from '../lib/liturgical-themes'

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
    components: {
      beforeList: ['/components/admin/LessonsListIntro#LessonsListIntro'],
      edit: {
        beforeDocumentControls: ['/components/admin/LessonsPublicLink#LessonsPublicLink'],
      },
    },
    description:
      'Build weekly lessons here. Scripture, musings, and quotes live in Content; artwork and links live in Media & Links. Only published lessons appear on the public site.',
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
      type: 'tabs',
      tabs: [
        {
          label: 'Overview',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              admin: {
                placeholder: 'Third Sunday of Easter',
              },
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              admin: {
                description: 'Auto-generated from date and title when left blank. Used in the public lesson URL.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'date',
                  type: 'date',
                  required: true,
                  label: 'Lesson Date',
                },
                {
                  name: 'liturgicalSeason',
                  type: 'select',
                  required: true,
                  label: 'Season',
                  options: SEASON_OPTIONS,
                },
                {
                  name: 'lectionaryYear',
                  type: 'select',
                  label: 'Year',
                  options: ['A', 'B', 'C'],
                },
                {
                  name: 'status',
                  type: 'select',
                  defaultValue: 'draft',
                  label: 'Publication Status',
                  options: ['draft', 'published'],
                  required: true,
                },
              ],
            },
          ],
        },
        {
          label: 'Content',
          fields: [
            {
              name: 'collect',
              label: 'Collect of the Day',
              type: 'textarea',
              admin: {
                description: 'Paste the collect or prayer appointed for the day as plain text.',
                placeholder:
                  'Almighty God, whom truly to know is everlasting life: Grant us so perfectly to know your Son Jesus Christ...',
              },
            },
            {
              name: 'scriptures',
              type: 'array',
              label: 'Scripture Passages',
              admin: {
                description:
                  'Add each appointed reading in order so the public lesson page follows the lectionary flow.',
              },
              fields: [
                {
                  name: 'reference',
                  type: 'text',
                  required: true,
                  admin: {
                    placeholder: 'John 21:1-19',
                  },
                },
                {
                  name: 'translation',
                  type: 'text',
                  defaultValue: 'NRSV-UE',
                  admin: {
                    placeholder: 'NRSV-UE',
                  },
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
              label: 'Study Questions',
              admin: {
                description: 'Add open-ended prompts that can carry conversation for a class or discussion group.',
              },
              fields: [
                {
                  name: 'question',
                  type: 'textarea',
                  required: true,
                  admin: {
                    placeholder: 'Where do you see grace, resistance, or surprise in this passage?',
                  },
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
              type: 'collapsible',
              label: 'Quotations & excerpts',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'quotes',
                  type: 'array',
                  label: 'Quotes',
                  admin: {
                    description:
                      'Optional quotations, excerpts, or prayers that add historical or pastoral texture to the lesson.',
                  },
                  fields: [
                    {
                      name: 'text',
                      type: 'textarea',
                      required: true,
                      admin: {
                        placeholder: 'Love bade me welcome; yet my soul drew back...',
                      },
                    },
                    {
                      name: 'author',
                      type: 'text',
                      admin: {
                        placeholder: 'George Herbert',
                      },
                    },
                    {
                      name: 'source',
                      type: 'text',
                      admin: {
                        placeholder: 'Love (III)',
                      },
                    },
                    {
                      name: 'year',
                      type: 'text',
                      admin: {
                        description: 'Optional publication or quotation year, such as 1962 or c. 415.',
                        placeholder: '1633',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Media & Links',
          fields: [
            {
              name: 'artworks',
              type: 'array',
              label: 'Artwork',
              admin: {
                description:
                  'Attach featured art for the lesson and add a short caption only when the image needs extra context.',
              },
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
                  admin: {
                    placeholder: 'Christ cooks breakfast on the shore.',
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Related videos',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'videoLinks',
                  type: 'array',
                  label: 'Related Videos',
                  admin: {
                    description: 'Add optional YouTube links for teaching, music, or sermon context.',
                  },
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      required: true,
                      admin: {
                        placeholder: 'Sermon clip',
                      },
                    },
                    {
                      name: 'youtubeUrl',
                      type: 'text',
                      required: true,
                      admin: {
                        placeholder: 'https://www.youtube.com/watch?v=...',
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Other links',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'links',
                  type: 'array',
                  label: 'Other Links',
                  admin: {
                    description: 'Use for articles, hymns, PDFs, or other supporting material worth opening separately.',
                  },
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      required: true,
                      admin: {
                        placeholder: 'Article on resurrection breakfasts',
                      },
                    },
                    {
                      name: 'url',
                      type: 'text',
                      required: true,
                      admin: {
                        placeholder: 'https://example.org/resource',
                      },
                    },
                    {
                      name: 'description',
                      type: 'text',
                      admin: {
                        placeholder: 'Short note for editors or readers.',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Internal Notes',
          fields: [
            {
              type: 'collapsible',
              label: 'Admin-only notes',
              admin: {
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'notes',
                  type: 'richText',
                  editor: lexicalEditor({}),
                  label: 'Additional Notes (Admin Only)',
                  access: {
                    read: isAdminField,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
