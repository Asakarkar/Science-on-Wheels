interface BrandLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function BrandLogo({ size = 32, className = "", style }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="VIBHA — Science on Wheels"
      width={size}
      height={size}
      className={`vibha-logo ${className}`}
      style={{
        objectFit: "contain",
        display: "block",
        maxWidth: "100%",
        maxHeight: "100%",
        borderRadius: "4px",
        ...style,
      }}
    />
  );
}
