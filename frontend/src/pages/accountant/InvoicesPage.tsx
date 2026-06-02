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
import { Plus, Receipt, CheckCircle2, Clock, XCircle, FileText, Search, Home, Zap, Droplets, Eye, ChevronRight, Car, Bike, Heart, Download } from "lucide-react"
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
  charity: Heart,
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
  const [consumptionMap, setConsumptionMap] = useState<Record<string, { elec: string, water: string, charity: string }>>({})
  const [billingPeriod, setBillingPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"xlsx" | "pdf">("xlsx")
  const [exportScope, setExportScope] = useState<"all" | "month" | "quarter" | "year">("all")
  const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth() + 1)
  const [exportQuarter, setExportQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3))
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear())

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
      if (!newMap[id]) newMap[id] = { elec: "0", water: "0", charity: "0" }
    })
    setConsumptionMap(newMap)
    setStep(2)
  }

  const handleGenerateBulk = async () => {
    try {
      const items = selectedAptIds.map(id => ({
        apartment_id: id,
        electricity_consumption: Number(consumptionMap[id]?.elec || 0),
        water_consumption: Number(consumptionMap[id]?.water || 0),
        donation_amount: Number(consumptionMap[id]?.charity || 0)
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

  const STATUS_MAP: Record<string, string> = {
    pending: "Chưa thanh toán",
    paid: "Đã thanh toán",
    partial: "Thanh toán 1 phần",
    cancelled: "Đã hủy",
  }

  const handleExportXLSX = (filteredInvoices: any[], titleSuffix: string, XLSX: any) => {
    if (filteredInvoices.length === 0) { toast.error("Không có hóa đơn để xuất."); return }
    const rows = filteredInvoices.map((inv: any) => ({
      "Mã HĐ": inv.invoice_code,
      "Căn hộ": getAptName(inv.apartment_id),
      "Kỳ thanh toán": `${String(inv.billing_period_month).padStart(2, "0")}/${inv.billing_period_year}`,
      "Tổng tiền (VNĐ)": inv.amount_due,
      "Đã thanh toán (VNĐ)": inv.paid_amount || 0,
      "Còn nợ (VNĐ)": inv.amount_due - (inv.paid_amount || 0),
      "Hạn thanh toán": new Date(inv.due_date).toLocaleDateString("vi-VN"),
      "Trạng thái": STATUS_MAP[inv.status] || inv.status,
      "Ngày thanh toán": inv.paid_date ? new Date(inv.paid_date).toLocaleDateString("vi-VN") : "",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws["!cols"] = [
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
      { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Hóa đơn")
    XLSX.writeFile(wb, `bao-cao-hoa-don-${titleSuffix}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success("Đã xuất file Excel!")
  }

  const loadFonts = async (doc: any) => {
    try {
      const [regRes, boldRes] = await Promise.all([
        fetch("/fonts/Roboto-Regular.ttf"),
        fetch("/fonts/Roboto-Bold.ttf")
      ])
      if (!regRes.ok || !boldRes.ok) {
        throw new Error("Không thể tải file font từ server.")
      }
      const [regBuf, boldBuf] = await Promise.all([
        regRes.arrayBuffer(),
        boldRes.arrayBuffer()
      ])
      const toBase64 = (buf: ArrayBuffer) => {
        let binary = ""
        const bytes = new Uint8Array(buf)
        const len = bytes.byteLength
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        return window.btoa(binary)
      }
      doc.addFileToVFS("Roboto-Regular.ttf", toBase64(regBuf))
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal")
      doc.addFileToVFS("Roboto-Bold.ttf", toBase64(boldBuf))
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold")
      return true
    } catch (err) {
      console.error("Lỗi tải font tiếng Việt:", err)
      return false
    }
  }

  const handleExportPDF = async (filteredInvoices: any[], titleText: string, titleSuffix: string) => {
    if (filteredInvoices.length === 0) { toast.error("Không có hóa đơn để xuất."); return }
    const [{ default: jsPDF }, autoTable] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ])
    const doc = new jsPDF("landscape", "mm", "a4")
    
    toast.info("Đang xử lý và tải font tiếng Việt...")
    const fontsLoaded = await loadFonts(doc)
    
    if (fontsLoaded) {
      doc.setFont("Roboto", "bold")
    } else {
      doc.setFont("helvetica", "bold")
    }
    
    doc.setFontSize(16)
    doc.text(titleText, 148, 15, { align: "center" })
    doc.setFontSize(10)
    
    if (fontsLoaded) {
      doc.setFont("Roboto", "normal")
    } else {
      doc.setFont("helvetica", "normal")
    }
    
    doc.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}  |  Tổng: ${filteredInvoices.length} hóa đơn`, 148, 22, { align: "center" })

    const head = [[
      "Mã HĐ", "Căn hộ", "Kỳ", "Tổng tiền", "Đã thu", "Còn nợ", "Hạn TT", "Trạng thái", "Ngày TT",
    ]]
    const body = filteredInvoices.map((inv: any) => [
      inv.invoice_code,
      getAptName(inv.apartment_id),
      `${String(inv.billing_period_month).padStart(2, "0")}/${inv.billing_period_year}`,
      inv.amount_due.toLocaleString("vi-VN"),
      (inv.paid_amount || 0).toLocaleString("vi-VN"),
      (inv.amount_due - (inv.paid_amount || 0)).toLocaleString("vi-VN"),
      new Date(inv.due_date).toLocaleDateString("vi-VN"),
      STATUS_MAP[inv.status] || inv.status,
      inv.paid_date ? new Date(inv.paid_date).toLocaleDateString("vi-VN") : "",
    ])

    autoTable.default(doc, {
      startY: 28,
      head,
      body,
      styles: { 
        font: fontsLoaded ? "Roboto" : "helvetica", 
        fontSize: 8, 
        cellPadding: 2 
      },
      headStyles: { 
        fillColor: [59, 130, 246], 
        fontStyle: "bold", 
        fontSize: 8 
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
    })

    doc.save(`bao-cao-hoa-don-${titleSuffix}-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success("Đã xuất file PDF!")
  }

  const executeExport = async () => {
    let filtered = [...invoices]
    let titleText = "BÁO CÁO HÓA ĐƠN"
    let titleSuffix = "tat-ca"

    if (exportScope === "month") {
      filtered = invoices.filter(inv => inv.billing_period_month === exportMonth && inv.billing_period_year === exportYear)
      titleText = `BÁO CÁO HÓA ĐƠN THÁNG ${exportMonth}/${exportYear}`
      titleSuffix = `thang-${exportMonth}-${exportYear}`
    } else if (exportScope === "quarter") {
      filtered = invoices.filter(inv => Math.ceil(inv.billing_period_month / 3) === exportQuarter && inv.billing_period_year === exportYear)
      titleText = `BÁO CÁO HÓA ĐƠN QUÝ ${exportQuarter}/${exportYear}`
      titleSuffix = `quy-${exportQuarter}-${exportYear}`
    } else if (exportScope === "year") {
      filtered = invoices.filter(inv => inv.billing_period_year === exportYear)
      titleText = `BÁO CÁO HÓA ĐƠN NĂM ${exportYear}`
      titleSuffix = `nam-${exportYear}`
    }

    if (filtered.length === 0) {
      toast.error("Không có hóa đơn nào khớp với bộ lọc đã chọn.")
      return
    }

    if (exportFormat === "xlsx") {
      const XLSX = await import("xlsx")
      handleExportXLSX(filtered, titleSuffix, XLSX)
    } else {
      await handleExportPDF(filtered, titleText, titleSuffix)
    }
    setExportOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản lý Hóa đơn</h2>
          <p className="text-muted-foreground text-sm">Hệ thống phát hành hóa đơn tự động định kỳ.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setExportOpen(true)} className="font-bold shadow-sm">
            <Download className="h-4 w-4 mr-2" /> Xuất báo cáo
          </Button>
          <Button onClick={() => setGenerateOpen(true)} className="font-bold shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Phát hành hóa đơn
          </Button>
        </div>
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
                          {appliedFees.includes("charity") && (
                            <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">
                              <Heart className="h-4 w-4 inline mr-2 text-pink-500" /> ỦNG HỘ (VND)
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
                              {appliedFees.includes("charity") && (
                                <td className="p-4">
                                  <div className="relative max-w-[150px]">
                                    <Input
                                      type="number"
                                      className="h-10 pr-10 text-sm font-bold rounded-lg border-muted-foreground/20 focus:border-pink-300"
                                      placeholder="0"
                                      value={consumptionMap[id]?.charity}
                                      onChange={e => setConsumptionMap({ ...consumptionMap, [id]: { ...consumptionMap[id], charity: e.target.value } })}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">VND</span>
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

      {/* Export Config Dialog */}
      <Dialog open={exportOpen} onOpenChange={(o) => { if (!o) setExportOpen(false) }}>
        <DialogContent className="mx-auto w-[92vw] rounded-xl p-6 sm:max-w-md border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-primary" />
              CẤU HÌNH XUẤT BÁO CÁO HÓA ĐƠN
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Định dạng file</Label>
              <select 
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" 
                value={exportFormat} 
                onChange={(e) => setExportFormat(e.target.value as any)}
              >
                <option value="xlsx">📊 File Excel (.xlsx)</option>
                <option value="pdf">📄 File PDF (.pdf)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Phạm vi xuất dữ liệu</Label>
              <select 
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" 
                value={exportScope} 
                onChange={(e) => setExportScope(e.target.value as any)}
              >
                <option value="all">Tất cả hóa đơn</option>
                <option value="month">Theo tháng</option>
                <option value="quarter">Theo quý</option>
                <option value="year">Theo năm</option>
              </select>
            </div>

            {exportScope === "month" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Tháng</Label>
                  <select 
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={exportMonth}
                    onChange={(e) => setExportMonth(Number(e.target.value))}
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Năm</Label>
                  <Input 
                    type="number" 
                    value={exportYear} 
                    onChange={(e) => setExportYear(Number(e.target.value))} 
                    placeholder="VD: 2026"
                  />
                </div>
              </div>
            )}

            {exportScope === "quarter" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Quý</Label>
                  <select 
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={exportQuarter}
                    onChange={(e) => setExportQuarter(Number(e.target.value))}
                  >
                    <option value={1}>Quý 1 (Tháng 1-3)</option>
                    <option value={2}>Quý 2 (Tháng 4-6)</option>
                    <option value={3}>Quý 3 (Tháng 7-9)</option>
                    <option value={4}>Quý 4 (Tháng 10-12)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Năm</Label>
                  <Input 
                    type="number" 
                    value={exportYear} 
                    onChange={(e) => setExportYear(Number(e.target.value))} 
                    placeholder="VD: 2026"
                  />
                </div>
              </div>
            )}

            {exportScope === "year" && (
              <div className="space-y-1">
                <Label className="text-xs uppercase font-bold text-muted-foreground ml-0.5">Năm</Label>
                <Input 
                  type="number" 
                  value={exportYear} 
                  onChange={(e) => setExportYear(Number(e.target.value))} 
                  placeholder="VD: 2026"
                />
              </div>
            )}

            <div className="flex gap-3 pt-3">
              <Button variant="outline" className="flex-1 font-bold rounded-lg text-sm" onClick={() => setExportOpen(false)}>
                HỦY BỎ
              </Button>
              <Button className="flex-[2] font-bold rounded-lg text-sm shadow-sm" onClick={executeExport}>
                XUẤT BÁO CÁO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}
