import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Skeleton } from "../ui/skeleton"
import type { LucideIcon } from "lucide-react"

interface ChartCardProps {
  title: string
  icon?: LucideIcon
  loading?: boolean
  skeletonHeight?: string
  className?: string
  children: ReactNode
}

export function ChartCard({
  title,
  icon: Icon,
  loading = false,
  skeletonHeight = "h-[200px]",
  className = "",
  children,
}: ChartCardProps) {
  return (
    <Card className={`overflow-hidden border-0 shadow-lg ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className={`${skeletonHeight} w-full rounded-xl`} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
