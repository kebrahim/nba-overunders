import { teamLogoUrl } from "@/lib/domain/team-images";

export function TeamLogo({
  code,
  name,
  size = 24,
  className,
}: {
  code: string;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={teamLogoUrl(code)}
      alt={`${name} logo`}
      width={size}
      height={size}
      loading="lazy"
      className={className ?? "shrink-0"}
    />
  );
}
