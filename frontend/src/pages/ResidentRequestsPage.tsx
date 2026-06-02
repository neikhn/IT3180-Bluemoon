import { useState, useEffect } from "react"
import { api } from "../lib/axios"
import { toast } from "sonner"
import { Card } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
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
import { UserPlus, UserMinus, UserCog, Check, X, Eye, Clock } from "lucide-react"

const STATUS_MAP: Record<string, { label: string, variant: any, icon: any }> = {
  pending: { label: "Chờ duyệt", variant: "secondary", icon: Clock },
  approved: { label: "Đã duyệt", variant: "default", icon: Check },
  rejected: { label: "Từ chối", variant: "destructive", icon: X },
}

const TYPE_MAP: Record<string, { label: string, icon: any, color: string }> = {
  add: { label: "Thêm mới", icon: UserPlus, color: "text-green-600" },
  update: { label: "Sửa thông tin", icon: UserCog, color: "text-blue-600" },
  delete: { label: "Xóa/Rời đi", icon: UserMinus, color: "text-red-600" },
}

export default function ResidentRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [adminNote, setAdminNote] = useState("")

  const fetchData = async () => {
    try {
      const res = await api.get("/resident-requests")
      setRequests(res.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch {
      toast.error("Lỗi lấy dữ liệu yêu cầu.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleReview = async (status: "approved" | "rejected") => {
    try {
      await api.patch(`/resident-requests/${selected._id}/review`, {
        status,
        admin_note: adminNote
      })
      toast.success(status === "approved" ? "Đã phê duyệt!" : "Đã từ chối yêu cầu.")
      setSelected(null)
      setAdminNote("")
      fetchData()
    } catch {
      toast.error("Lỗi xử lý yêu cầu.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Duyệt thay đổi nhân khẩu</h2>
          <p className="text-muted-foreground text-sm">Xem xét và phê duyệt các yêu cầu thêm/sửa/xóa nhân khẩu từ cư dân.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden rounded-xl bg-card/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">Ngày gửi</th>
                <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">Loại yêu cầu</th>
                <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">Căn hộ</th>
                <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">Trạng thái</th>
                <th className="p-4 text-center font-bold text-xs uppercase text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((__, j) => (
                      <td key={j} className="p-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-muted-foreground italic">Không có yêu cầu nào.</td>
                </tr>
              ) : (
                requests.map((req) => {
                  const type = TYPE_MAP[req.request_type] || { label: req.request_type, icon: UserCog, color: "" }
                  const status = STATUS_MAP[req.status] || STATUS_MAP.pending
                  const Icon = type.icon
                  const StatusIcon = status.icon
                  return (
                    <tr key={req._id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString("vi-VN")}</td>
                      <td className="p-4">
                        <div className={`flex items-center gap-2 font-bold ${type.color}`}>
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-xs">{req.apartment_number || req.apartment_id}</td>
                      <td className="p-4">
                        <Badge variant={status.variant} className="gap-1 text-[10px] uppercase font-bold px-2">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={() => setSelected(req)}>
                          <Eye className="h-4 w-4" /> Xem chi tiết
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Chi tiết yêu cầu {selected?.request_type === 'add' ? 'thêm mới' : selected?.request_type === 'update' ? 'sửa' : 'xóa'} nhân khẩu
            </DialogTitle>
          </DialogHeader>
          
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <Label className="text-[10px] uppercase text-muted-foreground">Loại yêu cầu</Label>
                  <p className="font-bold text-sm">{TYPE_MAP[selected.request_type]?.label}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <Label className="text-[10px] uppercase text-muted-foreground">Căn hộ</Label>
                  <p className="font-bold text-sm">{selected.apartment_number || selected.apartment_id}</p>
                </div>
              </div>

              {(selected.request_type === "delete" || selected.request_type === "update") && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  selected.request_type === "delete" 
                    ? "bg-red-50 dark:bg-red-950/20 border-red-200/50" 
                    : "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200/30"
                }`}>
                  <Label className={`text-xs font-bold uppercase ${
                    selected.request_type === "delete" ? "text-red-600" : "text-blue-600"
                  }`}>
                    {selected.request_type === "delete" ? "Nhân khẩu cần xóa/dời đi" : "Nhân khẩu cần sửa đổi"}
                  </Label>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Họ tên nhân khẩu:</p>
                    <p className="font-bold text-right">{selected.target_resident_name || "Chưa rõ"}</p>
                    <p className="text-muted-foreground">SĐT liên hệ:</p>
                    <p className="font-bold text-right">{selected.target_resident_phone || "Chưa rõ"}</p>
                  </div>
                </div>
              )}

              {selected.proposed_data && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                  <Label className="text-xs font-bold text-primary uppercase">
                    {selected.request_type === "add" ? "Thông tin đề xuất thêm mới" : "Thông tin đề xuất chỉnh sửa"}
                  </Label>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <p className="text-muted-foreground">Họ tên:</p>
                    <p className="font-bold text-right">{selected.proposed_data.full_name}</p>
                    <p className="text-muted-foreground">CCCD:</p>
                    <p className="font-bold text-right">{selected.proposed_data.identity_card}</p>
                    <p className="text-muted-foreground">SĐT:</p>
                    <p className="font-bold text-right">{selected.proposed_data.phone_number}</p>
                    <p className="text-muted-foreground">Quan hệ:</p>
                    <p className="font-bold text-right">{selected.proposed_data.relationship}</p>
                  </div>
                </div>
              )}

              {selected.status === "pending" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase ml-1">Ghi chú cho cư dân</Label>
                  <Input 
                    placeholder="VD: Thông tin CCCD không rõ, vui lòng gửi lại..." 
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
              )}

              {selected.admin_note && selected.status !== "pending" && (
                <div className="p-3 bg-muted rounded-lg border italic text-sm">
                  <span className="font-bold not-italic">Ghi chú Admin: </span> {selected.admin_note}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selected?.status === "pending" ? (
              <>
                <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReview("rejected")}>
                  <X className="h-4 w-4 mr-1" /> Từ chối
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleReview("approved")}>
                  <Check className="h-4 w-4 mr-1" /> Phê duyệt
                </Button>
              </>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setSelected(null)}>Đóng</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
