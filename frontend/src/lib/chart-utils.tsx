export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const RADIAN = Math.PI / 180

export function PiePercentLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function formatVND(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

export function vndTooltip(value: unknown) {
  return `${Number(value).toLocaleString("vi-VN")} đ`
}

export const FEE_TYPE_LABELS: Record<string, string> = {
  management: "Phí quản lý",
  electricity: "Tiền điện",
  water: "Tiền nước",
  parking_car: "Phí ô tô",
  parking_motorbike: "Phí xe máy",
  charity: "Thiện nguyện",
  other: "Khác",
}
