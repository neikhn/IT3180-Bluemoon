import { useState, useEffect, type ReactNode } from "react"
import { api } from "../lib/axios"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  Building2,
  Users,
  Ticket,
  CheckCircle,
  XCircle,
  Car,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  AlertTriangle,
  PieChart as PieChartIcon,
  BarChart3,
  Wallet,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { ChartCard } from "../components/charts/ChartCard"
import { CHART_COLORS, formatVND, vndTooltip, PiePercentLabel } from "../lib/chart-utils"

export default function DashboardPage() {
  const [status, setStatus] = useState("Đang kiểm tra...")
  const [isOnline, setIsOnline] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingCharts, setLoadingCharts] = useState(true)
  const [data, setData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>(null)
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((res) => {
        setStatus("Trực tuyến")
        setIsOnline(true)
        setData(res.data)
      })
      .catch(() => {
        setStatus("Ngoại tuyến")
        setIsOnline(false)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setLoadingCharts(true)
    api.get(`/dashboard/charts?year=${year}`)
      .then((res) => setChartData(res.data))
      .catch(() => {})
      .finally(() => setLoadingCharts(false))
  }, [year])

  const counts = data?.counts ?? {}

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    colorClass,
    delay = 0,
  }: {
    title: string
    value: ReactNode
    icon: any
    trend?: "up" | "down" | null
    colorClass: string
    delay?: number
  }) => (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 blur-2xl ${colorClass}`} />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-emerald-500" : "text-red-500"}`}>
              {trend === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              <span>+12%</span>
            </div>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tổng quan hệ thống</h2>
          <p className="text-muted-foreground">Thống kê chung của chung cư BlueMoon.</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${isOnline ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
          {isOnline ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {status}
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Tổng căn hộ"
          value={loading ? <Skeleton className="h-8 w-16" /> : counts.apartments ?? 0}
          icon={Building2}
          colorClass="bg-primary/10 text-primary"
          delay={0}
        />
        <StatCard
          title="Cư dân"
          value={loading ? <Skeleton className="h-8 w-16" /> : counts.residents ?? 0}
          icon={Users}
          trend="up"
          colorClass="bg-chart-2/10 text-chart-2"
          delay={100}
        />
        <StatCard
          title="Ticket cần xử lý"
          value={loading ? <Skeleton className="h-8 w-16" /> : counts.activeTickets ?? 0}
          icon={Ticket}
          colorClass="bg-chart-3/10 text-chart-3"
          delay={200}
        />
        <StatCard
          title="Phương tiện"
          value={loading ? <Skeleton className="h-8 w-16" /> : counts.vehicles ?? 0}
          icon={Car}
          colorClass="bg-chart-4/10 text-chart-4"
          delay={300}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Revenue Trend */}
        <Card className="md:col-span-2 overflow-hidden border-0 shadow-lg">
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

        {/* Occupancy Rate Donut */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ căn hộ</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {loading ? (
              <Skeleton className="h-[180px] w-[180px] rounded-full" />
            ) : (
              <div className="relative">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Đang ở", value: counts.occupiedRate ?? 0 },
                        { name: "Trống", value: 100 - (counts.occupiedRate ?? 0) },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      labelLine={false}
                      label={PiePercentLabel}
                    >
                      <Cell fill="var(--primary)" />
                      <Cell fill="var(--muted)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{counts.occupiedRate ?? 0}%</span>
                  <span className="text-xs text-muted-foreground">lấp đầy</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Ticket Category Breakdown */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Phân bổ Ticket theo loại</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[160px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data?.ticketByCategory ?? []} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
                    formatter={(value: any) => [`${value}`, "Số ticket"]}
                  />
                  <Bar dataKey="value" fill="var(--chart-3)" radius={[0, 8, 8, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Tỷ lệ thu phí
            </CardTitle>
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
                    labelLine={false}
                    label={PiePercentLabel}
                  >
                    {(data?.collectionData ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
                    formatter={(value: any) => [`${Number(value).toLocaleString("vi-VN")} đ`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Legend */}
            {!loading && data?.collectionData && (
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {data.collectionData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className="text-xs font-semibold">{formatVND(item.value)} đ</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debt Aging */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Công nợ theo thời gian quá hạn
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[100px] w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={data?.debtAging ?? []}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatVND} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
                  formatter={(value: any) => [`${Number(value).toLocaleString("vi-VN")} đ`, "Công nợ"]}
                />
                <Bar dataKey="value" fill="var(--chart-5)" radius={[6, 6, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════ DETAILED CHARTS ═══════════════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Thống kê chi tiết</h3>
          <p className="text-sm text-muted-foreground">Dữ liệu theo năm và loại phí.</p>
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

      {/* Occupancy by Block + Revenue by Fee Type */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Tỷ lệ lấp đầy theo block" icon={Building2} loading={loadingCharts}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData?.occupancyByBlock ?? []}>
              <XAxis dataKey="block" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid var(--border)", fontSize: "12px" }}
              />
              <Legend />
              <Bar dataKey="occupied" stackId="a" fill="var(--chart-2)" name="Đang ở" radius={[0, 0, 0, 0]} />
              <Bar dataKey="available" stackId="a" fill="var(--chart-3)" name="Trống" radius={[0, 0, 0, 0]} />
              <Bar dataKey="maintenance" stackId="a" fill="var(--chart-5)" name="Bảo trì" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

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

      {/* Payment Method */}
      <div className="grid gap-4 md:grid-cols-2">
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

        {/* Summary KPI for selected year */}
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
    </div>
  )
}