// @vitest-environment node

import { describe, expect, it } from 'vitest'

import type { Lesson, Media } from '@/payload-types'
import { getFirstLessonArtworkUrl } from '@/lib/share'
import {
  attachArtworkToTestLesson,
  cleanupTestLesson,
  seedTestLesson,
} from '../helpers/seedLesson'
import { cleanupTestMedia, seedTestMedia, testMedia } from '../helpers/seedMedia'
import { getPayload } from 'payload'
import config from '@/payload.config'

describe('lesson artwork relationships', () => {
  it('saves artwork on a lesson and resolves the first artwork for OpenGraph', async () => {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })
    let media: Media | null = null
    let lesson: Lesson | null = null

    try {
      media = await seedTestMedia()
      lesson = await seedTestLesson()

      await attachArtworkToTestLesson({
        lessonID: lesson.id,
        mediaID: media.id,
      })

      const savedLesson = await payload.findByID({
        collection: 'lessons',
        depth: 2,
        id: lesson.id,
      })
      const firstArtwork = savedLesson.artworks?.[0]
      const firstArtworkImage = firstArtwork?.image

      expect(firstArtworkImage).toBeTruthy()
      expect(typeof firstArtworkImage).toBe('object')
      expect((firstArtworkImage as Media).filename).toBe(testMedia.filename)
      expect(getFirstLessonArtworkUrl(savedLesson)).toBeTruthy()
    } finally {
      await cleanupTestLesson()
      await cleanupTestMedia()
      await payload.destroy()
    }
  }, 20000)
})
