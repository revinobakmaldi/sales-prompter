export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatScore(score: number): string {
  return score.toFixed(3);
}

export function tierLabel(tier: string): string {
  const labels: Record<string, string> = {
    small: "Small",
    medium: "Medium",
    large: "Large",
  };
  return labels[tier] ?? tier;
}

export function tierColor(tier: string): string {
  const colors: Record<string, string> = {
    small: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    medium: "bg-secondary/10 text-secondary border-secondary/20",
    large: "bg-primary/10 text-primary border-primary/20",
  };
  return colors[tier] ?? "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
}
