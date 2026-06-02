import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
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
} from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Skeleton } from "../components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { extractErrorMessage } from "../lib/utils"
import { getStoredUser } from "../lib/auth"
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
  UserPlus,
  UserMinus,
  UserCog,
  Check,
  X,
} from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  vehicle_registration: "Đăng ký PT",
  household_change: "Nhân khẩu",
  technical: "Kỹ thuật",
  hygiene: "Vệ sinh",
  security: "An ninh",
  noise: "Tiếng ồn",
  other: "Khác",
}

const STATUS_CONFIG: Record<string, { label: string; variant: any; icon: any; priority: number }> = {
  open: { label: "Mới", variant: "destructive", icon: Inbox, priority: 0 },
  processing: { label: "Đang xử lý", variant: "secondary", icon: Clock, priority: 1 },
  pending_close: { label: "Chờ đóng", variant: "outline", icon: MinusCircle, priority: 2 },
  closed: { label: "Đã đóng", variant: "default", icon: CheckCircle2, priority: 3 },
  rejected: { label: "Từ chối", variant: "destructive", icon: XCircle, priority: 4 },
}

// Resident requests
const REQ_STATUS_MAP: Record<string, { label: string, variant: any, icon: any }> = {
  pending: { label: "Chờ duyệt", variant: "secondary", icon: Clock },
  approved: { label: "Đã duyệt", variant: "default", icon: Check },
  rejected: { label: "Từ chối", variant: "destructive", icon: X },
}

const REQ_TYPE_MAP: Record<string, { label: string, icon: any, color: string }> = {
  add: { label: "Thêm mới", icon: UserPlus, color: "text-green-600" },
  update: { label: "Sửa thông tin", icon: UserCog, color: "text-blue-600" },
  delete: { label: "Xóa/Rời đi", icon: UserMinus, color: "text-red-600" },
}

type SortKey = "ticket_code" | "category" | "title" | "author" | "status" | "created_at"

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [residents, setResidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [replyText, setReplyText] = useState("")

  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const [isDisputeOpen, setIsDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")

  const [search, setSearch] = useState("")
  const [showClosed, setShowClosed] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("all")

  // Resident requests
  const [residentRequests, setResidentRequests] = useState<any[]>([])
  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [adminNote, setAdminNote] = useState("")

  const ADMIN_ID = getStoredUser()?.id
  const navigate = useNavigate()

  const fetchData = async () => {
    try {
      const [tickRes, resRes, reqRes] = await Promise.all([
        api.get("/tickets"),
        api.get("/residents"),
        api.get("/resident-requests").catch(() => ({ data: [] })),
      ])
      setTickets(tickRes.data)
      setResidents(resRes.data)
      setResidentRequests(reqRes.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      if (selectedTicket) {
        const refreshed = tickRes.data.find((t: any) => t._id === selectedTicket._id)
        if (refreshed) setSelectedTicket(refreshed)
      }
    } catch {
      toast.error("Không thể tải danh sách ticket.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const getAuthorName = (id: string) =>
    residents.find((r) => r._id === id)?.full_name || "Cư dân"

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const filteredTickets = useMemo(() => {
    let list = tickets.filter((t) => {
      if (!showClosed && (t.status === "closed" || t.status === "rejected")) return false
      // Tab filter
      if (activeTab === "vehicle" && t.category !== "vehicle_registration") return false
      if (activeTab === "general" && t.category === "vehicle_registration") return false
      const q = search.toLowerCase()
      return (
        t.ticket_code?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        getAuthorName(t.resident_id).toLowerCase().includes(q)
      )
    })

    return [...list].sort((a, b) => {
      let va: any, vb: any
      switch (sortKey) {
        case "ticket_code":
          va = a.ticket_code || ""; vb = b.ticket_code || ""
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
        case "category":
          va = CATEGORY_LABELS[a.category] || a.category || ""
          vb = CATEGORY_LABELS[b.category] || b.category || ""
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
        case "title":
          va = a.title || ""; vb = b.title || ""
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
        case "author":
          va = getAuthorName(a.resident_id); vb = getAuthorName(b.resident_id)
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
        case "status":
          va = STATUS_CONFIG[a.status]?.priority ?? 99
          vb = STATUS_CONFIG[b.status]?.priority ?? 99
          return sortDir === "asc" ? va - vb : vb - va
        case "created_at":
        default:
          va = new Date(a.created_at).getTime()
          vb = new Date(b.created_at).getTime()
          return sortDir === "desc" ? vb - va : va - vb
      }
    })
  }, [tickets, residents, search, showClosed, sortDir, sortKey, activeTab])

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
      const res = await api.post(`/tickets/${selectedTicket._id}/approve`)
      if (selectedTicket.category === "vehicle_registration") {
        toast.success("Đã duyệt đăng ký phương tiện thành công!")
      } else if (selectedTicket.category === "household_change") {
        if (res.data.new_resident_id) {
          toast.success(`Đã duyệt! Chuyển sang tạo tài khoản cho ${res.data.new_resident_name}.`)
          setSelectedTicket(null)
          setTimeout(() => navigate(`/dashboard/accounts?new_resident=${res.data.new_resident_id}`), 500)
        } else {
          toast.success("Đã duyệt yêu cầu nhân khẩu!")
        }
      }
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi duyệt ticket."))
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Vui lòng nhập lý do từ chối."); return }
    try {
      await api.post(`/tickets/${selectedTicket._id}/reject`, { reason: rejectReason })
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
      await api.post(`/tickets/${selectedTicket._id}/request-close`, { requested_by: "admin" })
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
    if (!disputeReason.trim()) { toast.error("Vui lòng nhập lý do phản đối."); return }
    try {
      await api.post(`/tickets/${selectedTicket._id}/dispute-close`, { disputed_by: "admin", reason: disputeReason })
      toast.success("Đã phản đối yêu cầu đóng.")
      setIsDisputeOpen(false)
      setDisputeReason("")
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi phản đối đóng ticket."))
    }
  }

  const handleReviewRequest = async (status: "approved" | "rejected") => {
    try {
      await api.patch(`/resident-requests/${selectedReq._id}/review`, {
        status,
        admin_note: adminNote,
      })
      toast.success(status === "approved" ? "Đã phê duyệt!" : "Đã từ chối yêu cầu.")
      setSelectedReq(null)
      setAdminNote("")
      fetchData()
    } catch {
      toast.error("Lỗi xử lý yêu cầu.")
    }
  }

  const parseVehicleData = (description: string) => {
    try { return JSON.parse(description) } catch { return null }
  }

  const isVehicleTicket = selectedTicket?.category === "vehicle_registration"
  const isHouseholdTicket = selectedTicket?.category === "household_change"
  const isApprovable = isVehicleTicket || isHouseholdTicket
  const isPendingClose = selectedTicket?.status === "pending_close"
  const isActive = selectedTicket && !["closed", "rejected"].includes(selectedTicket.status)
  const adminCanAccept = isPendingClose && selectedTicket?.pending_close_by === "resident"

  const SortButton = ({ label, sortField }: { label: string; sortField: SortKey }) => (
    <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => toggleSort(sortField)}>
      {label} <ArrowUpDown className="h-3 w-3" />
    </Button>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ticket hỗ trợ</h2>
          <p className="text-muted-foreground">Quản lý phản ánh, yêu cầu đăng ký xe, và nhân khẩu.</p>
        </div>
        {loading ? (
          <Skeleton className="h-9 w-24 rounded-lg" />
        ) : (
          <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium">
            {filteredTickets.length} ticket
          </Badge>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="vehicle">Đăng ký xe</TabsTrigger>
          <TabsTrigger value="general">Yêu cầu chung</TabsTrigger>
          <TabsTrigger value="requests">Duyệt nhân khẩu</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Resident Requests Tab */}
      {activeTab === "requests" ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-medium">Yêu cầu thay đổi nhân khẩu từ cư dân</h3>
              <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">{residentRequests.length} yêu cầu</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Ngày gửi</TableHead>
                  <TableHead>Loại yêu cầu</TableHead>
                  <TableHead>Căn hộ</TableHead>
                  <TableHead>Người gửi</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : residentRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">Chưa có yêu cầu nào.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  residentRequests.map((req) => {
                    const type = REQ_TYPE_MAP[req.request_type] || { label: req.request_type, icon: UserCog, color: "" }
                    const status = REQ_STATUS_MAP[req.status] || REQ_STATUS_MAP.pending
                    const Icon = type.icon
                    const StatusIcon = status.icon
                    const submitter = residents.find((r) => r._id === req.submitted_by)
                    return (
                      <TableRow
                        key={req._id}
                        className="cursor-pointer transition-all hover:bg-muted/40"
                        onClick={() => setSelectedReq(req)}
                      >
                        <TableCell className="pl-5 text-sm text-muted-foreground">{new Date(req.created_at).toLocaleDateString("vi-VN")}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-2 font-medium ${type.color}`}>
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-primary font-medium">{req.apartment_number || req.apartment_id}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{submitter?.full_name || "Cư dân"}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="flex w-fit items-center gap-1.5">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Ticket Table */
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 bg-background/80"
                  placeholder="Tìm theo mã, tiêu đề, người gửi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 transition-all"
                onClick={() => setShowClosed(v => !v)}
              >
                {showClosed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showClosed ? "Ẩn đã đóng" : "Hiện đã đóng"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5"><SortButton label="Mã Ticket" sortField="ticket_code" /></TableHead>
                  <TableHead><SortButton label="Phân loại" sortField="category" /></TableHead>
                  <TableHead className="w-[30%]"><SortButton label="Tiêu đề" sortField="title" /></TableHead>
                  <TableHead><SortButton label="Người gửi" sortField="author" /></TableHead>
                  <TableHead><SortButton label="Trạng thái" sortField="status" /></TableHead>
                  <TableHead className="pr-5 text-right"><SortButton label="Ngày gửi" sortField="created_at" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5"><Skeleton className="h-4 w-20 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full max-w-[180px] rounded" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell className="pr-5"><Skeleton className="ml-auto h-8 w-8 rounded-lg" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">
                          {search ? "Không tìm thấy ticket nào." : "Chưa có ticket nào."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((t: any) => {
                    const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
                    const Icon = cfg.icon
                    return (
                      <TableRow
                        key={t._id}
                        className="cursor-pointer transition-all hover:bg-muted/40"
                        onClick={() => { setSelectedTicket(t); setReplyText("") }}
                      >
                        <TableCell className="pl-5 font-mono text-sm text-primary font-medium">
                          {t.ticket_code}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.category === "vehicle_registration" ? "default" : "secondary"} className="capitalize">
                            {CATEGORY_LABELS[t.category] || t.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{t.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getAuthorName(t.resident_id)}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="flex w-fit items-center gap-1.5">
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-5 text-right text-sm text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("vi-VN")}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-xl">
          <div className="shrink-0 border-b px-6 pt-5 pb-3">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <span className="font-mono text-primary">{selectedTicket?.ticket_code}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  gửi bởi {selectedTicket && getAuthorName(selectedTicket.resident_id)}
                </span>
              </DialogTitle>
            </DialogHeader>

            {isActive && (
              <div className="mt-3 flex flex-wrap gap-2">
                {isApprovable ? (
                  <>
                    <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
                      <ShieldCheck className="h-3.5 w-3.5" /> Duyệt
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setIsRejectOpen(true)}>
                      <XCircle className="h-3.5 w-3.5" /> Từ chối
                    </Button>
                  </>
                ) : isPendingClose ? (
                  adminCanAccept ? (
                    <>
                      <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={handleAcceptClose}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đồng ý đóng
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-600" onClick={() => setIsDisputeOpen(true)}>
                        <XCircle className="h-3.5 w-3.5" /> Phản đối
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="px-3 py-1.5 text-xs">
                      ⏳ Đang chờ cư dân xác nhận đóng
                    </Badge>
                  )
                ) : (
                  <Button size="sm" variant="outline" className="gap-1.5 text-muted-foreground" onClick={handleRequestClose}>
                    <MinusCircle className="h-3.5 w-3.5" /> Yêu cầu đóng
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {CATEGORY_LABELS[selectedTicket?.category] || selectedTicket?.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedTicket && new Date(selectedTicket.created_at).toLocaleString("vi-VN")}
                </span>
              </div>
              <h3 className="mb-2 text-base font-bold">{selectedTicket?.title}</h3>

              {isVehicleTicket ? (
                (() => {
                  const vd = parseVehicleData(selectedTicket?.description || "")
                  return vd ? (
                    <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Biển số</span>
                        <span className="font-mono font-bold tracking-widest">{vd.license_plate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tên phương tiện</span>
                        <span className="font-medium">{vd.vehicle_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Phân loại</span>
                        <Badge variant="outline">{vd.vehicle_type === "car" ? "Ô tô" : "Xe máy"}</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-muted p-4 text-sm">{selectedTicket?.description}</p>
                  )
                })()
              ) : isHouseholdTicket ? (
                (() => {
                  const hd = parseVehicleData(selectedTicket?.description || "")
                  if (!hd) return <p className="rounded-lg bg-muted p-4 text-sm">{selectedTicket?.description}</p>

                  const RELATIONSHIP_LABELS: Record<string, string> = {
                    owner: "Chủ hộ", family: "Người thân", tenant: "Người thuê"
                  }
                  const HH_STATUS_LABELS: Record<string, string> = {
                    registered: "Thường trú", temporary: "Tạm trú", temporary_absent: "Tạm vắng"
                  }

                  if (hd.request_type === "add_member") {
                    return (
                      <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Yêu cầu thêm nhân khẩu mới</p>
                        {[
                          ["Họ tên", hd.full_name],
                          ["CCCD", hd.identity_card],
                          ["SĐT", hd.phone_number],
                          ["Ngày sinh", hd.date_of_birth ? new Date(hd.date_of_birth).toLocaleDateString("vi-VN") : ""],
                          ["Quan hệ", RELATIONSHIP_LABELS[hd.relationship] || hd.relationship],
                          hd.email ? ["Email", hd.email] : null,
                        ].filter(Boolean).map(([label, value]: any) => (
                          <div key={label} className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground shrink-0">{label}</span>
                            <span className="font-medium text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  } else {
                    return (
                      <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Yêu cầu thay đổi trạng thái cư trú</p>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Trạng thái mới</span>
                          <Badge variant="outline">{HH_STATUS_LABELS[hd.new_status] || hd.new_status}</Badge>
                        </div>
                      </div>
                    )
                  }
                })()
              ) : (
                <p className="rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed">{selectedTicket?.description}</p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Lịch sử hội thoại</p>
              {selectedTicket?.responses?.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Chưa có phản hồi nào.</p>
              )}
              {selectedTicket?.responses?.map((r: any, idx: number) => {
                const isSystem = r.sender_role === "system"
                const isAdmin = r.sender_role === "admin"
                return (
                  <div key={idx} className={`flex ${isAdmin ? "justify-end" : isSystem ? "justify-center" : "justify-start"}`}>
                    {isSystem ? (
                      <div className="max-w-[90%] rounded-full border bg-muted px-3 py-1.5 text-center text-xs text-muted-foreground">{r.message}</div>
                    ) : (
                      <div className={`max-w-[80%] rounded-xl p-3 text-sm ${isAdmin ? "rounded-tr-2xl bg-primary text-primary-foreground" : "rounded-tl-2xl border bg-muted"}`}>
                        <div className="mb-1 text-[10px] font-bold tracking-wider uppercase opacity-60">
                          {isAdmin ? "Ban quản lý" : "Cư dân"}
                        </div>
                        {r.message}
                        <div className="mt-1 text-[10px] opacity-50">{new Date(r.created_at).toLocaleString("vi-VN")}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {isActive && !isPendingClose && !isVehicleTicket ? (
            <div className="flex shrink-0 gap-2 border-t bg-muted/10 p-4">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập phản hồi cho cư dân..."
                className="rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
              />
              <Button onClick={handleReply} disabled={!replyText.trim()} className="rounded-xl px-4">Gửi</Button>
            </div>
          ) : !isActive ? (
            <div className={`shrink-0 border-t p-3 text-center text-xs ${selectedTicket?.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted/30 text-muted-foreground"}`}>
              {selectedTicket?.status === "rejected" ? "❌ Ticket này đã bị từ chối." : "✅ Ticket này đã được đóng — vấn đề đã giải quyết."}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Từ chối yêu cầu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground">Vui lòng nêu lý do từ chối để cư dân được thông báo.</p>
            <div className="space-y-1">
              <Label>Lý do từ chối</Label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="VD: Biển số không đúng định dạng..." onKeyDown={(e) => e.key === "Enter" && handleReject()} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsRejectOpen(false); setRejectReason("") }} className="rounded-xl">Hủy</Button>
            <Button variant="destructive" onClick={handleReject} className="rounded-xl">Xác nhận từ chối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-600">Phản đối đóng ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground">Nêu lý do bạn chưa đồng ý đóng ticket này.</p>
            <div className="space-y-1">
              <Label>Lý do phản đối</Label>
              <Input value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="VD: Vấn đề vẫn chưa được giải quyết..." onKeyDown={(e) => e.key === "Enter" && handleDisputeClose()} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsDisputeOpen(false); setDisputeReason("") }} className="rounded-xl">Hủy</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl" onClick={handleDisputeClose}>Gửi phản đối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resident Request Detail Dialog */}
      <Dialog open={!!selectedReq} onOpenChange={(o) => !o && setSelectedReq(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Chi tiết yêu cầu {selectedReq?.request_type === 'add' ? 'thêm mới' : selectedReq?.request_type === 'update' ? 'sửa' : 'xóa'} nhân khẩu
            </DialogTitle>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <Label className="text-[10px] uppercase text-muted-foreground">Loại yêu cầu</Label>
                  <p className="font-bold text-sm">{REQ_TYPE_MAP[selectedReq.request_type]?.label}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <Label className="text-[10px] uppercase text-muted-foreground">Căn hộ</Label>
                  <p className="font-bold text-sm">{selectedReq.apartment_number || selectedReq.apartment_id}</p>
                </div>
              </div>

              {(selectedReq.request_type === "delete" || selectedReq.request_type === "update") && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  selectedReq.request_type === "delete"
                    ? "bg-red-50 dark:bg-red-950/20 border-red-200/50"
                    : "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200/30"
                }`}>
                  <Label className={`text-xs font-bold uppercase ${
                    selectedReq.request_type === "delete" ? "text-red-600" : "text-blue-600"
                  }`}>
                    {selectedReq.request_type === "delete" ? "Nhân khẩu cần xóa/dời đi" : "Nhân khẩu cần sửa đổi"}
                  </Label>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Họ tên nhân khẩu:</p>
                    <p className="font-bold text-right">{selectedReq.target_resident_name || "Chưa rõ"}</p>
                    <p className="text-muted-foreground">SĐT liên hệ:</p>
                    <p className="font-bold text-right">{selectedReq.target_resident_phone || "Chưa rõ"}</p>
                  </div>
                </div>
              )}

              {selectedReq.proposed_data && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                  <Label className="text-xs font-bold text-primary uppercase">
                    {selectedReq.request_type === "add" ? "Thông tin đề xuất thêm mới" : "Thông tin đề xuất chỉnh sửa"}
                  </Label>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Họ tên:</p>
                    <p className="font-bold text-right">{selectedReq.proposed_data.full_name}</p>
                    <p className="text-muted-foreground">CCCD:</p>
                    <p className="font-bold text-right">{selectedReq.proposed_data.identity_card}</p>
                    <p className="text-muted-foreground">SĐT:</p>
                    <p className="font-bold text-right">{selectedReq.proposed_data.phone_number}</p>
                    <p className="text-muted-foreground">Quan hệ:</p>
                    <p className="font-bold text-right">{selectedReq.proposed_data.relationship === "family" ? "Người thân" : selectedReq.proposed_data.relationship === "tenant" ? "Người thuê" : selectedReq.proposed_data.relationship === "owner" ? "Chủ hộ" : selectedReq.proposed_data.relationship}</p>
                  </div>
                </div>
              )}

              {selectedReq.status === "pending" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase ml-1">Ghi chú cho cư dân</Label>
                  <Input
                    placeholder="VD: Thông tin CCCD không rõ, vui lòng gửi lại..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              )}

              {selectedReq.admin_note && selectedReq.status !== "pending" && (
                <div className="p-3 bg-muted rounded-lg border italic text-sm">
                  <span className="font-bold not-italic">Ghi chú Admin: </span> {selectedReq.admin_note}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedReq?.status === "pending" ? (
              <>
                <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReviewRequest("rejected")}>
                  <X className="h-4 w-4 mr-1" /> Từ chối
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleReviewRequest("approved")}>
                  <Check className="h-4 w-4 mr-1" /> Phê duyệt
                </Button>
              </>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setSelectedReq(null)}>Đóng</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}