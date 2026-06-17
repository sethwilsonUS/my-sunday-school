export const SCRIPTURE_TRACK_OPTIONS = [
  {
    label: 'None',
    value: 'none',
  },
  {
    label: 'Track 1',
    value: 'track-1',
  },
  {
    label: 'Track 2',
    value: 'track-2',
  },
] as const

export type ScriptureTrack = (typeof SCRIPTURE_TRACK_OPTIONS)[number]['value']

export const getScriptureTrackLabel = (track?: ScriptureTrack | null) => {
  switch (track) {
    case 'track-1':
      return 'Track 1'
    case 'track-2':
      return 'Track 2'
    default:
      return null
  }
}
