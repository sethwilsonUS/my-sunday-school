export function LessonsListIntro() {
  return (
    <section aria-labelledby="lessons-workflow-title" className="admin-branding-card">
      <div className="admin-branding-card__content">
        <p className="admin-branding__eyebrow">Editorial workflow</p>
        <h2 className="admin-branding__title" id="lessons-workflow-title">
          Draft, review, then publish
        </h2>
        <ol className="admin-branding__steps">
          <li>Start with the Overview tab so title, date, season, and status are settled first.</li>
          <li>Add scripture, questions, musings, and supporting media in the remaining tabs.</li>
          <li>Only lessons marked published appear on the public site.</li>
        </ol>
      </div>
    </section>
  )
}
