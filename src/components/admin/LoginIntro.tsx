import { SITE_NAME } from '@/lib/share'

export function LoginIntro() {
  return (
    <section aria-labelledby="admin-login-title" className="admin-branding-card">
      <div className="admin-branding-card__content">
        <p className="admin-branding__eyebrow">Editor welcome</p>
        <h1 className="admin-branding__title" id="admin-login-title">
          A gentler place to build lessons
        </h1>
        <p className="admin-branding__body">
          {SITE_NAME} editors can draft lessons, curate artwork, and publish only when everything
          is ready.
        </p>
      </div>
    </section>
  )
}
