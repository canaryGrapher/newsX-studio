// Shared brand logo. Renders the same mark used as the site favicon
// (public icon at /icon.svg) so the sidebar and the browser tab match.

export default function Logo({
  size = 38,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icon.svg"
      alt="NewsX logo"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    />
  );
}
