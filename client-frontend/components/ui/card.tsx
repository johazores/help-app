export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card p-6 sm:p-7 ${className}`}>{children}</div>;
}
