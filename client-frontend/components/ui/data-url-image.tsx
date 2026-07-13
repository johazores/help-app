/** Inline data URLs (QR codes, avatars) — next/image does not apply. */
export function DataUrlImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic data: URLs from QR/avatar upload
    <img src={src} alt={alt} className={className} />
  );
}
