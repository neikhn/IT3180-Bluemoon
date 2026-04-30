import { useState, useEffect } from "react"
import { api } from "../../lib/axios"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Skeleton } from "../../components/ui/skeleton"
import { TrendingUp, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-5)"]

function formatVND(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

export default function AccountantDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tổng quan kế toán</h2>
        <p className="text-muted-foreground">Thống kê thu chi và công nợ của chung cư.</p>
      </div>

      {/* Revenue Trend */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-primary" />
            Doanh thu theo tháng (VND)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[180px] w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data?.revenueTrend ?? []}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatVND} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
                  formatter={(value: unknown) => [`${Number(value).toLocaleString("vi-VN")} đ`, ""]}
                />
                <Line type="monotone" dataKey="billed" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} name="Tổng chi" />
                <Line type="monotone" dataKey="collected" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 4 }} name="Đã thu" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Collection Rate */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ thu phí</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[160px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={data?.collectionData ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                  >
                    {(data?.collectionData ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) => [`${Number(value).toLocaleString("vi-VN")} đ`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {!loading && data?.collectionData && (
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {data.collectionData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className="text-xs font-semibold">{formatVND(item.value)} đ</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debt Aging */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Công nợ theo thời gian quá hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[160px] w-full rounded-xl" />
            ) : (
              <div className="space-y-2">
                {(data?.debtAging ?? []).map((item: any, i: number) => {
                  const isOverdue = i >= 2
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {isOverdue ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-foreground"}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${isOverdue ? "text-destructive" : "text-foreground"}`}>
                        {Number(item.value).toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
