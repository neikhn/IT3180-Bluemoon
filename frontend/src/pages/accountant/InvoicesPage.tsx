import { useState, useEffect } from "react"
import { api } from "../../lib/axios"
import { toast } from "sonner"
import { Card } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Skeleton } from "../../components/ui/skeleton"
import { Label } from "../../components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { Badge } from "../../components/ui/badge"
import { Plus, Receipt, CheckCircle2, Clock, XCircle, FileText, Search, Home, Zap, Droplets, Eye, ChevronRight, Car, Bike } from "lucide-react"
import { Checkbox } from "../../components/ui/checkbox"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
  pending: { label: "Chưa thanh toán", variant: "destructive", icon: Clock },
  paid: { label: "Đã thanh toán", variant: "default", icon: CheckCircle2 },
  partial: { label: "Thanh toán 1 phần", variant: "secondary", icon: Clock },
  cancelled: { label: "Đã hủy", variant: "outline", icon: XCircle },
}

const FEE_ICON_MAP: Record<string, any> = {
  management: Home,
  electricity: Zap,
  water: Droplets,
  parking_car: Car,
  parking_motorbike: Bike,
}


function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n)
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [apartments, setApartments] = useState<any[]>([])
  const [feeRates, setFeeRates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  const [generateOpen, setGenerateOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAptIds, setSelectedAptIds] = useState<string[]>([])
  const [appliedFees, setAppliedFees] = useState<string[]>([])
  const [consumptionMap, setConsumptionMap] = useState<Record<string, { elec: string, water: string }>>({})
  const [billingPeriod, setBillingPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })

  const fetchData = () => {
    setLoading(true)
    Promise.all([api.get("/invoices"), api.get("/apartments"), api.get("/fee-rates")])
      .then(([invRes, aptRes, feeRes]) => {
        setInvoices(invRes.data.sort((a: any, b: any) => {
          if (a.billing_period_year !== b.billing_period_year) return b.billing_period_year - a.billing_period_year
          return b.billing_period_month - a.billing_period_month
        }))
        setApartments(aptRes.data)
        const activeRates = feeRes.data.filter((r: any) => r.is_active)
        setFeeRates(activeRates)
        setAppliedFees(activeRates.map((r: any) => r.fee_type))
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const filteredApartments = apartments.filter(a =>
    a.status === "occupied" &&
    (`${a.block}-${a.apartment_number}`.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleToggleApt = (id: string) => {
    setSelectedAptIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleToggleFee = (id: string) => {
    setAppliedFees(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedAptIds.length === filteredApartments.length) {
      setSelectedAptIds([])
    } else {
      setSelectedAptIds(filteredApartments.map(a => a._id))
    }
  }

  const handleNextStep = () => {
    if (selectedAptIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một căn hộ.")
      return
    }
    if (appliedFees.length === 0) {
      toast.error("Vui lòng chọn ít nhất một loại phí.")
      return
    }

    const needsConsumption = appliedFees.includes("electricity") || appliedFees.includes("water")
    if (!needsConsumption) {
      handleGenerateBulk()
      return
    }

    const newMap = { ...consumptionMap }
    selectedAptIds.forEach(id => {
      if (!newMap[id]) newMap[id] = { elec: "0", water: "0" }
    })
    setConsumptionMap(newMap)
    setStep(2)
  }

  const handleGenerateBulk = async () => {
    try {
      const items = selectedAptIds.map(id => ({
        apartment_id: id,
        electricity_consumption: Number(consumptionMap[id]?.elec || 0),
        water_consumption: Number(consumptionMap[id]?.water || 0)
      }))

      await api.post("/invoices/bulk-generate", {
        items,
        billing_period_month: billingPeriod.month,
        billing_period_year: billingPeriod.year,
        applied_fees: appliedFees
      })

      toast.success("Đã tạo hóa đơn!")
      setGenerateOpen(false)
      setStep(1)
      setSelectedAptIds([])
      fetchData()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Lỗi tạo hóa đơn.")
    }
  }

  const handleMarkPaid = async (inv: any) => {
    try {
      await api.patch(`/invoices/${inv._id}`, { status: "paid" })
      toast.success("Đã đánh dấu thanh toán!")
      fetchData()
    } catch {
      toast.error("Lỗi cập nhật.")
    }
  }

  const getAptName = (id: string) => {
    const apt = apartments.find((a) => a._id === id)
    return apt ? `${apt.block}-${apt.apartment_number}` : "—"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản lý Hóa đơn</h2>
          <p className="text-muted-foreground text-sm">Hệ thống phát hành hóa đơn tự động định kỳ.</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)} className="font-bold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Phát hành hóa đơn
        </Button>
      </div>

      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Mã HD</th>
                <th className="p-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Căn hộ</th>
                <th className="p-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Kỳ</th>
                <th className="p-4 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Tổng tiền</th>
                <th className="p-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Hạn chót</th>
                <th className="p-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Trạng thái</th>
                <th className="p-4 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((__, j) => (
                      <td key={j} className="p-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-muted-foreground text-sm italic">
                    Chưa có hóa đơn nào được phát hành.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending
                  return (
                    <tr key={inv._id} className="hover:bg-muted/20 transition-colors group">
                      <td className="p-4 font-mono text-xs font-bold text-primary">{inv.invoice_code}</td>
                      <td className="p-4">
                        <span className="font-bold text-sm">{getAptName(inv.apartment_id)}</span>
                      </td>
                      <td className="p-4 font-medium text-sm">{String(inv.billing_period_month).padStart(2, "0")}/{inv.billing_period_year}</td>
                      <td className="p-4 text-right font-bold text-sm text-primary">{formatVND(inv.amount_due)}</td>
                      <td className="p-4 text-muted-foreground text-xs">{new Date(inv.due_date).toLocaleDateString("vi-VN")}</td>
                      <td className="p-4">
                        <Badge variant={cfg.variant as any} className="text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => setSelected(inv)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        <DialogContent className="mx-auto w-[92vw] rounded-xl p-6 sm:max-w-md border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-primary" />
              Chi tiết hóa đơn {selected?.invoice_code}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3 border">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Căn hộ</p>
                  <p className="font-bold text-sm text-primary">{getAptName(selected.apartment_id)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 border">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Kỳ thanh toán</p>
                  <p className="font-bold text-sm">{String(selected.billing_period_month).padStart(2, "0")}/{selected.billing_period_year}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground px-1">Danh mục phí chi tiết</p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
                  {selected.line_items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm p-3 rounded-lg border bg-card/50">
                      <div>
                        <p className="font-bold">{item.description || item.fee_type}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × {formatVND(item.unit_price)}</p>
                      </div>
                      <span className="font-bold">{formatVND(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 p-5 space-y-2 border">
                {selected.previous_debt > 0 && (
                  <div className="flex justify-between text-xs text-destructive italic font-medium">
                    <span>Công nợ tồn đọng:</span>
                    <span>+{formatVND(selected.previous_debt)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Tổng cộng:</span>
                  <span className="text-primary text-2xl font-black">{formatVND(selected.amount_due)}</span>
                </div>
              </div>

              {selected.status !== "paid" && selected.status !== "cancelled" && (
                <Button className="w-full font-bold h-12 rounded-lg text-sm" onClick={() => { handleMarkPaid(selected); setSelected(null) }}>
                  XÁC NHẬN ĐÃ THU TIỀN
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Creation Dialog */}
      <Dialog open={generateOpen} onOpenChange={(o) => { if (!o) { setGenerateOpen(false); setStep(1); setSelectedAptIds([]) } }}>
        <DialogContent className="mx-auto w-[95vw] rounded-xl p-0 sm:max-w-2xl overflow-hidden border-none shadow-2xl">
          <div className="bg-muted/50 p-6 border-b">
            <div className="flex items-center justify-between mb-1">
              <DialogTitle className="text-lg font-bold tracking-tight">PHÁT HÀNH HÓA ĐƠN HÀNG LOẠT</DialogTitle>
              <Badge variant="outline" className="px-2 py-0.5 font-bold text-xs border-primary/30 text-primary uppercase">Bước {step}/2</Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium italic">
              {step === 1 ? "Lựa chọn kỳ hóa đơn và các căn hộ áp dụng" : "Cập nhật chỉ số tiêu thụ điện nước thực tế"}
            </p>
          </div>

          <div className="p-6">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Kỳ hóa đơn (Tháng / Năm)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input type="number" className="w-20 h-10 text-sm font-bold text-center rounded-lg" value={billingPeriod.month} onChange={e => setBillingPeriod({ ...billingPeriod, month: Number(e.target.value) })} />
                      <Input type="number" className="flex-1 h-10 text-sm font-bold text-center rounded-lg" value={billingPeriod.year} onChange={e => setBillingPeriod({ ...billingPeriod, year: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Lọc căn hộ nhanh</Label>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-10 h-10 text-sm rounded-lg" placeholder="Số phòng, Block..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Cấu trúc các khoản phí áp dụng</Label>
                  <div className="flex flex-wrap gap-2">
                    {feeRates.map(fee => {
                      const Icon = FEE_ICON_MAP[fee.fee_type] || FileText
                      return (
                        <div
                          key={fee._id}
                          onClick={() => handleToggleFee(fee.fee_type)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer",
                            appliedFees.includes(fee.fee_type) ? "bg-primary/5 border-primary text-primary" : "bg-muted/30 border-transparent opacity-60 text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-[11px] font-bold uppercase tracking-tight">{fee.description ? fee.description.split('/')[0].trim() : fee.fee_type}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden bg-muted/5">
                  <div className="bg-muted/20 p-3 px-5 flex items-center justify-between border-b">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Danh sách căn hộ ({selectedAptIds.length})</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary px-3" onClick={handleSelectAll}>
                        {selectedAptIds.length === filteredApartments.length ? "BỎ CHỌN HẾT" : "CHỌN TẤT CẢ"}
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-2 p-4">
                    {filteredApartments.map(apt => (
                      <div
                        key={apt._id}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-pointer",
                          selectedAptIds.includes(apt._id) ? "border-primary bg-primary/5" : "bg-card border-transparent hover:bg-muted/50"
                        )}
                        onClick={() => handleToggleApt(apt._id)}
                      >
                        <Checkbox
                          checked={selectedAptIds.includes(apt._id)}
                          onCheckedChange={() => handleToggleApt(apt._id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className={cn("text-xs font-bold", selectedAptIds.includes(apt._id) ? "text-primary" : "text-foreground")}>{apt.block}-{apt.apartment_number}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full font-bold h-11 text-sm rounded-lg shadow-sm" onClick={handleNextStep}>
                    TIẾP TỤC BƯỚC TIẾP THEO <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
                  <div className="max-h-[350px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b sticky top-0 z-10">
                        <tr>
                          <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">Căn hộ</th>
                          {appliedFees.includes("electricity") && (
                            <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">
                              <Zap className="h-4 w-4 inline mr-2 text-muted-foreground" /> ĐIỆN (kWh)
                            </th>
                          )}
                          {appliedFees.includes("water") && (
                            <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">
                              <Droplets className="h-4 w-4 inline mr-2 text-muted-foreground" /> NƯỚC (m³)
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedAptIds.map(id => {
                          const apt = apartments.find(a => a._id === id)
                          return (
                            <tr key={id} className="hover:bg-muted/10 transition-colors">
                              <td className="p-4">
                                <span className="font-bold text-sm">{apt?.block}-{apt?.apartment_number}</span>
                              </td>
                              {appliedFees.includes("electricity") && (
                                <td className="p-4">
                                  <div className="relative max-w-[120px]">
                                    <Input
                                      type="number"
                                      className="h-10 pr-10 text-sm font-bold rounded-lg border-muted-foreground/20 focus:border-primary"
                                      value={consumptionMap[id]?.elec}
                                      onChange={e => setConsumptionMap({ ...consumptionMap, [id]: { ...consumptionMap[id], elec: e.target.value } })}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">kWh</span>
                                  </div>
                                </td>
                              )}
                              {appliedFees.includes("water") && (
                                <td className="p-4">
                                  <div className="relative max-w-[120px]">
                                    <Input
                                      type="number"
                                      className="h-10 pr-10 text-sm font-bold rounded-lg border-muted-foreground/20 focus:border-primary"
                                      value={consumptionMap[id]?.water}
                                      onChange={e => setConsumptionMap({ ...consumptionMap, [id]: { ...consumptionMap[id], water: e.target.value } })}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">m³</span>
                                  </div>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button variant="outline" className="flex-1 h-11 font-bold text-sm rounded-lg" onClick={() => setStep(1)}>
                    QUAY LẠI
                  </Button>
                  <Button className="flex-[2] h-11 font-bold text-sm rounded-lg shadow-sm" onClick={handleGenerateBulk}>
                    PHÁT HÀNH {selectedAptIds.length} HÓA ĐƠN NGAY
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}
