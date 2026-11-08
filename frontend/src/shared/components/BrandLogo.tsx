// Science on Wheels — Logo SVG (mobile lab / science icon)
export function BrandLogo({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Bus body */}
      <rect x="1" y="8" width="18" height="10" rx="2" stroke={color} strokeWidth="1.75" />
      {/* Bus front */}
      <path d="M19 12h3v4a1 1 0 01-1 1h-2V12z" stroke={color} strokeWidth="1.75" strokeLinejoin="round" />
      {/* Windshield */}
      <rect x="2.5" y="9.5" width="6" height="4" rx="1" stroke={color} strokeWidth="1.4" />
      {/* Atom symbol above bus */}
      <circle cx="14" cy="5" r="1" fill={color} />
      <ellipse cx="14" cy="5" rx="4" ry="1.5" stroke={color} strokeWidth="1.3" />
      <ellipse cx="14" cy="5" rx="4" ry="1.5" stroke={color} strokeWidth="1.3" transform="rotate(60 14 5)" />
      <ellipse cx="14" cy="5" rx="4" ry="1.5" stroke={color} strokeWidth="1.3" transform="rotate(-60 14 5)" />
      {/* Wheels */}
      <circle cx="6" cy="20" r="2" stroke={color} strokeWidth="1.75" />
      <circle cx="15" cy="20" r="2" stroke={color} strokeWidth="1.75" />
    </svg>
  );
}
