// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type { Field } from 'payload'

import { isAdmin } from '@/access'
import configPromise from '@/payload.config'

const findNamedField = (fields: Field[], name: string): Field | undefined => {
  for (const field of fields) {
    if ('name' in field && field.name === name) {
      return field
    }

    if ('fields' in field) {
      const nested = findNamedField(field.fields, name)

      if (nested) {
        return nested
      }
    }
  }
}

describe('Payload MCP configuration', () => {
  it('keeps MCP key management admin-only', async () => {
    const config = await configPromise
    const apiKeys = config.collections.find(
      (collection) => collection.slug === 'payload-mcp-api-keys',
    )

    expect(apiKeys?.access?.create).toBe(isAdmin)
    expect(apiKeys?.access?.delete).toBe(isAdmin)
    expect(apiKeys?.access?.read).toBe(isAdmin)
    expect(apiKeys?.access?.update).toBe(isAdmin)
  })

  it.each(['lessons', 'media'])('exposes only find for the %s collection', async (slug) => {
    const config = await configPromise
    const apiKeys = config.collections.find(
      (collection) => collection.slug === 'payload-mcp-api-keys',
    )
    const capability = apiKeys ? findNamedField(apiKeys.fields, slug) : undefined

    expect(capability).toBeDefined()
    expect('fields' in (capability ?? {})).toBe(true)

    if (!capability || !('fields' in capability)) {
      return
    }

    expect(
      capability.fields.map((field) => ('name' in field ? field.name : undefined)).filter(Boolean),
    ).toEqual(['find'])
  })
})
