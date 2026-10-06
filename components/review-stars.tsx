import { Star } from "lucide-react"

interface ReviewStarsProps {
  rating: number
  max?: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
}

export function ReviewStars({
  rating,
  max = 5,
  size = "md",
  showValue = false,
}: ReviewStarsProps) {
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(rating)
        return (
          <Star
            key={i}
            className={`${sizeClasses[size]} ${
              filled
                ? "fill-primary text-primary"
                : "fill-muted text-muted-foreground/30"
            }`}
          />
        )
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      )}
    </div>
  )
}
