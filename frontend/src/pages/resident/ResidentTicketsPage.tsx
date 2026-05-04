import { useState, useEffect, useMemo } from "react"
import { api } from "../../lib/axios"
import { toast } from "sonner"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { extractErrorMessage } from "../../lib/utils"
import {
  MessageSquarePlus,
  Clock,
  CheckCircle2,
  Inbox,
  MinusCircle,
  XCircle,
  EyeOff,
  Eye,
} from "lucide-react"

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: any; icon: any; color: string }
> = {
  open: {
    label: "Mới",
    variant: "destructive",
    icon: Inbox,
    color: "text-destructive",
  },
  processing: {
    label: "Đang xử lý",
    variant: "secondary",
    icon: Clock,
    color: "text-amber-500",
  },
  pending_close: {
    label: "Chờ đóng",
    variant: "outline",
    icon: MinusCircle,
    color: "text-muted-foreground",
  },
  closed: {
    label: "Đã đóng",
    variant: "default",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  rejected: {
    label: "Từ chối",
    variant: "destructive",
    icon: XCircle,
    color: "text-destructive",
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  vehicle_registration: "Đăng ký PT",
  technical: "Kỹ thuật",
  hygiene: "Vệ sinh",
  security: "An ninh",
  noise: "Tiếng ồn",
  other: "Khác",
}

export default function ResidentTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openNew, setOpenNew] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [replyText, setReplyText] = useState("")

  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [category, setCategory] = useState("technical")

  // Dispute dialog
  const [isDisputeOpen, setIsDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")

  // Toggle closed/rejected tickets
  const [showClosed, setShowClosed] = useState(true)

  // Dynamic resident + apartment IDs
  const [resId, setResId] = useState<string | null>(null)
  const [aptId, setAptId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const [resRes, aptRes] = await Promise.all([
          api.get("/residents"),
          api.get("/apartments"),
        ])
        if (resRes.data.length > 0) {
          const resident = resRes.data[0]
          setResId(resident._id)
          const apt = aptRes.data.find((a: any) =>
            a.current_residents?.some(
              (cr: any) => cr.resident_id === resident._id && cr.status === "living"
            )
          )
          if (apt) setAptId(apt._id)
        }
      } catch {
        /* silent */
      }
    }
    init()
  }, [])

  const fetchTickets = async () => {
    try {
      const res = await api.get("/tickets")
      setTickets(res.data)
      if (selectedTicket) {
        const refreshed = res.data.find(
          (t: any) => t._id === selectedTicket._id
        )
        if (refreshed) setSelectedTicket(refreshed)
      }
    } catch {
      toast.error("Không thể tải danh sách ticket.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const filteredTickets = useMemo(() => {
    if (showClosed) return tickets
    return tickets.filter(t => !["closed", "rejected"].includes(t.status))
  }, [tickets, showClosed])

  const closedCount = useMemo(
    () => tickets.filter(t => ["closed", "rejected"].includes(t.status)).length,
    [tickets]
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !desc.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin.")
      return
    }
    if (!resId || !aptId) {
      toast.error("Không tìm thấy thông tin cư dân.")
      return
    }
    try {
      await api.post("/tickets", {
        resident_id: resId,
        apartment_id: aptId,
        category,
        title,
        description: desc,
      })
      toast.success("Đã gửi yêu cầu thành công!")
      setOpenNew(false)
      setTitle("")
      setDesc("")
      setCategory("technical")
      fetchTickets()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi gửi ticket."))
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !resId) return
    try {
      await api.post(`/tickets/${selectedTicket._id}/reply`, {
        sender_role: "resident",
        sender_id: resId,
        message: replyText,
      })
      setReplyText("")
      fetchTickets()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi gửi phản hồi."))
    }
  }

  const handleRequestClose = async () => {
    try {
      await api.post(`/tickets/${selectedTicket._id}/request-close`, {
        requested_by: "resident",
      })
      toast.success("Đã gửi yêu cầu đóng ticket.")
      fetchTickets()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi yêu cầu đóng."))
    }
  }

  const handleAcceptClose = async () => {
    try {
      await api.post(`/tickets/${selectedTicket._id}/accept-close`)
      toast.success("Ticket đã được đóng.")
      fetchTickets()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi đóng ticket."))
    }
  }

  const handleDisputeClose = async () => {
    if (!disputeReason.trim()) {
      toast.error("Vui lòng nhập lý do phản đối.")
      return
    }
    try {
      await api.post(`/tickets/${selectedTicket._id}/dispute-close`, {
        disputed_by: "resident",
        reason: disputeReason,
      })
      toast.success("Đã phản đối yêu cầu đóng.")
      setIsDisputeOpen(false)
      setDisputeReason("")
      fetchTickets()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi phản đối đóng ticket."))
    }
  }

  const isPendingClose = selectedTicket?.status === "pending_close"
  const isActive =
    selectedTicket && !["closed", "rejected"].includes(selectedTicket.status)
  const isVehicleTicket = selectedTicket?.category === "vehicle_registration"
  const residentCanAccept =
    isPendingClose && selectedTicket?.pending_close_by === "admin"

  return (
    <div className="animate-in space-y-4 duration-300 fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Yêu cầu hỗ trợ</h2>
        <Button
          size="sm"
          onClick={() => setOpenNew(true)}
          className="gap-1.5 rounded-full shadow-md"
        >
          <MessageSquarePlus className="h-4 w-4" /> Gửi yêu cầu
        </Button>
      </div>

      {/* Toggle closed/rejected */}
      {closedCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => setShowClosed(v => !v)}
        >
          {showClosed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showClosed
            ? `Ẩn ${closedCount} yêu cầu đã đóng/từ chối`
            : `Hiện ${closedCount} yêu cầu đã đóng/từ chối`}
        </Button>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <MessageSquarePlus className="mx-auto mb-3 h-10 w-10 opacity-30" />
          {tickets.length === 0
            ? "Bạn chưa có yêu cầu hỗ trợ nào."
            : "Không có yêu cầu nào đang hoạt động."}
        </div>
      ) : (
        filteredTickets.map((t: any) => {
          const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
          const Icon = cfg.icon
          const isClosed = ["closed", "rejected"].includes(t.status)
          return (
            <Card
              key={t._id}
              className={`cursor-pointer shadow-sm transition-all hover:border-primary/40 hover:shadow-md ${isClosed ? "opacity-60" : ""}`}
              onClick={() => {
                setSelectedTicket(t)
                setReplyText("")
              }}
            >
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="line-clamp-1 text-sm font-semibold">
                      {t.title}
                    </span>
                    <Badge variant="outline" className="w-fit text-[10px]">
                      {CATEGORY_LABELS[t.category] || t.category}
                    </Badge>
                  </div>
                  <Badge
                    variant={cfg.variant}
                    className="flex shrink-0 items-center gap-1 text-[10px]"
                  >
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                    {t.category === "vehicle_registration"
                      ? "Yêu cầu đăng ký phương tiện"
                      : t.description}
                  </span>
                  <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                {t.responses?.length > 0 && (
                  <div className="text-[10px] font-medium text-primary">
                    {t.responses.length} phản hồi
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}

      {/* Create Dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Gửi yêu cầu hỗ trợ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Phân loại
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Kỹ thuật</SelectItem>
                    <SelectItem value="hygiene">Vệ sinh</SelectItem>
                    <SelectItem value="security">An ninh</SelectItem>
                    <SelectItem value="noise">Tiếng ồn</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Tiêu đề
                </Label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tóm tắt ngắn..."
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Mô tả chi tiết
              </Label>
              <textarea
                required
                className="min-h-[120px] w-full resize-none rounded-md border bg-muted/50 px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                placeholder="Mô tả vấn đề bạn gặp phải..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 w-full font-bold">
              Gửi yêu cầu
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View / Chat Dialog */}
      <Dialog
        open={!!selectedTicket}
        onOpenChange={(o) => !o && setSelectedTicket(null)}
      >
        <DialogContent className="mx-auto flex h-[85vh] w-[92vw] flex-col overflow-hidden rounded-2xl p-0 sm:max-w-md">
          {/* Header */}
          <div className="shrink-0 border-b px-5 pt-5 pb-3">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm text-muted-foreground">
                {selectedTicket?.ticket_code}
              </DialogTitle>
            </DialogHeader>
            <p className="mt-1 text-base leading-snug font-bold">
              {selectedTicket?.title}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              {(() => {
                const cfg =
                  STATUS_CONFIG[selectedTicket?.status] || STATUS_CONFIG.open
                const Icon = cfg.icon
                return (
                  <Badge
                    variant={cfg.variant}
                    className="flex w-fit items-center gap-1 text-[10px]"
                  >
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                )
              })()}
              <span className="text-[10px] text-muted-foreground">
                {selectedTicket &&
                  new Date(selectedTicket.created_at).toLocaleDateString(
                    "vi-VN"
                  )}
              </span>
            </div>

            {/* Action buttons for resident */}
            {isActive && !isVehicleTicket && (
              <div className="mt-3 flex gap-2">
                {isPendingClose && residentCanAccept ? (
                  <>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 text-xs text-white hover:bg-green-700"
                      onClick={handleAcceptClose}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Đồng ý đóng
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-amber-300 text-xs text-amber-600"
                      onClick={() => setIsDisputeOpen(true)}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Phản đối
                    </Button>
                  </>
                ) : isPendingClose && !residentCanAccept ? (
                  <Badge variant="outline" className="px-3 py-1.5 text-xs">
                    ⏳ Đang chờ ban quản lý xác nhận đóng
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs text-muted-foreground"
                    onClick={handleRequestClose}
                  >
                    <MinusCircle className="h-3.5 w-3.5" /> Yêu cầu đóng ticket
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Chat body */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {/* Original description */}
            <div className="mr-auto max-w-[90%] rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm">
              <div className="mb-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                Nội dung ban đầu
              </div>
              <p className="leading-relaxed whitespace-pre-wrap text-foreground/80">
                {isVehicleTicket
                  ? "Yêu cầu đăng ký phương tiện (chờ admin duyệt)"
                  : selectedTicket?.description}
              </p>
            </div>

            {/* Messages */}
            {selectedTicket?.responses?.map((r: any, idx: number) => {
              const isSystem = r.sender_role === "system"
              const isResident = r.sender_role === "resident"
              return (
                <div
                  key={idx}
                  className={`flex ${isResident ? "justify-end" : isSystem ? "justify-center" : "justify-start"}`}
                >
                  {isSystem ? (
                    <div className="max-w-[90%] rounded-full border bg-muted/80 px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                      {r.message}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        isResident
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm border bg-card"
                      }`}
                    >
                      {r.message}
                      <div
                        className={`mt-1 text-[10px] ${isResident ? "opacity-60" : "text-muted-foreground"}`}
                      >
                        {new Date(r.created_at).toLocaleTimeString("vi-VN")}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Reply input */}
          {isActive && !isPendingClose ? (
            <div className="flex shrink-0 gap-2 border-t bg-muted/10 p-4">
              <Input
                className="rounded-full bg-muted/50"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhắn tin..."
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
              />
              <Button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="rounded-full px-5"
              >
                Gửi
              </Button>
            </div>
          ) : !isActive ? (
            <div
              className={`shrink-0 border-t p-3 text-center text-xs font-medium ${
                selectedTicket?.status === "rejected"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {selectedTicket?.status === "rejected"
                ? "❌ Yêu cầu đã bị từ chối."
                : "✅ Vấn đề đã được giải quyết."}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-600">
              Phản đối đóng ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground">
              Nêu lý do tại sao bạn chưa muốn đóng ticket này.
            </p>
            <div className="space-y-1">
              <Label>Lý do phản đối</Label>
              <Input
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="VD: Tôi vẫn còn vấn đề chưa được giải quyết..."
                onKeyDown={(e) => e.key === "Enter" && handleDisputeClose()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDisputeOpen(false)
                setDisputeReason("")
              }}
            >
              Hủy
            </Button>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={handleDisputeClose}
            >
              Gửi phản đối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
