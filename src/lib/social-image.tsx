import { BrandMark } from '@/components/BrandMark'

import { OPEN_GRAPH_SIZE, SITE_NAME, SITE_TAGLINE } from './share'

const colors = {
  background: '#f6f1e8',
  border: '#d7d0c4',
  foreground: '#161512',
  muted: '#6f6559',
  panel: '#fffdf8',
} as const

const pageStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  background: colors.background,
  color: colors.foreground,
  padding: '32px',
}

const brandRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '18px',
}

const wordmarkStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
}

const cardFrameStyle = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${colors.border}`,
  background: colors.panel,
  padding: '22px',
}

const footerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: colors.muted,
  fontSize: 26,
}

export const ogSize = OPEN_GRAPH_SIZE
export const ogContentType = 'image/png'

export function SiteSocialCard() {
  return (
    <div style={pageStyle}>
      <div style={brandRowStyle}>
        <div
          style={{
            width: 76,
            height: 76,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            color: colors.foreground,
          }}
        >
          <BrandMark size={42} strokeWidth={2.2} />
        </div>
        <div style={wordmarkStyle}>
          <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.05 }}>{SITE_NAME}</div>
          <div style={{ fontSize: 24, color: colors.muted, lineHeight: 1.1 }}>{SITE_TAGLINE}</div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '32px',
            borderTop: `1px solid ${colors.border}`,
            borderBottom: `1px solid ${colors.border}`,
            padding: '30px 12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: 26, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.muted }}>
              Sunday School
            </div>
            <div style={{ fontSize: 56, lineHeight: 1.02, fontWeight: 700 }}>
              Lectionary Notes
            </div>
          </div>
          <div
            style={{
              width: 220,
              height: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${colors.border}`,
              background: colors.panel,
              color: colors.foreground,
            }}
          >
            <BrandMark size={124} strokeWidth={1.9} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function LessonSocialCard({
  artworkSrc,
  footerLabel = SITE_NAME,
}: {
  artworkSrc: string
  footerLabel?: string
}) {
  return (
    <div style={pageStyle}>
      <div style={brandRowStyle}>
        <div
          style={{
            width: 52,
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            color: colors.foreground,
          }}
        >
          <BrandMark size={28} strokeWidth={2.1} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{SITE_NAME}</div>
          <div style={{ fontSize: 18, color: colors.muted }}>{SITE_TAGLINE}</div>
        </div>
      </div>

      <div style={{ ...cardFrameStyle, margin: '26px 0 18px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          height={OPEN_GRAPH_SIZE.height - 220}
          src={artworkSrc}
          style={{
            objectFit: 'contain',
            width: '100%',
            height: '100%',
          }}
          width={OPEN_GRAPH_SIZE.width - 108}
        />
      </div>

      <div style={footerStyle}>
        <div>{footerLabel}</div>
        <div style={{ fontSize: 22, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Study • Share • Teach
        </div>
      </div>
    </div>
  )
}

export function LessonFallbackSocialCard({ title }: { title: string }) {
  return (
    <div style={pageStyle}>
      <div style={brandRowStyle}>
        <div
          style={{
            width: 64,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            color: colors.foreground,
          }}
        >
          <BrandMark size={34} strokeWidth={2.1} />
        </div>
        <div style={wordmarkStyle}>
          <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.05 }}>{SITE_NAME}</div>
          <div style={{ fontSize: 22, color: colors.muted, lineHeight: 1.1 }}>Lesson preview</div>
        </div>
      </div>

      <div
        style={{
          ...cardFrameStyle,
          margin: '30px 0 0',
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '18px',
          }}
        >
          <div
            style={{
              fontSize: 28,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: colors.muted,
            }}
          >
            Sunday School lesson
          </div>
          <div style={{ fontSize: 64, lineHeight: 1.02, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 24, color: colors.muted }}>{SITE_TAGLINE}</div>
        </div>
      </div>
    </div>
  )
}
