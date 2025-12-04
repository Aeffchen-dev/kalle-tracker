import { useState } from 'react';

interface AnimatedDalmatianProps {
  className?: string;
  onClick?: () => void;
}

const AnimatedDalmatian = ({ className, onClick }: AnimatedDalmatianProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    onClick?.();
    setTimeout(() => setIsAnimating(false), 1500);
  };

  return (
    <svg
      viewBox="0 0 110 110"
      className={className}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <defs>
        <style>
          {`
            @keyframes tailWag {
              0%, 100% { transform: rotate(-25deg); }
              50% { transform: rotate(25deg); }
            }
            @keyframes tongueLick {
              0%, 100% { transform: scaleY(1) translateY(0); }
              25% { transform: scaleY(1.5) translateY(3px); }
              50% { transform: scaleY(0.7) translateY(-2px); }
              75% { transform: scaleY(1.4) translateY(2px); }
            }
          `}
        </style>
      </defs>

      {/* Tail with black tip */}
      <g 
        style={{ 
          transformOrigin: '15px 45px',
          animation: isAnimating ? 'tailWag 0.1s ease-in-out infinite' : 'none'
        }}
      >
        <path
          d="M15 45 C10 35, 8 25, 12 18"
          fill="none"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <ellipse cx="12" cy="15" rx="4" ry="6" fill="#1a1a1a" />
      </g>

      {/* Back legs */}
      <g>
        {/* Back left leg */}
        <rect x="20" y="70" width="12" height="28" rx="5" fill="white" />
        <path d="M26 72 L26 88" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="22" y1="95" x2="22" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="95" x2="26" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        <line x1="30" y1="95" x2="30" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        
        {/* Back right leg */}
        <rect x="36" y="70" width="12" height="28" rx="5" fill="white" />
        <path d="M42 72 L42 88" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="38" y1="95" x2="38" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        <line x1="42" y1="95" x2="42" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        <line x1="46" y1="95" x2="46" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Body - chunky oval shape */}
      <ellipse cx="50" cy="55" rx="38" ry="28" fill="white" />

      {/* Body spots - various sizes */}
      <ellipse cx="22" cy="50" rx="10" ry="13" fill="#1a1a1a" />
      <circle cx="45" cy="42" r="6" fill="#1a1a1a" />
      <circle cx="60" cy="62" r="7" fill="#1a1a1a" />
      <circle cx="35" cy="68" r="4" fill="#1a1a1a" />
      <circle cx="68" cy="45" r="4" fill="#1a1a1a" />
      <circle cx="52" cy="54" r="3.5" fill="#1a1a1a" />
      <circle cx="32" cy="55" r="3" fill="#1a1a1a" />
      <circle cx="75" cy="60" r="5" fill="#1a1a1a" />
      <circle cx="42" cy="75" r="3" fill="#1a1a1a" />

      {/* Front legs */}
      <g>
        {/* Front left leg */}
        <rect x="58" y="70" width="12" height="28" rx="5" fill="white" />
        <path d="M64 72 L64 88" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        <circle cx="66" cy="78" r="3.5" fill="#1a1a1a" />
        <line x1="60" y1="95" x2="60" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        <line x1="64" y1="95" x2="64" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        <line x1="68" y1="95" x2="68" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        
        {/* Front right leg */}
        <rect x="74" y="70" width="12" height="28" rx="5" fill="white" />
        <path d="M80 72 L80 88" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        <circle cx="78" cy="82" r="3" fill="#1a1a1a" />
        <line x1="76" y1="95" x2="76" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        <line x1="80" y1="95" x2="80" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
        <line x1="84" y1="95" x2="84" y2="100" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Neck area */}
      <ellipse cx="80" cy="42" rx="14" ry="20" fill="white" />

      {/* Head - rounder shape */}
      <ellipse cx="88" cy="25" rx="18" ry="16" fill="white" />
      
      {/* Floppy ear - big and black */}
      <ellipse cx="74" cy="14" rx="8" ry="14" fill="#1a1a1a" transform="rotate(-20 74 14)" />

      {/* Snout */}
      <ellipse cx="102" cy="30" rx="10" ry="8" fill="white" />

      {/* Nose - shiny black */}
      <ellipse cx="108" cy="27" rx="4.5" ry="3.5" fill="#1a1a1a" />

      {/* Smile */}
      <path
        d="M94 38 Q102 44, 108 38"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Tongue - pink and animated */}
      <g
        style={{
          transformOrigin: '101px 42px',
          animation: isAnimating ? 'tongueLick 0.2s ease-in-out infinite' : 'none'
        }}
      >
        <path
          d="M98 40 Q96 52, 101 56 Q106 52, 104 40"
          fill="#f5a0a0"
        />
        {/* Tongue line */}
        <path d="M101 42 L101 52" fill="none" stroke="#e88888" strokeWidth="1" />
      </g>

      {/* Star sunglasses - prominent */}
      <g>
        {/* Left star */}
        <polygon
          points="80,20 83,26 90,27 85,31 87,38 80,34 73,38 75,31 70,27 77,26"
          fill="#1a1a1a"
        />
        {/* Right star */}
        <polygon
          points="96,18 99,24 106,25 101,29 103,36 96,32 89,36 91,29 86,25 93,24"
          fill="#1a1a1a"
        />
      </g>
    </svg>
  );
};

export default AnimatedDalmatian;