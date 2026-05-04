import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Users, Building2, Ticket, CheckCircle, XCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { api } from "../lib/axios"

export default function DashboardPage() {
  const [status, setStatus] = useState("Đang kiểm tra...")
  const [isOnline, setIsOnline] = useState(true)
  const [stats, setStats] = useState({
    apartments: 0,
    residents: 0,
    activeTickets: 0,
  })

  useEffect(() => {
    Promise.all([
      api.get("/apartments"),
      api.get("/residents"),
      api.get("/tickets"),
    ])
      .then(([resApt, resRes, resTick]) => {
        setStatus("Trực tuyến")
        setIsOnline(true)
        setStats({
          apartments: resApt.data.length,
          residents: resRes.data.length,
          // Count open + processing tickets
          activeTickets: resTick.data.filter(
            (t: any) => t.status === "open" || t.status === "processing"
          ).length,
        })
      })
      .catch(() => {
        setStatus("Ngoại tuyến")
        setIsOnline(false)
      })
  }, [])

  return (
    <div className="animate-in space-y-6 duration-500 fade-in slide-in-from-bottom-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tổng quan hệ thống</h2>
        <p className="text-muted-foreground">
          Thống kê chung của chung cư BlueMoon.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng số căn hộ
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apartments}</div>
            <p className="mt-1 text-xs text-muted-foreground">Căn hộ đã đăng ký</p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cư dân đang ở
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.residents}</div>
            <p className="mt-1 text-xs text-muted-foreground">Nhân khẩu đã đăng ký</p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket cần xử lý</CardTitle>
            <Ticket className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.activeTickets}</div>
            <p className="mt-1 text-xs text-muted-foreground">Mới + đang xử lý</p>
          </CardContent>
        </Card>

        <Card
          className={`transition-shadow hover:shadow-md border-${isOnline ? "green" : "red"}-500/20`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trạng thái hệ thống</CardTitle>
            {isOnline ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${isOnline ? "text-green-500" : "text-red-500"}`}
            >
              {status}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Kết nối Backend API</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
