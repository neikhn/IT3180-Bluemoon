import { useState, useEffect } from "react"
import { api } from "../../lib/axios"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { CreditCard, Banknote, History, Loader2, CheckCircle2 } from "lucide-react"
import { getStoredUser } from "../../lib/auth"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Chưa thanh toán", variant: "destructive" },
  paid: { label: "Đã thanh toán", variant: "default" },
  partial: { label: "Thanh toán 1 phần", variant: "secondary" },
  cancelled: { label: "Đã hủy", variant: "outline" },
}

const FEE_LABELS: Record<string, string> = {
  management: "Phí quản lý",
  electricity: "Tiền điện",
  water: "Tiền nước",
  parking_car: "Phí gửi ô tô",
  parking_motorbike: "Phí gửi xe máy",
}

function FileTextIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  )
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount)
}

export default function FeesPage() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<any[]>([])
  const [myApt, setMyApt] = useState<any>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")

  useEffect(() => {
    async function init() {
      try {
        const user = getStoredUser()
        if (!user?.resident_id) {
          setLoading(false)
          return
        }

        const [aptRes, invRes] = await Promise.all([
          api.get("/apartments"),
          api.get("/invoices"),
        ])

        const apt = aptRes.data.find((a: any) =>
          a.current_residents?.some(
            (cr: any) => cr.resident_id === user.resident_id && cr.status === "living"
          )
        )
        setMyApt(apt)

        if (apt) {
          const myInvoices = invRes.data.filter(
            (inv: any) => inv.apartment_id === apt._id
          )
          setInvoices(myInvoices.sort((a: any, b: any) => {
            if (a.billing_period_year !== b.billing_period_year) {
              return b.billing_period_year - a.billing_period_year
            }
            return b.billing_period_month - a.billing_period_month
          }))
        }
      } catch {
        toast.error("Không thể tải hóa đơn.")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handlePay = async () => {
    if (!selectedInvoice) return
    setPaying(true)
    try {
      await api.patch(`/invoices/${selectedInvoice._id}`, {
        status: "paid",
        payment_method: paymentMethod,
      })
      toast.success("Thanh toán thành công!")
      setPayDialogOpen(false)
      // Refresh
      const invRes = await api.get("/invoices")
      const updated = invRes.data.find((i: any) => i._id === selectedInvoice._id)
      setInvoices((prev) =>
        prev.map((inv) => (inv._id === updated._id ? updated : inv))
      )
      setSelectedInvoice(updated)
    } catch {
      toast.error("Lỗi thanh toán. Vui lòng thử lại.")
    } finally {
      setPaying(false)
    }
  }

  const totalDue = invoices
    .filter((i) => i.status === "pending" || i.status === "partial")
    .reduce((sum, i) => sum + (i.amount_due - i.paid_amount), 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Billing & Fees</h2>
        <Button variant="ghost" size="icon" className="rounded-full">
          <History className="h-5 w-5" />
        </Button>
      </div>

      {/* Total Balance Card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl">
        <div className="absolute -top-6 -right-6 opacity-10">
          <Banknote className="h-32 w-32" />
        </div>
        <CardHeader className="relative z-10 pb-1">
          <CardDescription className="text-xs font-medium tracking-wide text-primary-foreground/80 uppercase">
            Total Due Balance
          </CardDescription>
          <CardTitle className="mt-1 text-4xl font-extrabold tracking-tighter">
            {formatVND(totalDue)}
            <span className="text-lg font-normal opacity-80"> VND</span>
          </CardTitle>
          {myApt && (
            <p className="mt-1 text-xs opacity-70">
              Căn hộ {myApt.block}-{myApt.apartment_number}
            </p>
          )}
        </CardHeader>
        <CardContent className="relative z-10 pt-4">
          <Button
            variant="secondary"
            className="h-12 w-full rounded-xl text-sm font-bold shadow-md transition-transform hover:scale-[1.02]"
            disabled={totalDue === 0}
            onClick={() => {
              const unpaid = invoices.find((i) => i.status === "pending" || i.status === "partial")
              if (unpaid) {
                setSelectedInvoice(unpaid)
                setPayDialogOpen(true)
              }
            }}
          >
            <CreditCard className="mr-2 h-4 w-4" /> Thanh toán ngay
          </Button>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <div className="space-y-3 pt-2">
        <h3 className="pl-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Recent Invoices ({invoices.length})
        </h3>

        {invoices.length === 0 ? (
          <Card className="border shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <FileTextIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Chưa có hóa đơn nào.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {invoices.map((inv) => {
              const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending
              const period = `${String(inv.billing_period_month).padStart(2, "0")}/${inv.billing_period_year}`
              const remaining = inv.amount_due - inv.paid_amount

              return (
                <Card
                  key={inv._id}
                  className="cursor-pointer border shadow-none transition-colors hover:bg-muted/40"
                  onClick={() => {
                    setSelectedInvoice(inv)
                    setPayDialogOpen(true)
                  }}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm leading-tight font-bold text-foreground/90">
                        Hóa đơn {period}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {inv.invoice_code} • Due {new Date(inv.due_date).toLocaleDateString("vi-VN")}
                      </div>
                      {inv.line_items && inv.line_items.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {inv.line_items.slice(0, 3).map((item: any, idx: number) => (
                            <span key={idx} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                              {FEE_LABELS[item.fee_type] || item.fee_type}
                            </span>
                          ))}
                          {inv.line_items.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">
                              +{inv.line_items.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="mb-1 text-[15px] font-bold">
                        {inv.status === "paid"
                          ? formatVND(inv.paid_amount)
                          : formatVND(inv.amount_due)} đ
                      </div>
                      <Badge variant={statusCfg.variant} className="px-1.5 py-0 text-[9px] leading-relaxed tracking-widest uppercase">
                        {statusCfg.label}
                      </Badge>
                      {inv.status === "partial" && (
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          Còn {formatVND(remaining)} đ
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              {selectedInvoice?.status === "paid" ? "Chi tiết hóa đơn" : "Thanh toán hóa đơn"}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 pt-2">
              {/* Invoice Summary */}
              <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mã hóa đơn</span>
                  <span className="font-mono font-semibold">{selectedInvoice.invoice_code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kỳ billing</span>
                  <span className="font-semibold">
                    {String(selectedInvoice.billing_period_month).padStart(2, "0")}/{selectedInvoice.billing_period_year}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ngày đến hạn</span>
                  <span className="font-semibold">
                    {new Date(selectedInvoice.due_date).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                {selectedInvoice.previous_debt > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Công nợ tháng trước</span>
                    <span className="font-semibold">+{formatVND(selectedInvoice.previous_debt)} đ</span>
                  </div>
                )}
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Giảm giá</span>
                    <span className="font-semibold">-{formatVND(selectedInvoice.discount_amount)} đ</span>
                  </div>
                )}
              </div>

              {/* Line Items */}
              {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chi tiết</p>
                  {selectedInvoice.line_items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                      <div>
                        <span className="font-medium">{FEE_LABELS[item.fee_type] || item.fee_type}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.quantity} × {formatVND(item.unit_price)} đ
                        </span>
                      </div>
                      <span className="font-semibold">{formatVND(item.amount)} đ</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="space-y-1.5 border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tổng phí</span>
                  <span>{formatVND(selectedInvoice.subtotal)} đ</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Giảm giá</span>
                    <span>-{formatVND(selectedInvoice.discount_amount)} đ</span>
                  </div>
                )}
                {selectedInvoice.previous_debt > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Công nợ</span>
                    <span>+{formatVND(selectedInvoice.previous_debt)} đ</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Tổng cần trả</span>
                  <span className="text-primary">{formatVND(selectedInvoice.amount_due)} đ</span>
                </div>
                {selectedInvoice.status === "paid" && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Đã thanh toán</span>
                    <span className="font-semibold">{formatVND(selectedInvoice.paid_amount)} đ</span>
                  </div>
                )}
              </div>

              {/* Payment Actions */}
              {selectedInvoice.status !== "paid" && selectedInvoice.status !== "cancelled" && (
                <div className="space-y-3 border-t pt-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phương thức</p>
                    <div className="flex gap-2">
                      {[
                        { value: "cash", label: "Tiền mặt" },
                        { value: "bank_transfer", label: "Chuyển khoản" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPaymentMethod(opt.value)}
                          className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                            paymentMethod === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full font-bold"
                    onClick={handlePay}
                    disabled={paying}
                  >
                    {paying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Xác nhận thanh toán {formatVND(selectedInvoice.amount_due)} đ
                      </>
                    )}
                  </Button>
                </div>
              )}

              {selectedInvoice.status === "paid" && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-4 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Đã thanh toán</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}