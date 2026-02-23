import { cn } from "@/lib/utils"

interface TrustScoreProps {
  score: number
  className?: string
}

const scoreColor = (s: number) =>
  s >= 80 ? "text-success" : s >= 60 ? "text-warning" : "text-destructive"

const barColor = (s: number) =>
  s >= 80 ? "bg-success" : s >= 60 ? "bg-warning" : "bg-destructive"

const scoreLabel = (s: number) =>
  s >= 80 ? "Good" : s >= 60 ? "Fair" : "Poor"

export function TrustScore({ score, className }: TrustScoreProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn("text-5xl font-bold font-mono tabular-nums leading-none", scoreColor(score))}>
        {score}
      </div>
      <div className="text-xs text-muted-foreground">
        Trust Score · <span className={scoreColor(score)}>{scoreLabel(score)}</span>
      </div>
      <div className="w-36 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
