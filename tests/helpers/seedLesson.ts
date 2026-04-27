import { getPayload } from 'payload'

import './loadEnv'
import config from '../../src/payload.config.js'

export const testLesson = {
  date: '2026-04-23',
  lectionaryYear: 'C',
  liturgicalSeason: 'easter',
  slug: '2026-04-23-admin-ux-test',
  status: 'published',
  title: 'Admin UX Test Lesson',
} as const

const deleteLessonBySlug = async (slug: string) => {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'lessons',
    where: {
      slug: {
        equals: slug,
      },
    },
  })
}

export async function seedTestLesson() {
  const payload = await getPayload({ config })

  await deleteLessonBySlug(testLesson.slug)

  return payload.create({
    collection: 'lessons',
    data: testLesson,
  })
}

export async function cleanupTestLesson(): Promise<void> {
  await deleteLessonBySlug(testLesson.slug)
}
