import { BrandMark } from '../BrandMark'
import { SITE_NAME, SITE_SUBTITLE } from '@/lib/share'

export function AdminIcon() {
  return (
    <span aria-hidden="true" className="admin-branding__nav-icon">
      <BrandMark size={24} strokeWidth={2.2} />
    </span>
  )
}

export function AdminLogo() {
  return (
    <div aria-label={SITE_NAME} className="admin-branding__logo" role="img">
      <span aria-hidden="true" className="admin-branding__logo-mark">
        <BrandMark size={34} strokeWidth={2.2} />
      </span>
      <span className="admin-branding__logo-copy">
        <span className="admin-branding__logo-title">{SITE_NAME}</span>
        <span className="admin-branding__logo-subtitle">{SITE_SUBTITLE}</span>
      </span>
    </div>
  )
}
