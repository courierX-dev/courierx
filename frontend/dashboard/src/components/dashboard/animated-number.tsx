"use client"

import { useEffect, useRef, useState } from "react"

interface AnimatedNumberProps {
  value: string
  className?: string
  duration?: number
}

/**
 * Animates between numeric values with a smooth count-up/down.
 * For non-numeric strings (or first render), it just displays the value.
 */
export function AnimatedNumber({ value, className, duration = 400 }: AnimatedNumberProps) {
  const [animated, setAnimated] = useState<string | null>(null)
  const prevRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = value

    // Extract numeric parts
    const prevNum = parseFloat(prev.replace(/[^0-9.\-]/g, ""))
    const nextNum = parseFloat(value.replace(/[^0-9.\-]/g, ""))

    // If either isn't a number, just snap — render falls through to `value`
    if (isNaN(prevNum) || isNaN(nextNum) || prev === value) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    // Determine formatting from target value
    const hasPercent = value.includes("%")
    const hasComma = value.includes(",")
    const decimals = value.includes(".") ? (value.split(".")[1]?.replace(/[^0-9]/g, "").length ?? 0) : 0

    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      const current = prevNum + (nextNum - prevNum) * eased

      let formatted: string
      if (decimals > 0) {
        formatted = current.toFixed(decimals)
      } else {
        formatted = Math.round(current).toString()
      }

      if (hasComma) {
        const parts = formatted.split(".")
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        formatted = parts.join(".")
      }

      if (hasPercent) {
        formatted += "%"
      }

      setAnimated(formatted)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setAnimated(null)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return <span className={className}>{animated ?? value}</span>
}
