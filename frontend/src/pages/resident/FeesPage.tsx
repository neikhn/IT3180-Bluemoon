import { useState, useEffect, useCallback } from "react"
import { api } from "../../lib/axios"
import { toast } from "sonner"
import { getStoredUser } from "../../lib/auth"
import { extractErrorMessage } from "../../lib/utils"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { Label } from "../../components/ui/label"
import {
  Receipt, RefreshCw, CheckCircle2, Clock, AlertTriangle,
  XCircle, ChevronDown, ChevronUp, Loader2, CreditCard,
  Wallet, Banknote, Building2
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface LineItem {
  fee_type: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  is_adjusted: boolean
  adjustment_note?: string
}

interface Invoice {
  _id: string
  invoice_code: string
  apartment_id: string
  billing_period_month: number
  billing_period_year: number
  line_items: LineItem[]
  subtotal: number
  total_amount: number
  previous_debt: number
  amount_due: number
  discount_amount: number
  discount_note?: string
  status: string
  due_date: string
  paid_date?: string
  payment_method?: string
  paid_amount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FMT = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
const fmt = (n: number) => FMT.format(n)

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Chưa thanh toán",     color: "bg-amber-100 text-amber-700 border-amber-200",     icon: Clock },
  paid:      { label: "Đã thanh toán",        color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  partial:   { label: "Thanh toán một phần",  color: "bg-blue-100 text-blue-700 border-blue-200",        icon: AlertTriangle },
  cancelled: { label: "Đã hủy",              color: "bg-gray-100 text-gray-500 border-gray-200",        icon: XCircle },
}

const FEE_TYPE_LABELS: Record<string, string> = {
  management: "Phí quản lý", electricity: "Tiền điện", water: "Tiền nước",
  parking_car: "Phí gửi ô tô", parking_motorbike: "Phí gửi xe máy", other: "Phí khác",
}

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Chuyển khoản ngân hàng", icon: Building2 },
  { value: "e_wallet",      label: "Ví điện tử (MoMo/ZaloPay)", icon: Wallet },
  { value: "cash",          label: "Tiền mặt (tại quầy)", icon: Banknote },
]

// ─── InvoiceCard ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border", icon: Clock }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  )
}

function InvoiceCard({ invoice, onPay }: { invoice: Invoice; onPay: (inv: Invoice) => void }) {
  const [expanded, setExpanded] = useState(false)
  const isOverdue = invoice.status === "pending" && new Date(invoice.due_date) < new Date()

  return (
    <div className={`rounded-2xl border transition-all ${isOverdue ? "border-red-200 bg-red-50/30 dark:border-red-900/50" : "bg-card hover:shadow-md"}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${invoice.status === "paid" ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"}`}>
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-primary">{invoice.invoice_code}</span>
              <StatusBadge status={invoice.status} />
              {isOverdue && <span className="text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 rounded-full px-2 py-0.5 uppercase tracking-wide">Quá hạn!</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kỳ {invoice.billing_period_month}/{invoice.billing_period_year}
              {" · "}Hạn: {new Date(invoice.due_date).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Số tiền</p>
            <p className={`text-lg font-bold ${invoice.status === "paid" ? "text-emerald-600" : isOverdue ? "text-red-600" : ""}`}>
              {fmt(invoice.amount_due)}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {(invoice.status === "pending" || invoice.status === "partial") && (
              <Button size="sm" onClick={() => onPay(invoice)} className="h-8 gap-1.5 text-xs">
                <CreditCard className="h-3.5 w-3.5" /> Đóng tiền
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(v => !v)} className="h-7 gap-1 text-xs text-muted-foreground">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Ẩn" : "Chi tiết"}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Line items */}
          <div className="rounded-xl overflow-hidden border text-sm">
            <table className="w-full">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Khoản phí</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">SL</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Đơn giá</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-background">
                {invoice.line_items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{FEE_TYPE_LABELS[item.fee_type] || item.fee_type}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      {item.is_adjusted && item.adjustment_note && (
                        <p className="text-xs text-amber-600">⚠ {item.adjustment_note}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground hidden sm:table-cell">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground hidden sm:table-cell">{fmt(item.unit_price)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="rounded-xl bg-muted/30 border p-3 text-sm space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Tạm tính</span><span>{fmt(invoice.subtotal)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Giảm giá {invoice.discount_note && `(${invoice.discount_note})`}</span>
                <span>-{fmt(invoice.discount_amount)}</span>
              </div>
            )}
            {invoice.previous_debt > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Nợ tháng trước</span><span>+{fmt(invoice.previous_debt)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Tổng cần đóng</span>
              <span className={invoice.status === "paid" ? "text-emerald-600" : ""}>{fmt(invoice.amount_due)}</span>
            </div>
          </div>

          {invoice.status === "paid" && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Đã thanh toán{invoice.paid_date && ` ngày ${new Date(invoice.paid_date).toLocaleDateString("vi-VN")}`}
                {invoice.payment_method && ` · ${PAYMENT_METHODS.find(m => m.value === invoice.payment_method)?.label || invoice.payment_method}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [apartmentId, setApartmentId] = useState<string | null>(null)
  const [apartmentInfo, setApartmentInfo] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [payTarget, setPayTarget] = useState<Invoice | null>(null)
  const [payMethod, setPayMethod] = useState("bank_transfer")
  const [payLoading, setPayLoading] = useState(false)

  const storedUser = getStoredUser()

  const initApartment = useCallback(async () => {
    if (!storedUser?.resident_id) return
    try {
      const res = await api.get("/apartments")
      const mine = res.data.find((apt: any) =>
        apt.current_residents?.some((cr: any) => cr.resident_id === storedUser.resident_id && cr.status === "living")
      )
      if (mine) { setApartmentId(mine._id); setApartmentInfo(mine) }
    } catch {/* ignore */ }
  }, [storedUser?.resident_id])

  const fetchInvoices = useCallback(async () => {
    if (!apartmentId) return
    setLoading(true)
    try {
      const res = await api.get(`/invoices?apartment_id=${apartmentId}&limit=50`)
      setInvoices(res.data)
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Không thể tải hóa đơn."))
    } finally {
      setLoading(false)
    }
  }, [apartmentId])

  useEffect(() => { initApartment() }, [initApartment])
  useEffect(() => { if (apartmentId) fetchInvoices() }, [apartmentId, fetchInvoices])

  const handlePay = async () => {
    if (!payTarget) return
    setPayLoading(true)
    try {
      await api.post(`/invoices/${payTarget._id}/pay`, { payment_method: payMethod })
      toast.success(`✅ Thanh toán ${payTarget.invoice_code} thành công!`)
      setPayTarget(null)
      fetchInvoices()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Thanh toán thất bại."))
    } finally {
      setPayLoading(false)
    }
  }

  const totalPending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount_due, 0)
  const totalPaid    = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.paid_amount, 0)
  const overdueCount = invoices.filter(i => i.status === "pending" && new Date(i.due_date) < new Date()).length

  const FILTERS = [
    { value: "all", label: `Tất cả (${invoices.length})` },
    { value: "pending", label: `Chưa đóng (${invoices.filter(i => i.status === "pending").length})` },
    { value: "paid", label: `Đã đóng (${invoices.filter(i => i.status === "paid").length})` },
  ]

  const filtered = filterStatus === "all" ? invoices : invoices.filter(i => i.status === filterStatus)

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Hóa đơn &amp; Thanh toán
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {apartmentInfo ? `Căn hộ ${apartmentInfo.block}-${apartmentInfo.apartment_number}` : "Các khoản phí liên quan đến căn hộ"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Cần thanh toán</p>
          <p className="text-lg font-bold mt-1 text-amber-600 truncate">{fmt(totalPending)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Đã thanh toán</p>
          <p className="text-lg font-bold mt-1 text-emerald-600 truncate">{fmt(totalPaid)}</p>
        </Card>
        <Card className={`p-4 ${overdueCount > 0 ? "border-red-200 bg-red-50/50" : ""}`}>
          <p className="text-xs text-muted-foreground">Quá hạn</p>
          <p className={`text-lg font-bold mt-1 ${overdueCount > 0 ? "text-red-600" : ""}`}>{overdueCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilterStatus(f.value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}>{f.label}</button>
        ))}
      </div>

      {/* Content */}
      {!apartmentId ? (
        <Card><CardContent className="py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Bạn chưa được gắn vào căn hộ nào.</p>
        </CardContent></Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Đang tải hóa đơn...
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Receipt className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">{filterStatus === "all" ? "Chưa có hóa đơn nào." : "Không có hóa đơn phù hợp."}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <InvoiceCard key={inv._id} invoice={inv} onPay={i => { setPayTarget(i); setPayMethod("bank_transfer") }} />
          ))}
        </div>
      )}

      {/* Pay Dialog */}
      <Dialog open={!!payTarget} onOpenChange={v => { if (!v) setPayTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Xác nhận thanh toán
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="rounded-xl bg-muted/40 border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hóa đơn</span>
                <span className="font-mono font-bold text-primary">{payTarget?.invoice_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kỳ</span>
                <span>{payTarget && `${payTarget.billing_period_month}/${payTarget.billing_period_year}`}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-lg">
                <span>Số tiền</span>
                <span className="text-primary">{payTarget && fmt(payTarget.amount_due)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Phương thức thanh toán</Label>
              <div className="space-y-2">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon
                  return (
                    <button key={m.value} type="button" onClick={() => setPayMethod(m.value)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        payMethod === m.value ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"
                      }`}>
                      <Icon className={`h-5 w-5 shrink-0 ${payMethod === m.value ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${payMethod === m.value ? "text-primary" : ""}`}>{m.label}</span>
                      {payMethod === m.value && <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center bg-muted/40 rounded-lg p-2">
              ⚠ Sau khi xác nhận, hóa đơn sẽ được ghi nhận là đã thanh toán trong hệ thống.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayTarget(null)}>Hủy</Button>
            <Button onClick={handlePay} disabled={payLoading} className="gap-1.5">
              {payLoading && <Loader2 className="h-4 w-4 animate-spin" />} Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}