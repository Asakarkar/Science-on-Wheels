import type { ImgHTMLAttributes } from "react";

export interface BrandLogoProps extends ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  alt?: string;
}

export function BrandLogo({
  className = "",
  alt = "Science on Wheels logo",
  ...props
}: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={["brand-logo", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
