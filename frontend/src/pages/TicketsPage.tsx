import { useState, useEffect, useMemo } from "react"
import { api } from "../lib/axios"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"

import { extractErrorMessage } from "../lib/utils"
import {
  Eye,
  CheckCircle2,
  Clock,
  Inbox,
  ShieldCheck,
  XCircle,
  MinusCircle,
  Search,
  EyeOff,
  ArrowUpDown,
} from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  vehicle_registration: "Đăng ký PT",
  technical: "Kỹ thuật",
  hygiene: "Vệ sinh",
  security: "An ninh",
  noise: "Tiếng ồn",
  other: "Khác",
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: any; icon: any }
> = {
  open: { label: "Mới", variant: "destructive", icon: Inbox },
  processing: { label: "Đang xử lý", variant: "secondary", icon: Clock },
  pending_close: { label: "Chờ đóng", variant: "outline", icon: MinusCircle },
  closed: { label: "Đã đóng", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Từ chối", variant: "destructive", icon: XCircle },
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [residents, setResidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [replyText, setReplyText] = useState("")

  // Reject dialog state
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  // Dispute dialog state
  const [isDisputeOpen, setIsDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")

  // Search + filter
  const [search, setSearch] = useState("")
  const [showClosed, setShowClosed] = useState(true)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const ADMIN_ID = "60f7a9b0c9e77c5c8e3b2e1a"

  const fetchData = async () => {
    try {
      const [tickRes, resRes] = await Promise.all([
        api.get("/tickets"),
        api.get("/residents"),
      ])
      setTickets(tickRes.data)
      setResidents(resRes.data)
      if (selectedTicket) {
        const refreshed = tickRes.data.find(
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
    fetchData()
  }, [])

  const getAuthorName = (id: string) =>
    residents.find((r) => r._id === id)?.full_name || "Cư dân"

  const filteredTickets = useMemo(() => {
    let list = tickets.filter((t) => {
      if (!showClosed && (t.status === "closed" || t.status === "rejected")) return false
      const q = search.toLowerCase()
      return (
        t.ticket_code?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        getAuthorName(t.resident_id).toLowerCase().includes(q)
      )
    })
    return [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return sortDir === "desc" ? db - da : da - db
    })
  }, [tickets, residents, search, showClosed, sortDir])

  const handleReply = async () => {
    if (!replyText.trim()) return
    try {
      await api.post(`/tickets/${selectedTicket._id}/reply`, {
        sender_role: "admin",
        sender_id: ADMIN_ID,
        message: replyText,
      })
      setReplyText("")
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi gửi phản hồi."))
    }
  }

  const handleApprove = async () => {
    try {
      await api.post(`/tickets/${selectedTicket._id}/approve`)
      toast.success("Đã duyệt đăng ký phương tiện thành công!")
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi duyệt ticket."))
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.")
      return
    }
    try {
      await api.post(`/tickets/${selectedTicket._id}/reject`, {
        reason: rejectReason,
      })
      toast.success("Đã từ chối yêu cầu.")
      setIsRejectOpen(false)
      setRejectReason("")
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi từ chối ticket."))
    }
  }

  const handleRequestClose = async () => {
    try {
      await api.post(`/tickets/${selectedTicket._id}/request-close`, {
        requested_by: "admin",
      })
      toast.success("Đã gửi yêu cầu đóng ticket.")
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi yêu cầu đóng ticket."))
    }
  }

  const handleAcceptClose = async () => {
    try {
      await api.post(`/tickets/${selectedTicket._id}/accept-close`)
      toast.success("Ticket đã được đóng.")
      fetchData()
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
        disputed_by: "admin",
        reason: disputeReason,
      })
      toast.success("Đã phản đối yêu cầu đóng.")
      setIsDisputeOpen(false)
      setDisputeReason("")
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi phản đối đóng ticket."))
    }
  }

  const parseVehicleData = (description: string) => {
    try {
      return JSON.parse(description)
    } catch {
      return null
    }
  }

  const isVehicleTicket = selectedTicket?.category === "vehicle_registration"
  const isPendingClose = selectedTicket?.status === "pending_close"
  const isActive =
    selectedTicket && !["closed", "rejected"].includes(selectedTicket.status)
  // Admin can accept if resident requested close
  const adminCanAccept =
    isPendingClose && selectedTicket?.pending_close_by === "resident"


  return (
    <div className="animate-in space-y-6 duration-500 fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quản lý Ticket Hỗ trợ</h2>
        <p className="text-muted-foreground">
          Quản lý phản ánh và yêu cầu của cư dân.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Ticket</CardTitle>
          <CardDescription>
            Tất cả yêu cầu từ cư dân, theo thứ tự mới nhất.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + filter toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Tìm theo mã, tiêu đề, người gửi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowClosed(v => !v)}
            >
              {showClosed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showClosed ? "Ẩn đã đóng" : "Hiện đã đóng"}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Mã Ticket</TableHead>
                  <TableHead>Phân loại</TableHead>
                  <TableHead className="w-[30%]">Tiêu đề</TableHead>
                  <TableHead>Người gửi</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
                      Ngày gửi <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {search ? "Không tìm thấy ticket nào." : "Chưa có ticket nào."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((t: any) => {
                    const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
                    const Icon = cfg.icon
                    return (
                      <TableRow key={t._id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm text-primary">
                          {t.ticket_code}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              t.category === "vehicle_registration"
                                ? "default"
                                : "secondary"
                            }
                            className="capitalize"
                          >
                          {CATEGORY_LABELS[t.category] || t.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {t.title}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getAuthorName(t.resident_id)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={cfg.variant}
                            className="flex w-fit items-center gap-1.5"
                          >
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTicket(t)
                              setReplyText("")
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog
        open={!!selectedTicket}
        onOpenChange={(o) => !o && setSelectedTicket(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-xl">
          {/* Header */}
          <div className="shrink-0 border-b px-6 pt-5 pb-3">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {selectedTicket?.ticket_code}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  gửi bởi{" "}
                  {selectedTicket && getAuthorName(selectedTicket.resident_id)}
                </span>
              </DialogTitle>
            </DialogHeader>

            {/* Action toolbar — below title, no overlap with X */}
            {isActive && (
              <div className="mt-3 flex flex-wrap gap-2">
                {isVehicleTicket ? (
                  // Vehicle registration: only Approve + Reject
                  <>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
                      onClick={handleApprove}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      onClick={() => setIsRejectOpen(true)}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Từ chối
                    </Button>
                  </>
                ) : isPendingClose ? (
                  // Pending close: admin can accept or dispute (only if resident requested)
                  adminCanAccept ? (
                    <>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
                        onClick={handleAcceptClose}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đồng ý đóng
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-amber-300 text-amber-600"
                        onClick={() => setIsDisputeOpen(true)}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Phản đối
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="px-3 py-1.5 text-xs">
                      ⏳ Đã gửi yêu cầu đóng, đang chờ cư dân xác nhận
                    </Badge>
                  )
                ) : (
                  // Normal ticket: admin can request close or reply
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-muted-foreground"
                    onClick={handleRequestClose}
                  >
                    <MinusCircle className="h-3.5 w-3.5" /> Yêu cầu đóng
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Body: description + responses */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
            {/* Description */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {selectedTicket?.category === "vehicle_registration"
                    ? "Đăng ký phương tiện"
                    : selectedTicket?.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedTicket &&
                    new Date(selectedTicket.created_at).toLocaleString("vi-VN")}
                </span>
              </div>
              <h3 className="mb-2 text-base font-bold">
                {selectedTicket?.title}
              </h3>

              {isVehicleTicket ? (
                (() => {
                  const vd = parseVehicleData(selectedTicket?.description || "")
                  return vd ? (
                    <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Biển số</span>
                        <span className="font-mono font-bold tracking-widest">
                          {vd.license_plate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Tên phương tiện
                        </span>
                        <span className="font-medium">{vd.vehicle_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Phân loại</span>
                        <Badge variant="outline">
                          {vd.vehicle_type === "car" ? "Ô tô" : "Xe máy"}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-muted p-4 text-sm">
                      {selectedTicket?.description}
                    </p>
                  )
                })()
              ) : (
                <p className="rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed">
                  {selectedTicket?.description}
                </p>
              )}
            </div>

            {/* Chat history */}
            <div className="space-y-3">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Lịch sử hội thoại
              </p>
              {selectedTicket?.responses?.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Chưa có phản hồi nào.
                </p>
              )}
              {selectedTicket?.responses?.map((r: any, idx: number) => {
                const isSystem = r.sender_role === "system"
                const isAdmin = r.sender_role === "admin"
                return (
                  <div
                    key={idx}
                    className={`flex ${isAdmin ? "justify-end" : isSystem ? "justify-center" : "justify-start"}`}
                  >
                    {isSystem ? (
                      <div className="max-w-[90%] rounded-full border bg-muted px-3 py-1.5 text-center text-xs text-muted-foreground">
                        {r.message}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[80%] rounded-lg p-3 text-sm ${isAdmin ? "rounded-tr-none bg-primary text-primary-foreground" : "rounded-tl-none border bg-muted"}`}
                      >
                        <div className="mb-1 text-[10px] font-bold tracking-wider uppercase opacity-60">
                          {isAdmin ? "Ban quản lý" : "Cư dân"}
                        </div>
                        {r.message}
                        <div className="mt-1 text-[10px] opacity-50">
                          {new Date(r.created_at).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reply box / status footer */}
          {isActive && !isPendingClose && !isVehicleTicket ? (
            <div className="flex shrink-0 gap-2 border-t bg-muted/10 p-4">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập phản hồi cho cư dân..."
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleReply()
                }
              />
              <Button onClick={handleReply} disabled={!replyText.trim()}>
                Gửi
              </Button>
            </div>
          ) : !isActive ? (
            <div
              className={`shrink-0 border-t p-3 text-center text-xs ${
                selectedTicket?.status === "rejected"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-green-50/50 text-muted-foreground dark:bg-green-950/20"
              }`}
            >
              {selectedTicket?.status === "rejected"
                ? "❌ Ticket này đã bị từ chối."
                : "✅ Ticket này đã được đóng — vấn đề đã giải quyết."}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Từ chối yêu cầu
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground">
              Vui lòng nêu lý do từ chối để cư dân được thông báo.
            </p>
            <div className="space-y-1">
              <Label>Lý do từ chối</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Biển số không đúng định dạng..."
                className={!rejectReason.trim() ? "" : ""}
                onKeyDown={(e) => e.key === "Enter" && handleReject()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectOpen(false)
                setRejectReason("")
              }}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Close Dialog */}
      <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-600">
              Phản đối đóng ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground">
              Nêu lý do bạn chưa đồng ý đóng ticket này. Cư dân sẽ thấy lý do
              trong hội thoại.
            </p>
            <div className="space-y-1">
              <Label>Lý do phản đối</Label>
              <Input
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="VD: Vấn đề vẫn chưa được giải quyết triệt để..."
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
