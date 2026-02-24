"use client";

interface ScoreBadgeProps {
  score: number; // 0.000 to 1.000
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const color =
    score >= 0.75
      ? "bg-primary/10 text-primary border-primary/20"
      : score >= 0.50
        ? "bg-secondary/10 text-secondary border-secondary/20"
        : score >= 0.30
          ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
          : "bg-red-500/10 text-red-400 border-red-500/20";

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
    lg: "px-3 py-1.5 text-base font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border font-mono ${color} ${sizeClasses[size]}`}
    >
      {score.toFixed(2)}
    </span>
  );
}
