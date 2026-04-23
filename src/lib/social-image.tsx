import { BrandMark } from '@/components/BrandMark'

import {
  getSiteHostLabel,
  OPEN_GRAPH_SIZE,
  SITE_NAME,
  SITE_SUBTITLE,
  SITE_TAGLINE,
} from './share'

const colors = {
  accent: '#8a6400',
  accentSoft: '#e7ddc6',
  background: '#f3ede2',
  border: '#d1c5b2',
  foreground: '#191611',
  line: '#bba98b',
  muted: '#6c6257',
  panel: '#fbf8f1',
  panelSoft: '#f6f0e5',
} as const

const pageStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, #f5efe5 0%, #eee3d0 100%)',
  color: colors.foreground,
  padding: '32px',
}

const frameStyle = {
  display: 'flex',
  flex: 1,
  width: '100%',
  height: '100%',
  flexDirection: 'column' as const,
  border: `1px solid ${colors.border}`,
  background: 'linear-gradient(180deg, #fcf9f2 0%, #f6edde 100%)',
  padding: '26px',
}

const brandRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: '18px',
  borderBottom: `1px solid ${colors.border}`,
}

const brandLockupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
}

const wordmarkStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
}

const markFrameStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${colors.border}`,
  background: 'linear-gradient(180deg, #f8f1e5 0%, #f1e5d0 100%)',
}

const eyebrowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: 20,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: colors.muted,
}

const eyebrowRuleStyle = {
  width: '72px',
  height: '1px',
  background: colors.line,
}

const footerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: '16px',
  borderTop: `1px solid ${colors.border}`,
  color: colors.muted,
  fontSize: 21,
}

const splitCardStyle = {
  display: 'flex',
  flex: 1,
  alignItems: 'stretch',
  gap: '26px',
  margin: '24px 0 18px',
}

const artPanelStyle = {
  display: 'flex',
  width: '392px',
  minWidth: '392px',
  flexDirection: 'column' as const,
}

const artFrameStyle = {
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${colors.border}`,
  background: 'linear-gradient(180deg, #f7efe2 0%, #efe2cb 100%)',
  padding: '12px',
}

const detailPanelStyle = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  gap: '18px',
  padding: '8px 4px 6px',
}

const badgeStyle = {
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'flex-start' as const,
  border: `1px solid ${colors.line}`,
  background: colors.accentSoft,
  color: colors.accent,
  padding: '8px 12px',
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
}

const domainStyle = {
  fontSize: 18,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: colors.muted,
}

const titleStyle = {
  fontSize: 54,
  lineHeight: 1.05,
  fontWeight: 700,
  color: colors.foreground,
}

const bodyCopyStyle = {
  fontSize: 22,
  lineHeight: 1.28,
  color: colors.muted,
}

export const ogSize = OPEN_GRAPH_SIZE
export const ogContentType = 'image/png'
const siteHostLabel = getSiteHostLabel()

export function SiteSocialCard() {
  return (
    <div style={pageStyle}>
      <div style={frameStyle}>
        <div style={brandRowStyle}>
          <div style={brandLockupStyle}>
            <div style={{ ...markFrameStyle, width: 64, height: 64, color: colors.foreground }}>
              <BrandMark size={34} strokeWidth={2.1} />
            </div>
            <div style={wordmarkStyle}>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.05 }}>{SITE_NAME}</div>
              <div style={{ fontSize: 17, color: colors.muted, lineHeight: 1.1 }}>{SITE_SUBTITLE}</div>
            </div>
          </div>
        </div>

        <div style={splitCardStyle}>
          <div
            style={{
              ...artPanelStyle,
              width: '290px',
              minWidth: '290px',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ ...markFrameStyle, flex: 1, color: colors.foreground }}>
              <BrandMark size={138} strokeWidth={1.8} />
            </div>
            <div style={{ ...badgeStyle, alignSelf: 'stretch', justifyContent: 'center', padding: '10px 14px' }}>
              {SITE_SUBTITLE}
            </div>
          </div>

          <div style={detailPanelStyle}>
            <div style={eyebrowStyle}>
              <div style={eyebrowRuleStyle} />
              <div>Study • Share • Teach</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ fontSize: 64, lineHeight: 1.03, fontWeight: 700 }}>{SITE_NAME}</div>
              <div style={{ fontSize: 28, lineHeight: 1.3, color: colors.muted }}>{SITE_TAGLINE}</div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 0 0',
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ ...badgeStyle, padding: '8px 12px' }}>Adult lectionary education</div>
              <div style={domainStyle}>{siteHostLabel}</div>
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <div>Scripture • Art • Questions • Musings</div>
          <div>{siteHostLabel}</div>
        </div>
      </div>
    </div>
  )
}

export function LessonSocialCard({
  artworkSrc,
  metadataLabel,
  title,
}: {
  artworkSrc: string
  metadataLabel: string
  title: string
}) {
  return (
    <div style={pageStyle}>
      <div style={frameStyle}>
        <div style={brandRowStyle}>
          <div style={brandLockupStyle}>
            <div style={{ ...markFrameStyle, width: 54, height: 54, color: colors.foreground }}>
              <BrandMark size={28} strokeWidth={2.05} />
            </div>
            <div style={wordmarkStyle}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{SITE_NAME}</div>
              <div style={{ fontSize: 16, color: colors.muted }}>{SITE_SUBTITLE}</div>
            </div>
          </div>
        </div>

        <div style={splitCardStyle}>
          <div style={artPanelStyle}>
            <div style={artFrameStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                height={470}
                src={artworkSrc}
                style={{
                  objectFit: 'contain',
                  width: '100%',
                  height: '100%',
                }}
                width={350}
              />
            </div>
          </div>

          <div style={detailPanelStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={badgeStyle}>{metadataLabel}</div>
              <div style={titleStyle}>{title}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={bodyCopyStyle}>
                Scripture, art, study questions, and musings for the week ahead.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                paddingTop: '18px',
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={eyebrowRuleStyle} />
              <div style={domainStyle}>{siteHostLabel}</div>
            </div>
          </div>
        </div>

        <div style={{ ...footerStyle, justifyContent: 'flex-start' }}>{SITE_NAME}</div>
      </div>
    </div>
  )
}

export function LessonFallbackSocialCard({
  metadataLabel = 'Lesson preview',
  title,
}: {
  metadataLabel?: string
  title: string
}) {
  return (
    <div style={pageStyle}>
      <div style={frameStyle}>
        <div style={brandRowStyle}>
          <div style={brandLockupStyle}>
            <div style={{ ...markFrameStyle, width: 58, height: 58, color: colors.foreground }}>
              <BrandMark size={30} strokeWidth={2.05} />
            </div>
            <div style={wordmarkStyle}>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.05 }}>{SITE_NAME}</div>
              <div style={{ fontSize: 16, color: colors.muted, lineHeight: 1.1 }}>{SITE_SUBTITLE}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            gap: '24px',
            margin: '24px 0 18px',
          }}
        >
          <div
            style={{
              ...markFrameStyle,
              width: '270px',
              minWidth: '270px',
              display: 'flex',
              flexDirection: 'column' as const,
              justifyContent: 'space-between',
              padding: '28px',
              background: colors.panelSoft,
            }}
          >
            <div
              style={{
                ...eyebrowStyle,
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <div>Editorial card</div>
              <div>{metadataLabel}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <BrandMark size={120} strokeWidth={1.85} />
            </div>
            <div style={{ ...domainStyle, color: colors.accent }}>{SITE_SUBTITLE}</div>
          </div>

          <div style={detailPanelStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={badgeStyle}>{metadataLabel}</div>
              <div style={titleStyle}>{title}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={bodyCopyStyle}>A lesson in scripture, art, study questions, and musings for the week ahead.</div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                paddingTop: '18px',
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={domainStyle}>{siteHostLabel}</div>
              <div style={{ ...badgeStyle, padding: '7px 12px' }}>{SITE_SUBTITLE}</div>
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <div>{SITE_NAME}</div>
          <div>{siteHostLabel}</div>
        </div>
      </div>
    </div>
  )
}
