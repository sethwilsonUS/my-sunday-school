import type { Lesson } from '@/payload-types'

export type LiturgicalSeason = Lesson['liturgicalSeason']

export const LITURGICAL_THEMES = {
  advent: { accent: '#4B3070', accentDark: '#C9B7EA', label: 'Advent' },
  christmas: { accent: '#8A6400', accentDark: '#F0D57A', label: 'Christmas' },
  epiphany: { accent: '#1F6F50', accentDark: '#88D4AE', label: 'Epiphany' },
  lent: { accent: '#6B2D5E', accentDark: '#DBA2D0', label: 'Lent' },
  'holy-week': { accent: '#8B1A1A', accentDark: '#F28A8A', label: 'Holy Week' },
  easter: { accent: '#8A6400', accentDark: '#F0D57A', label: 'Easter' },
  pentecost: { accent: '#B23512', accentDark: '#FF9B78', label: 'Pentecost' },
  'ordinary-time': { accent: '#1F6F50', accentDark: '#88D4AE', label: 'Ordinary Time' },
} as const satisfies Record<LiturgicalSeason, { accent: string; accentDark: string; label: string }>

export const SEASON_OPTIONS = Object.entries(LITURGICAL_THEMES).map(([value, theme]) => ({
  label: theme.label,
  value: value as LiturgicalSeason,
}))

export const getLiturgicalTheme = (season: LiturgicalSeason) => LITURGICAL_THEMES[season]
