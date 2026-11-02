import Image from "next/image";

type UserAvatarProps = {
  name: string | null;
  image: string | null;
  size?: number;
};

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function UserAvatar({ name, image, size = 32 }: UserAvatarProps) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="inline-flex items-center justify-center rounded-full bg-foreground/10 text-xs font-medium"
    >
      {initials(name)}
    </span>
  );
}
