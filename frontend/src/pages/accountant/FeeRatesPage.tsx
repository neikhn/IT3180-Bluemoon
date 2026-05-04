import { useState, useEffect } from "react"
import { api } from "../../lib/axios"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
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
import { Plus, Pencil, ToggleLeft, ToggleRight, Trash2, AlertTriangle } from "lucide-react"

const FEE_LABELS: Record<string, string> = {
  management: "Phí quản lý",
  electricity: "Tiền điện",
  water: "Tiền nước",
  parking_car: "Phí ô tô",
  parking_motorbike: "Phí xe máy",
}

const UNIT_LABELS: Record<string, string> = {
  per_sqm: "/ m²",
  per_kwh: "/ kWh",
  per_cbm: "/ m³",
  fixed: "cố định",
}

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n)
}

export default function FeeRatesPage() {
  const [rates, setRates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editRate, setEditRate] = useState<any>(null)
  const [newRate, setNewRate] = useState(false)
  const [form, setForm] = useState({ fee_type: "", unit: "", rate_value: "", unit_price: "", description: "" })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchRates = () => {
    api.get("/fee-rates").then((res) => setRates(res.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchRates() }, [])

  const handleToggle = async (rate: any) => {
    try {
      await api.patch(`/fee-rates/${rate._id}`, { is_active: !rate.is_active })
      fetchRates()
      toast.success(`Đã ${rate.is_active ? "tắt" : "bật"} loại phí.`)
    } catch {
      toast.error("Lỗi cập nhật.")
    }
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    try {
      await api.delete(`/fee-rates/${confirmDeleteId}`)
      fetchRates()
      toast.success("Đã xóa định mức phí.")
      setConfirmDeleteId(null)
    } catch {
      toast.error("Lỗi khi xóa định mức phí.")
    }
  }

  const handleSave = async () => {
    try {
      const payload = { ...form, rate_value: Number(form.rate_value), unit_price: Number(form.unit_price) }
      if (editRate) {
        await api.patch(`/fee-rates/${editRate._id}`, payload)
      } else {
        await api.post("/fee-rates", { ...payload, effective_from: new Date().toISOString() })
      }
      toast.success("Lưu thành công!")
      setEditRate(null)
      setNewRate(false)
      setForm({ fee_type: "", unit: "", rate_value: "", unit_price: "", description: "" })
      fetchRates()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Lỗi lưu.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Định mức phí</h2>
          <p className="text-muted-foreground">Quản lý giá các loại phí dịch vụ.</p>
        </div>
        <Button onClick={() => { setNewRate(true); setEditRate(null); setForm({ fee_type: "", unit: "", rate_value: "", unit_price: "", description: "" }) }}>
          <Plus className="h-4 w-4 mr-1" /> Thêm định mức
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
        ) : (
          rates.map((rate) => (
            <Card key={rate._id} className={`border-0 shadow-md ${!rate.is_active ? "opacity-60" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {FEE_LABELS[rate.fee_type] || rate.fee_type}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{UNIT_LABELS[rate.unit] || rate.unit}</p>
                  </div>
                  <button onClick={() => handleToggle(rate)} className="text-muted-foreground hover:text-primary transition-colors">
                    {rate.is_active ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">{formatVND(rate.unit_price)}<span className="text-sm font-normal text-muted-foreground">{UNIT_LABELS[rate.unit] || ""}</span></p>
                  {rate.description && <p className="text-xs text-muted-foreground">{rate.description}</p>}
                  <p className="text-[10px] text-muted-foreground/70">Từ: {new Date(rate.effective_from).toLocaleDateString("vi-VN")}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => { setEditRate(rate); setForm({ fee_type: rate.fee_type, unit: rate.unit, rate_value: rate.rate_value, unit_price: rate.unit_price, description: rate.description || "" }) }}>
                    <Pencil className="h-3 w-3 mr-1" /> Sửa
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setConfirmDeleteId(rate._id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!editRate || newRate} onOpenChange={(o) => { if (!o) { setEditRate(null); setNewRate(false) } }}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editRate ? "Chỉnh sửa" : "Thêm định mức phí"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase">Loại phí</Label>
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.fee_type} onChange={(e) => setForm({ ...form, fee_type: e.target.value })}>
                  <option value="">-- Chọn --</option>
                  {Object.keys(FEE_LABELS).map((k) => <option key={k} value={k}>{FEE_LABELS[k]}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase">Đơn vị</Label>
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="">-- Chọn --</option>
                  {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase">Giá trị</Label>
                <Input type="number" value={form.rate_value} onChange={(e) => setForm({ ...form, rate_value: e.target.value })} placeholder="VD: 1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase">Đơn giá (VND)</Label>
                <Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} placeholder="VD: 15000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase">Mô tả</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="VD: Phí quản lý / m²" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleSave}>{editRate ? "Lưu thay đổi" : "Tạo mới"}</Button>
              <Button variant="outline" className="flex-1" onClick={() => { setEditRate(null); setNewRate(false) }}>Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Confirmation Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-6 sm:max-w-[360px] text-center border-none shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Xác nhận xóa?</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa định mức phí này không?
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 mt-2">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="rounded-xl">Hủy</Button>
              <Button variant="destructive" onClick={handleDelete} className="rounded-xl">Xóa ngay</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
