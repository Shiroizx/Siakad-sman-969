import Image from "next/image";

const LOGO = "/logo.png";

export type SiteLogoProps = {
  /** Lebar & tinggi gambar (px), aspek persegi */
  size?: number;
  className?: string;
  priority?: boolean;
};

export function SiteLogo({
  size = 40,
  className = "",
  priority = false,
}: SiteLogoProps) {
  return (
    <Image
      src={LOGO}
      alt="SMAN 969 Jakarta"
      width={size}
      height={size}
      className={`object-contain ${className}`.trim()}
      priority={priority}
      sizes={`${size}px`}
    />
  );
}
