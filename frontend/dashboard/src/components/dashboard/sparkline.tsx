"use client"

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function Sparkline({ data, color = "#2563EB", width = 120, height = 36 }: SparklineProps) {
  if (data.length < 2) return null
  const mn = Math.min(...data)
  const mx = Math.max(...data)
  const rng = mx - mn || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - mn) / rng) * (height - 4) - 2}`)
    .join(" ")

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
