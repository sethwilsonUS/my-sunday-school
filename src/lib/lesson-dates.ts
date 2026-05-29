export const LESSON_TIME_ZONE = 'America/Chicago'

const dateKeyFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
  timeZone: LESSON_TIME_ZONE,
  year: 'numeric',
})

export function getCentralDateKey(value: Date = new Date()) {
  const parts = dateKeyFormatter.formatToParts(value)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Unable to resolve the Central Time date.')
  }

  return `${year}-${month}-${day}`
}

export function getNextDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`)
  }

  const [year, month, day] = dateKey.split('-').map(Number)

  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`)
  }

  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.toISOString().slice(0, 10) !== dateKey) {
    throw new Error(`Invalid date key: ${dateKey}`)
  }

  date.setUTCDate(date.getUTCDate() + 1)

  return date.toISOString().slice(0, 10)
}
