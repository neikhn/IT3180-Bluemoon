import { useState, useEffect } from "react"
import { api } from "../../lib/axios"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Skeleton } from "../../components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { TrendingUp, AlertTriangle, CheckCircle2, XCircle, BarChart3, PieChart as PieChartIcon, Wallet } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import { ChartCard } from "../../components/charts/ChartCard"
import { CHART_COLORS, formatVND, vndTooltip, PiePercentLabel } from "../../lib/chart-utils"

export default function AccountantDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [loadingCharts, setLoadingCharts] = useState(true)
  const [data, setData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>(null)
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setLoadingCharts(true)
    api.get(`/dashboard/charts?year=${year}`)
      .then((res) => setChartData(res.data))
      .catch(() => {})
      .finally(() => setLoadingCharts(false))
  }, [year])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tổng quan kế toán</h2>
          <p className="text-muted-foreground">Thống kê thu chi và công nợ của chung cư.</p>
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  formatter={(value: any) => [`${Number(value).toLocaleString("vi-VN")} đ`, ""]}
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
                    formatter={(value: any) => [`${Number(value).toLocaleString("vi-VN")} đ`, ""]}
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

      {/* ═══════════════════ DETAILED CHARTS ═══════════════════ */}
      {/* Revenue by Year */}
      <ChartCard title="Doanh thu theo năm" icon={BarChart3} loading={loadingCharts}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData?.revenueByYear ?? []}>
            <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatVND} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
              formatter={(value: any, name: any) => [vndTooltip(value), name === "billed" ? "Tổng chi" : "Đã thu"]}
            />
            <Legend formatter={(value) => value === "billed" ? "Tổng chi" : "Đã thu"} />
            <Bar dataKey="billed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={30} />
            <Bar dataKey="collected" fill="var(--chart-2)" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Revenue by Fee Type + Payment Method */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Doanh thu theo loại phí" icon={PieChartIcon} loading={loadingCharts}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData?.revenueByFeeType ?? []}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                labelLine={false}
                label={PiePercentLabel}
              >
                {(chartData?.revenueByFeeType ?? []).map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
                formatter={(value: any) => [vndTooltip(value), ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          {chartData?.revenueByFeeType && (
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {chartData.revenueByFeeType.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Phương thức thanh toán" icon={PieChartIcon} loading={loadingCharts}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData?.paymentMethod ?? []}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                labelLine={false}
                label={PiePercentLabel}
              >
                {(chartData?.paymentMethod ?? []).map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
                formatter={(value: any) => [`${value} lượt`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          {chartData?.paymentMethod && (
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {chartData.paymentMethod.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-semibold">{item.value} lượt</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Collection by Month */}
      <ChartCard title={`Tỷ lệ thu phí theo tháng (${year})`} icon={Wallet} loading={loadingCharts}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData?.collectionByMonth ?? []}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatVND} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
              formatter={(value: any, name: any) => {
                const labels: Record<string, string> = { paid: "Đã thu", pending: "Chưa thu", cancelled: "Đã hủy" }
                return [vndTooltip(value), labels[name as keyof typeof labels] || name]
              }}
            />
            <Legend formatter={(value: string) => {
              const labels: Record<string, string> = { paid: "Đã thu", pending: "Chưa thu", cancelled: "Đã hủy" }
              return labels[value as keyof typeof labels] || value
            }} />
            <Bar dataKey="paid" stackId="a" fill="var(--chart-2)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pending" stackId="a" fill="var(--chart-3)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="cancelled" stackId="a" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Year Summary */}
      <ChartCard title={`Tổng quan năm ${year}`} icon={TrendingUp} loading={loadingCharts}>
        <div className="space-y-4">
          {(chartData?.revenueByYear ?? []).filter((r: any) => r.year === String(year)).map((r: any) => (
            <div key={r.year} className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Tổng hóa đơn</span>
                <span className="text-lg font-bold">{formatVND(r.billed)} đ</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Đã thu</span>
                <span className="text-lg font-bold text-emerald-600">{formatVND(r.collected)} đ</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Chưa thu</span>
                <span className="text-lg font-bold text-red-500">{formatVND(r.billed - r.collected)} đ</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3">
                <span className="text-sm font-medium">Tỷ lệ thu</span>
                <span className="text-lg font-bold text-primary">
                  {r.billed > 0 ? ((r.collected / r.billed) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          ))}
          {(!chartData?.revenueByYear || chartData.revenueByYear.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu năm {year}</p>
          )}
        </div>
      </ChartCard>
    </div>
  )
}
