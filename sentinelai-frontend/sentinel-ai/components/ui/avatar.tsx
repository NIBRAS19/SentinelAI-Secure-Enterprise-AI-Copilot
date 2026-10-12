import { cn, initials } from "@/lib/utils";

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-11 w-11 text-sm",
};

export function Avatar({
  name,
  colorClass = "bg-signal",
  size = "md",
  className,
}: {
  name: string;
  colorClass?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-ink",
        sizeClasses[size],
        colorClass,
        className
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
