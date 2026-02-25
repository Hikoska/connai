// ConnaiLogo — reusable mark + wordmark component
// Use on: auth pages, footer, email templates, OG images

const ConnaiMark = ({
  size = 32,
  startColor = '#0D5C63',
  endColor = '#0ab8ca',
}: {
  size?: number
  startColor?: string
  endColor?: string
}) => {
  const id = 'connai-logo-grad'
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={startColor} />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      <line x1="7.2" y1="7.5" x2="12.2" y2="12.2" stroke={`url(#${id})`} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <line x1="20.8" y1="7.5" x2="15.8" y2="12.2" stroke={`url(#${id})`} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <line x1="14" y1="17" x2="14" y2="21.5" stroke={`url(#${id})`} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <circle cx="5.5" cy="6" r="2.2" fill={`url(#${id})`} opacity="0.8" />
      <circle cx="22.5" cy="6" r="2.2" fill={`url(#${id})`} opacity="0.8" />
      <circle cx="14" cy="23.5" r="2.2" fill={`url(#${id})`} opacity="0.8" />
      <circle cx="14" cy="14" r="3.2" fill={`url(#${id})`} />
      <circle cx="14" cy="14" r="1.4" fill="white" opacity="0.45" />
    </svg>
  )
}

export function ConnaiLogo({
  size = 32,
  onDark = false,
  showWordmark = true,
  className = '',
}: {
  size?: number
  onDark?: boolean
  showWordmark?: boolean
  className?: string
}) {
  const startColor = onDark ? '#14d0e0' : '#0D5C63'
  const endColor   = onDark ? '#0ef0ff' : '#0ab8ca'
  const fontSize   = Math.round(size * 0.72)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ConnaiMark size={size} startColor={startColor} endColor={endColor} />
      {showWordmark && (
        <span
          className="font-bold tracking-tight select-none"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: 1,
            ...(onDark
              ? { color: '#ffffff' }
              : {
                  background: 'linear-gradient(135deg, #0D5C63 0%, #0ab8ca 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }),
          }}
        >
          Connai
        </span>
      )}
    </div>
  )
}
