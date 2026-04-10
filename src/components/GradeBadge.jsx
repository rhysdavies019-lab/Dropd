// GradeBadge — coloured pill showing A+, A, B, C, D
// Colour system mirrors the brief:
//   A+ = lime green  |  A = white  |  B = grey  |  C = dark grey  |  D = darker grey

const GRADE_STYLES = {
  'A+': { bg: '#c8f135', text: '#0a0a0b', ring: 'rgba(200,241,53,0.4)' },
  'A':  { bg: '#ffffff', text: '#0a0a0b', ring: 'rgba(255,255,255,0.3)' },
  'B':  { bg: '#4b5563', text: '#e5e7eb', ring: 'rgba(75,85,99,0.4)'   },
  'C':  { bg: '#27272a', text: '#a1a1aa', ring: 'rgba(39,39,42,0.4)'   },
  'D':  { bg: '#18181b', text: '#71717a', ring: 'rgba(24,24,27,0.4)'   },
}

export default function GradeBadge({ grade, size = 'md' }) {
  const style = GRADE_STYLES[grade] ?? GRADE_STYLES['D']

  const sizeClasses = {
    sm:  'text-xs px-1.5 py-0.5 min-w-[28px]',
    md:  'text-sm px-2   py-1   min-w-[36px]',
    lg:  'text-base px-2.5 py-1.5 min-w-[44px]',
  }[size]

  return (
    <span
      className={`inline-flex items-center justify-center font-bold rounded-md text-center ${sizeClasses}`}
      style={{
        backgroundColor: style.bg,
        color:           style.text,
        boxShadow:       grade === 'A+' ? `0 0 12px ${style.ring}` : 'none',
      }}
    >
      {grade}
    </span>
  )
}
