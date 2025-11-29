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
      {/* Main pad */}
      <ellipse cx="12" cy="16" rx="5" ry="4.5" />
      
      {/* Toe pads - 4 smaller ovals */}
      <ellipse cx="6" cy="9" rx="2.5" ry="3" />
      <ellipse cx="10" cy="6" rx="2.2" ry="2.8" />
      <ellipse cx="14" cy="6" rx="2.2" ry="2.8" />
      <ellipse cx="18" cy="9" rx="2.5" ry="3" />
    </svg>
  );
};

export default DogPaw;