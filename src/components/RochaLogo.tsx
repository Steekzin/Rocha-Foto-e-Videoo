import React, { useState, useEffect } from 'react';

interface RochaLogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const RochaLogo: React.FC<RochaLogoProps> = ({
  theme = 'dark',
  size = 'md',
  className = '',
}) => {
  // Sizing scale
  const heights = {
    sm: 'h-8',
    md: 'h-11 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-20 sm:h-24',
  };

  // State for direct raster PNG image (100% exact file upload)
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    return (
      localStorage.getItem('rocha_custom_logo') ||
      '/rocha_logo_new.png'
    );
  });

  useEffect(() => {
    fetch('/api/logo')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.url) {
          setCustomLogoUrl(data.url);
          localStorage.setItem('rocha_custom_logo', data.url);
        }
      })
      .catch(() => {});
  }, []);

  if (customLogoUrl) {
    return (
      <div
        className={`inline-flex items-center select-none ${heights[size]} ${className}`}
        title="Rocha Foto & Vídeo"
      >
        <img
          src={customLogoUrl}
          alt="Rocha Foto & Vídeo"
          referrerPolicy="no-referrer"
          className="h-full w-auto max-w-full object-contain filter drop-shadow-sm"
          onError={() => setCustomLogoUrl(null)}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center select-none ${heights[size]} ${className}`}
      title="Rocha Foto & Vídeo"
    >
      <svg
        viewBox="0 0 540 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto max-w-full"
      >
          <defs>
            {/* 3D Chrome / Platinum Metallic Gradient */}
            <linearGradient id="chrome3D" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="20%" stopColor="#f8fafc" />
              <stop offset="42%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="54%" stopColor="#334155" />
              <stop offset="72%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Chrome Outer Rim Bevel Gradient */}
            <linearGradient id="chromeBevel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Sapphire Blue 3D Metallic Gradient for Aperture */}
            <radialGradient id="sapphire3D" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#2563eb" />
              <stop offset="65%" stopColor="#1d4ed8" />
              <stop offset="90%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Blade Highlight Gradient */}
            <linearGradient id="bladeShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            {/* Electric Blue Glowing Line Gradient */}
            <linearGradient id="electricBlueLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.1" />
              <stop offset="15%" stopColor="#2563eb" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#38bdf8" />
              <stop offset="85%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.1" />
            </linearGradient>

            {/* Electric Cyan Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-150%" width="140%" height="400%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle Drop Shadow for Chrome Letters */}
            <filter id="letterShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.7" />
            </filter>
          </defs>

          <g id="rocha-official-logo">
            {/* 1. CIRCULAR "R" EMBLEM ON THE LEFT */}
            <g id="emblem-r" filter="url(#letterShadow)">
              {/* Outer Metallic Ring */}
              <circle cx="76" cy="62" r="44" stroke="url(#chromeBevel)" strokeWidth="7.5" fill="none" />
              <circle cx="76" cy="62" r="47.5" stroke="#ffffff" strokeWidth="0.75" strokeOpacity="0.6" fill="none" />

              {/* Specular Lens Flare Glint on top-left of the ring */}
              <circle cx="48" cy="34" r="6" fill="#ffffff" opacity="0.85" />
              <circle cx="48" cy="34" r="2.5" fill="#ffffff" />
              <ellipse cx="48" cy="34" rx="14" ry="1.5" transform="rotate(-35 48 34)" fill="#ffffff" opacity="0.9" />

              {/* Stylized Modern Metallic "R" Inside Ring */}
              <path
                d="M 54 44 
                   H 78 
                   C 88 44, 94 50, 94 58 
                   C 94 65, 88 71, 79 72 
                   L 96 86 
                   H 85 
                   L 71 73 
                   H 62 
                   V 86 
                   H 54 
                   Z 
                   M 62 51 
                   V 66 
                   H 77 
                   C 83 66, 86 63, 86 58 
                   C 86 54, 83 51, 77 51 
                   Z"
                fill="url(#chrome3D)"
                stroke="#475569"
                strokeWidth="0.75"
              />
            </g>

            {/* 2. "O" - 3D METALLIC BLUE APERTURE SHUTTER LENS */}
            <g id="aperture-o" transform="translate(188, 62)">
              {/* Outer Sapphire Blue Base */}
              <circle cx="0" cy="0" r="41" fill="url(#sapphire3D)" stroke="#1e40af" strokeWidth="1.5" />

              {/* 6 Curved 3D Aperture Blades */}
              <g filter="url(#letterShadow)">
                <path d="M 0 -41 C 18 -41, 32 -28, 38 -14 C 26 -7, 14 0, 7 12 C 0 8, -5 2, -7 -8 C -4 -22, -2 -34, 0 -41 Z" fill="url(#bladeShine)" stroke="#0f172a" strokeWidth="0.75" />
                <path d="M 38 -14 C 42 4, 38 22, 28 34 C 18 24, 7 14, -6 13 C -6 6, -2 0, 6 -6 C 18 -12, 28 -14, 38 -14 Z" fill="url(#bladeShine)" stroke="#0f172a" strokeWidth="0.75" />
                <path d="M 28 34 C 14 42, -4 42, -20 36 C -14 22, -7 11, -13 0 C -7 -3, 0 -3, 8 2 C 18 10, 24 22, 28 34 Z" fill="url(#bladeShine)" stroke="#0f172a" strokeWidth="0.75" />
                <path d="M -20 36 C -34 28, -41 14, -41 0 C -28 -4, -15 -8, -7 -20 C 0 -15, 4 -8, 6 2 C 4 16, 2 28, -20 36 Z" fill="url(#bladeShine)" stroke="#0f172a" strokeWidth="0.75" />
                <path d="M -41 0 C -41 -18, -32 -32, -18 -38 C -11 -25, -4 -13, 8 -13 C 6 -5, 2 0, -6 6 C -18 12, -28 12, -41 0 Z" fill="url(#bladeShine)" stroke="#0f172a" strokeWidth="0.75" />
                <path d="M -18 -38 C -2 -42, 14 -40, 28 -30 C 18 -18, 10 -7, 13 6 C 7 3, 0 3, -8 -2 C -16 -10, -18 -24, -18 -38 Z" fill="url(#bladeShine)" stroke="#0f172a" strokeWidth="0.75" />
              </g>

              {/* Center Camera Eye / Iris Sphere */}
              <circle cx="0" cy="0" r="16" fill="#0b1736" stroke="#38bdf8" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="13" fill="url(#sapphire3D)" />
              <circle cx="0" cy="0" r="7" fill="#030712" />
              <circle cx="-3" cy="-3" r="3" fill="#ffffff" opacity="0.95" />
              <circle cx="2" cy="2" r="1" fill="#60a5fa" opacity="0.8" />
            </g>

            {/* 3. "C H A" - POLISHED 3D CHROME TYPOGRAPHY */}
            <g id="letters-cha" filter="url(#letterShadow)">
              <text
                x="248"
                y="88"
                fontFamily="'Cinzel', 'Playfair Display', Georgia, serif"
                fontSize="78"
                fontWeight="800"
                fill="url(#chrome3D)"
                stroke="#475569"
                strokeWidth="0.5"
              >
                C
              </text>
              <text
                x="328"
                y="88"
                fontFamily="'Cinzel', 'Playfair Display', Georgia, serif"
                fontSize="78"
                fontWeight="800"
                fill="url(#chrome3D)"
                stroke="#475569"
                strokeWidth="0.5"
              >
                H
              </text>
              <text
                x="414"
                y="88"
                fontFamily="'Cinzel', 'Playfair Display', Georgia, serif"
                fontSize="78"
                fontWeight="800"
                fill="url(#chrome3D)"
                stroke="#475569"
                strokeWidth="0.5"
              >
                A
              </text>
            </g>

            {/* 4. GLOWING ELECTRIC BLUE HORIZONTAL DIVIDER LINE */}
            <g id="electric-line">
              <line
                x1="26"
                y1="116"
                x2="506"
                y2="116"
                stroke="#2563eb"
                strokeWidth="5"
                strokeLinecap="round"
                filter="url(#neonGlow)"
                opacity="0.8"
              />
              <line
                x1="26"
                y1="116"
                x2="506"
                y2="116"
                stroke="url(#electricBlueLine)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Center Starburst Flare Glint on the line */}
              <g transform="translate(266, 116)">
                <circle cx="0" cy="0" r="10" fill="#38bdf8" opacity="0.6" filter="url(#neonGlow)" />
                <ellipse cx="0" cy="0" rx="34" ry="2" fill="#ffffff" />
                <ellipse cx="0" cy="0" rx="2" ry="10" fill="#ffffff" />
                <circle cx="0" cy="0" r="3" fill="#ffffff" />
              </g>
            </g>

            {/* 5. "F O T O   &   V I D E O" SUBTITLE */}
            <text
              x="266"
              y="146"
              textAnchor="middle"
              fontFamily="'Plus Jakarta Sans', 'Cinzel', Georgia, sans-serif"
              fontSize="17"
              fontWeight="700"
              letterSpacing="18"
              fill="url(#chrome3D)"
              filter="url(#letterShadow)"
            >
              FOTO &amp; VIDEO
            </text>
          </g>
        </svg>
      </div>
    );
};
