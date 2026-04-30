import { useState, useEffect } from "react"
import { api } from "../../lib/axios"
import { toast } from "sonner"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Skeleton } from "../../components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { Badge } from "../../components/ui/badge"
import { Plus, Zap, Droplets, AlertTriangle } from "lucide-react"

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n)
}

export default function MeterReadingsPage() {
  const [readings, setReadings] = useState<any[]>([])
  const [apartments, setApartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ apartment_id: "", reading_type: "electricity", reading_value: "", period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() })

  const fetchData = () => {
    Promise.all([api.get("/meter-readings"), api.get("/apartments")])
      .then(([rRes, aptRes]) => { setReadings(rRes.data); setApartments(aptRes.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async () => {
    try {
      await api.post("/meter-readings", { ...form, reading_value: Number(form.reading_value), period_month: Number(form.period_month), period_year: Number(form.period_year) })
      toast.success("Đã ghi số điện/nước!")
      setDialogOpen(false)
      setForm({ apartment_id: "", reading_type: "electricity", reading_value: "", period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() })
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Lỗi ghi số.")
    }
  }

  const getAptName = (id: string) => {
    const apt = apartments.find((a) => a._id === id)
    return apt ? `${apt.block}-${apt.apartment_number}` : id
  }

  const grouped = readings.reduce((acc: Record<string, any[]>, r) => {
    const key = `${r.period_year}-${String(r.period_month).padStart(2, "0")}`
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const sortedPeriods = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Số điện nước</h2>
          <p className="text-muted-foreground">Nhập và quản lý chỉ số điện nước hàng tháng.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Ghi số mới</Button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : sortedPeriods.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu ghi số điện nước.</p>
          </CardContent>
        </Card>
      ) : (
        sortedPeriods.map((period) => (
          <div key={period} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Kỳ {period}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {grouped[period].map((r) => (
                <Card key={r._id} className={`border-0 shadow-sm ${r.alert_flag ? "border border-destructive/50" : ""}`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${r.reading_type === "electricity" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                        {r.reading_type === "electricity" ? <Zap className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{getAptName(r.apartment_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.reading_type === "electricity" ? "Điện" : "Nước"}: {r.reading_value} {r.reading_type === "electricity" ? "kWh" : "m³"}
                        </p>
                        {r.consumption !== null && (
                          <p className="text-xs text-muted-foreground">
                            Tiêu thụ: {r.consumption} {r.reading_type === "electricity" ? "kWh" : "m³"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.alert_flag === "high_consumption" && (
                        <Badge variant="destructive" className="text-[9px] gap-1">
                          <AlertTriangle className="h-3 w-3" /> Tăng &gt;50%
                        </Badge>
                      )}
                      {r.alert_flag === "decreased" && (
                        <Badge variant="secondary" className="text-[9px]">Giảm &gt;50%</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ghi số điện/nước</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs uppercase">Căn hộ</Label>
              <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.apartment_id} onChange={(e) => setForm({ ...form, apartment_id: e.target.value })}>
                <option value="">-- Chọn căn hộ --</option>
                {apartments.map((apt) => <option key={apt._id} value={apt._id}>{apt.block}-{apt.apartment_number}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase">Loại</Label>
              <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.reading_type} onChange={(e) => setForm({ ...form, reading_type: e.target.value })}>
                <option value="electricity">Điện (kWh)</option>
                <option value="water">Nước (m³)</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase">Số mới</Label>
                <Input type="number" value={form.reading_value} onChange={(e) => setForm({ ...form, reading_value: e.target.value })} placeholder="VD: 1234" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase">Tháng</Label>
                <Input type="number" min={1} max={12} value={form.period_month} onChange={(e) => setForm({ ...form, period_month: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase">Năm</Label>
                <Input type="number" value={form.period_year} onChange={(e) => setForm({ ...form, period_year: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleSubmit}>Lưu</Button>
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
