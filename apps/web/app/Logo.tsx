import React from 'react';

export function AfterGapLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AfterGap Logo"
    >
      <defs>
        <linearGradient id="logoBgGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#141419" />
          <stop offset="100%" stopColor="#09090C" />
        </linearGradient>
        <linearGradient id="logoGoldPillar" x1="0" y1="48" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E5A91E" />
          <stop offset="100%" stopColor="#FCD34D" />
        </linearGradient>
        <linearGradient id="logoGreenPillar" x1="0" y1="48" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>

      {/* Squircle base */}
      <rect width="48" height="48" rx="12" fill="url(#logoBgGrad)" />
      <rect
        x="0.75"
        y="0.75"
        width="46.5"
        height="46.5"
        rx="11.25"
        stroke="#F5C542"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />

      {/* Dual Wrapper GAP Mark */}
      <path
        d="M12 36L20.5 13C20.8 12.2 21.6 12.2 22 13L23.2 16.5L16.8 36H12Z"
        fill="url(#logoGoldPillar)"
      />
      <path
        d="M25 12.5C25.3 11.7 26.2 11.7 26.6 12.5L34 31H29.5L23.8 17.5L25 12.5Z"
        fill="url(#logoGreenPillar)"
      />
      <rect x="15" y="25" width="16" height="3.5" rx="1.75" fill="#F5F5F4" />
      <circle cx="30" cy="26.75" r="1.75" fill="#F5C542" />
    </svg>
  );
}
