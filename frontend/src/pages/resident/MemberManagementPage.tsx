import { useState, useEffect } from "react"
import { api } from "../../lib/axios"
import { toast } from "sonner"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog"
import { getStoredUser } from "../../lib/auth"
import { Users, UserPlus, History, Clock, Check, X, Trash2 } from "lucide-react"

export default function MemberManagementPage() {
  const [apartment, setApartment] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [isRequestOpen, setIsRequestOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [form, setForm] = useState({
    full_name: "",
    identity_card: "",
    phone_number: "",
    relationship: "tenant",
    date_of_birth: ""
  })

  const user = getStoredUser()

  const fetchData = async () => {
    try {
      // 1. Tìm căn hộ của cư dân này
      const aptRes = await api.get("/apartments")
      const myApt = aptRes.data.find((a: any) =>
        a.current_residents?.some((r: any) => r.resident_id === user?.resident_id && r.status === "living")
      )
      setApartment(myApt)

      // 2. Lấy danh sách yêu cầu (Trong thực tế cần endpoint filter theo requester_id)
      const reqRes = await api.get("/resident-requests")
      setRequests(reqRes.data.filter((r: any) => r.requester_resident_id === user?.resident_id || r.requester_resident_id === user?.id))
    } catch {
      toast.error("Lỗi lấy dữ liệu.")
    } finally {
      // Done
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmitRequest = async (type: "add" | "delete", targetId?: string) => {
    try {
      if (!apartment) return
      
      if (type === "add") {
        if (!form.full_name || !form.date_of_birth || !form.identity_card || !form.phone_number) {
          toast.error("Vui lòng điền đầy đủ các thông tin: Họ tên, Ngày sinh, CCCD, SĐT.")
          return
        }

        const cccdRegex = /^[0-9]{12}$/
        if (!cccdRegex.test(form.identity_card)) {
          toast.error("Số CCCD phải bao gồm đúng 12 chữ số.")
          return
        }

        const phoneRegex = /^0[0-9]{9}$/
        if (!phoneRegex.test(form.phone_number)) {
          toast.error("Số điện thoại phải bao gồm đúng 10 chữ số và bắt đầu bằng số 0.")
          return
        }
      }

      const payload = {
        apartment_id: apartment._id,
        request_type: type,
        target_resident_id: targetId,
        proposed_data: type === "add" ? form : null
      }

      await api.post("/resident-requests", payload)
      toast.success("Đã gửi yêu cầu tới Ban quản lý!")
      setIsRequestOpen(false)
      fetchData()
    } catch (e: any) {
      const msg = e.response?.data?.detail || "Lỗi gửi yêu cầu."
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Quản lý nhân khẩu</h2>
        <Users className="h-5 w-5 text-primary" />
      </div>

      {/* Current Members */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Thành viên hiện tại</Label>
          <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold gap-1 rounded-full border-primary/30 text-primary">
                <UserPlus className="h-3 w-3" /> THÊM NGƯỜI
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-auto w-[92vw] rounded-2xl">
              <DialogHeader>
                <DialogTitle>Đăng ký thêm nhân khẩu</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs uppercase">Họ và tên</Label>
                  <Input placeholder="Nguyễn Văn A" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase">Ngày sinh</Label>
                    <Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs uppercase">Quan hệ</Label>
                    <select className="w-full rounded-md border h-10 px-3 text-sm" value={form.relationship} onChange={e => setForm({...form, relationship: e.target.value})}>
                      <option value="tenant">Người thuê</option>
                      <option value="family">Người thân</option>
                      <option value="friend">Bạn bè</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase">Số CCCD (12 số)</Label>
                  <Input placeholder="001203..." value={form.identity_card} onChange={e => setForm({...form, identity_card: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase">Số điện thoại</Label>
                  <Input placeholder="098..." value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} />
                </div>
                <Button className="w-full mt-2" onClick={() => handleSubmitRequest("add")}>Gửi yêu cầu xét duyệt</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3">
          {apartment?.current_residents?.filter((r: any) => r.status === "living").map((res: any) => (
            <Card key={res.resident_id} className="border-0 shadow-sm bg-card/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {res.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{res.full_name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">{res.relationship}</p>
                  </div>
                </div>
                {res.resident_id !== user?.resident_id && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleSubmitRequest("delete", res.resident_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Request History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <History className="h-4 w-4 text-muted-foreground" />
          <Label className="text-xs font-bold uppercase text-muted-foreground">Lịch sử yêu cầu</Label>
        </div>
        
        <div className="space-y-2">
          {requests.length === 0 ? (
            <p className="text-xs text-center py-8 text-muted-foreground italic">Chưa có yêu cầu nào được gửi.</p>
          ) : (
            requests.map((req) => (
              <div 
                key={req._id} 
                onClick={() => setSelectedRequest(req)}
                className="p-3 rounded-xl border bg-muted/20 flex flex-col gap-2 cursor-pointer hover:bg-muted/40 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs font-bold">
                      {req.request_type === 'add' ? 'Thêm: ' : 'Xóa: '} 
                      {req.proposed_data?.full_name || 'Thành viên'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString("vi-VN")}</p>
                  </div>
                  <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'} className="text-[9px] h-5">
                    {req.status === 'pending' && <Clock className="h-2.5 w-2.5 mr-1" />}
                    {req.status === 'approved' && <Check className="h-2.5 w-2.5 mr-1" />}
                    {req.status === 'rejected' && <X className="h-2.5 w-2.5 mr-1" />}
                    {req.status === 'pending' ? 'ĐANG CHỜ' : req.status === 'approved' ? 'ĐÃ DUYỆT' : 'TỪ CHỐI'}
                  </Badge>
                </div>
                {req.admin_note && (
                  <div className="text-[10px] text-primary bg-primary/5 border border-primary/10 rounded px-2 py-1 font-medium mt-1 select-none">
                    <span className="font-bold">BQL phản hồi:</span> {req.admin_note}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dialog xem chi tiết yêu cầu */}
      <Dialog open={!!selectedRequest} onOpenChange={(o) => !o && setSelectedRequest(null)}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Chi tiết yêu cầu</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground text-xs uppercase">Loại yêu cầu</span>
                <span className="font-bold">{selectedRequest.request_type === "add" ? "Thêm nhân khẩu" : "Xóa nhân khẩu"}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground text-xs uppercase">Ngày gửi</span>
                <span>{new Date(selectedRequest.created_at).toLocaleDateString("vi-VN")}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-muted-foreground text-xs uppercase">Trạng thái</span>
                <Badge variant={selectedRequest.status === 'pending' ? 'secondary' : selectedRequest.status === 'approved' ? 'default' : 'destructive'} className="text-[10px] uppercase font-bold px-2 h-5">
                  {selectedRequest.status === 'pending' ? 'ĐANG CHỜ' : selectedRequest.status === 'approved' ? 'ĐÃ DUYỆT' : 'TỪ CHỐI'}
                </Badge>
              </div>

              {selectedRequest.proposed_data && (
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 mt-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Thông tin nhân khẩu</p>
                  <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <span className="text-muted-foreground">Họ và tên:</span>
                    <span className="font-bold text-right">{selectedRequest.proposed_data.full_name}</span>
                    <span className="text-muted-foreground">Ngày sinh:</span>
                    <span className="font-bold text-right">{selectedRequest.proposed_data.date_of_birth ? new Date(selectedRequest.proposed_data.date_of_birth).toLocaleDateString("vi-VN") : "—"}</span>
                    <span className="text-muted-foreground">CCCD:</span>
                    <span className="font-mono font-bold text-right">{selectedRequest.proposed_data.identity_card}</span>
                    <span className="text-muted-foreground">Số điện thoại:</span>
                    <span className="font-mono font-bold text-right">{selectedRequest.proposed_data.phone_number}</span>
                    <span className="text-muted-foreground">Quan hệ:</span>
                    <span className="font-bold text-right">
                      {selectedRequest.proposed_data.relationship === "family" ? "Người thân" : selectedRequest.proposed_data.relationship === "friend" ? "Bạn bè" : "Người thuê"}
                    </span>
                  </div>
                </div>
              )}

              {selectedRequest.admin_note && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-1 mt-2">
                  <p className="text-xs font-bold text-primary uppercase">Phản hồi từ Ban quản lý</p>
                  <p className="text-xs font-medium whitespace-pre-line">{selectedRequest.admin_note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
