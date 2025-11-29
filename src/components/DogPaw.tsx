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
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      style={style}
    >
      {/* Main pad - triangular rounded */}
      <path d="M16 28c-4.5 0-8-2.5-8-6 0-2.5 2-5 4-6.5 1.5-1 2.5-1.5 4-1.5s2.5.5 4 1.5c2 1.5 4 4 4 6.5 0 3.5-3.5 6-8 6z" />
      
      {/* Four toe pads */}
      <ellipse cx="8" cy="10" rx="3.5" ry="4" />
      <ellipse cx="14.5" cy="6" rx="3" ry="3.5" />
      <ellipse cx="21.5" cy="6" rx="3" ry="3.5" />
      <ellipse cx="28" cy="10" rx="3.5" ry="4" />
    </svg>
  );
};

export default DogPaw;