interface DogPawProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DogPaw = ({ size = 14, className = '', style }: DogPawProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      {/* Main pad - heart-like shape */}
      <path d="M12 22c-3 0-6-3-6-6 0-2 1-3 2-4s2-2 4-2 3 1 4 2 2 2 2 4c0 3-3 6-6 6z" />
      
      {/* Toe beans */}
      <circle cx="7" cy="8" r="2.5" />
      <circle cx="11" cy="5" r="2.3" />
      <circle cx="16" cy="5" r="2.3" />
      <circle cx="19" cy="8" r="2.5" />
    </svg>
  );
};

export default DogPaw;