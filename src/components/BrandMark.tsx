type BrandMarkProps = {
  className?: string
  size?: number
  strokeWidth?: number
}

export function BrandMark({ className, size = 32, strokeWidth = 2.4 }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 64 64"
      width={size}
    >
      <path d="M11 18.5c0-3.6 2.9-6.5 6.4-6.9 6.4-.5 11.6.8 15.6 3.9v30c-4-3.1-9.2-4.4-15.6-3.9-3.5.3-6.4-2.4-6.4-6V18.5Z" />
      <path d="M53 18.5c0-3.6-2.9-6.5-6.4-6.9-6.4-.5-11.6.8-15.6 3.9v30c4-3.1 9.2-4.4 15.6-3.9 3.5.3 6.4-2.4 6.4-6V18.5Z" />
      <path d="M32 16v29.5" />
      <path d="M15 23.5c6-.4 10.8.6 14.8 2.9" />
      <path d="M49 23.5c-6-.4-10.8.6-14.8 2.9" />
    </svg>
  )
}
