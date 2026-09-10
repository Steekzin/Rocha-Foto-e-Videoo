import React from 'react';

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
  // Determine text color for R and CHA
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  // Blue accent color for aperture, divider line, and "FOTO & VIDEO"
  const blueColor = '#2b5bb0';

  // Sizing scale
  const heights = {
    sm: 'h-8',
    md: 'h-11',
    lg: 'h-14',
    xl: 'h-20',
  };

  return (
    <div className={`inline-flex items-center select-none ${heights[size]} ${className}`} title="Rocha Foto & Vídeo">
      <svg
        viewBox="0 0 420 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto max-w-full"
      >
        {/* Main ROCHA Lettering */}
        <g id="rocha-wordmark">
          {/* Letter R */}
          <text
            x="14"
            y="76"
            fontFamily="'Playfair Display', Georgia, 'Times New Roman', serif"
            fontSize="82"
            fontWeight="800"
            fill={textColor}
            letterSpacing="2"
          >
            R
          </text>

          {/* Stylized Camera Aperture "O" */}
          <g transform="translate(132, 46)">
            {/* Outer circle background */}
            <circle cx="0" cy="0" r="38" fill={blueColor} />
            
            {/* White aperture blade separator lines */}
            <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M 0 -38 C 12 -28, 22 -14, 20 0" />
              <path d="M 33 -19 C 30 -3, 22 14, 8 18" />
              <path d="M 33 19 C 18 26, 0 25, -12 16" />
              <path d="M 0 38 C -12 28, -22 14, -20 0" />
              <path d="M -33 19 C -30 3, -22 -14, -8 -18" />
              <path d="M -33 -19 C -18 -26, 0 -25, 12 -16" />
            </g>

            {/* Camera Eye / Inner Iris */}
            <circle cx="0" cy="0" r="14" fill="#1b3f7f" />
            <circle cx="-1" cy="0" r="11" fill={blueColor} />
            
            {/* Pupil & highlight reflection */}
            <circle cx="0" cy="0" r="6" fill="#ffffff" />
            <circle cx="0" cy="0" r="3.5" fill="#12264c" />
            <circle cx="-2" cy="-2" r="1.5" fill="#ffffff" />
          </g>

          {/* Letters CHA */}
          <text
            x="180"
            y="76"
            fontFamily="'Playfair Display', Georgia, 'Times New Roman', serif"
            fontSize="82"
            fontWeight="800"
            fill={textColor}
            letterSpacing="4"
          >
            CHA
          </text>
        </g>

        {/* Clean Blue Horizontal Separator Line */}
        <line
          x1="12"
          y1="90"
          x2="408"
          y2="90"
          stroke={blueColor}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Subtitle: F O T O & V I D E O */}
        <text
          x="210"
          y="110"
          textAnchor="middle"
          fontFamily="'Playfair Display', Georgia, serif"
          fontSize="18"
          fontWeight="600"
          letterSpacing="18"
          fill={blueColor}
        >
          FOTO & VIDEO
        </text>
      </svg>
    </div>
  );
};
