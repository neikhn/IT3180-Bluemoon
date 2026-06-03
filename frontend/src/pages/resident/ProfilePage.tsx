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
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { AlertCircle, Save, Users, Building2, Car, Bike, Plus, Loader2, User, UserPlus, UserMinus } from "lucide-react"
import { getStoredUser } from "../../lib/auth"
import { extractErrorMessage } from "../../lib/utils"
import { ImageDropZone } from "../../components/ui/ImageDropZone"

const STATUS_LABELS: Record<string, string> = {
  permanent: "Thường trú",
  temporary: "Tạm trú",
  temporary_absent: "Tạm vắng",
}

const RELATION_LABELS: Record<string, string> = {
  owner: "Chủ hộ",
  family: "Người thân",
  tenant: "Người thuê",
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  motorbike: "Xe máy",
  car: "Ô tô",
}

const PLATE_REGEX = /^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3,4}\.?[0-9]{2}$/
const VEHICLE_NAME_REGEX = /^.+\s.+\s(19|20)\d{2}(\s.+)?$/

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<any>(null)
  const [myApt, setMyApt] = useState<any>(null)
  const [allResidents, setAllResidents] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("profile")

  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [phoneError, setPhoneError] = useState("")

  // Vehicle registration
  const [isVehOpen, setIsVehOpen] = useState(false)
  const [vehForm, setVehForm] = useState({ license_plate: "", vehicle_type: "motorbike", vehicle_name: "" })
  const [vehErrors, setVehErrors] = useState<Record<string, string>>({})

  // Member change requests
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [memberAction, setMemberAction] = useState<"add" | "remove">("add")
  const [memberForm, setMemberForm] = useState({
    full_name: "", identity_card: "", phone_number: "", date_of_birth: "",
    relationship: "family", email: "", cccd_front_base64: "", cccd_back_base64: ""
  })
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({})
  const [removeMemberId, setRemoveMemberId] = useState("")

  const user = getStoredUser()

  const fetchData = async () => {
    try {
      if (!user?.resident_id) { setLoading(false); return }
      const [resRes, aptRes, vehRes] = await Promise.all([
        api.get("/residents"),
        api.get("/apartments"),
        api.get("/vehicles"),
      ])
      setAllResidents(resRes.data)
      const resident = resRes.data.find((r: any) => r._id === user.resident_id)
      if (!resident) { setLoading(false); return }
      setMe(resident)
      setEditPhone(resident.phone_number)
      setEditEmail(resident.email || "")

      const apt = aptRes.data.find((a: any) =>
        a.current_residents?.some(
          (cr: any) => cr.resident_id === user.resident_id && cr.status === "living"
        )
      )
      setMyApt(apt)
      if (apt) {
        setVehicles(vehRes.data.filter((v: any) => v.apartment_id === apt._id))
      }
    } catch {
      toast.error("Không thể tải thông tin cá nhân.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSaveContact = async () => {
    if (!me) return
    const phonePattern = /^0[0-9]{9}$/
    if (!phonePattern.test(editPhone)) {
      setPhoneError("Số điện thoại không hợp lệ. VD: 0912345678")
      return
    }
    setPhoneError("")
    try {
      await api.patch(`/residents/${me._id}`, { phone_number: editPhone, email: editEmail })
      toast.success("Cập nhật thông tin liên hệ thành công!")
      const res = await api.get(`/residents/${me._id}`)
      setMe(res.data)
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi cập nhật thông tin."))
    }
  }

  const handleVehicleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.resident_id || !myApt) return
    const errs: Record<string, string> = {}
    const plate = vehForm.license_plate.toUpperCase().replace(" ", "")
    if (!PLATE_REGEX.test(plate)) errs.license_plate = "Biển số không đúng định dạng. VD: 30A-123.45"
    if (!VEHICLE_NAME_REGEX.test(vehForm.vehicle_name)) errs.vehicle_name = "Tên cần theo định dạng: Hãng + Model + Năm + Màu. VD: Honda Wave RSX 2020 Đỏ"
    setVehErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      await api.post("/tickets", {
        resident_id: user.resident_id, apartment_id: myApt._id,
        category: "vehicle_registration",
        title: `Đăng ký phương tiện: ${vehForm.vehicle_name} (${plate})`,
        description: JSON.stringify({ ...vehForm, license_plate: plate }),
      })
      setIsVehOpen(false)
      setVehForm({ license_plate: "", vehicle_type: "motorbike", vehicle_name: "" })
      setVehErrors({})
      toast.success("Đã gửi yêu cầu đăng ký phương tiện!")
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi gửi yêu cầu."))
    }
  }

  const handleMemberRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.resident_id || !myApt) return
    
    if (memberAction === "add") {
      const errs: Record<string, string> = {}
      if (!memberForm.full_name || memberForm.full_name.trim().split(" ").length < 2) {
        errs.full_name = "Vui lòng nhập đầy đủ họ tên (ít nhất 2 từ)."
      }
      if (!/^[0-9]{12}$/.test(memberForm.identity_card)) {
        errs.identity_card = "CCCD/CMND phải đúng 12 chữ số."
      }
      if (!/^0[0-9]{9}$/.test(memberForm.phone_number)) {
        errs.phone_number = "Số điện thoại không hợp lệ."
      }
      if (!memberForm.date_of_birth) {
        errs.date_of_birth = "Vui lòng chọn ngày sinh."
      } else if (new Date(memberForm.date_of_birth) > new Date()) {
        errs.date_of_birth = "Ngày sinh không hợp lệ."
      }
      setMemberErrors(errs)
      if (Object.keys(errs).length > 0) return
    }

    try {
      if (memberAction === "add") {
        await api.post("/resident-requests", {
          apartment_id: myApt._id,
          apartment_number: `${myApt.block}-${myApt.apartment_number}`,
          submitted_by: user.resident_id,
          request_type: "add",
          proposed_data: { ...memberForm },
        })
        toast.success("Đã gửi yêu cầu thêm thành viên!")
      } else {
        const target = housemates.find((h: any) => h._id === removeMemberId)
        await api.post("/resident-requests", {
          apartment_id: myApt._id,
          apartment_number: `${myApt.block}-${myApt.apartment_number}`,
          submitted_by: user.resident_id,
          request_type: "delete",
          target_resident_id: removeMemberId,
          target_resident_name: target?.full_name || "",
          target_resident_phone: target?.phone_number || "",
        })
        toast.success("Đã gửi yêu cầu xóa thành viên!")
      }
      setIsMemberDialogOpen(false)
      setMemberForm({ full_name: "", identity_card: "", phone_number: "", date_of_birth: "", relationship: "family", email: "", cccd_front_base64: "", cccd_back_base64: "" })
      setMemberErrors({})
      setRemoveMemberId("")
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi gửi yêu cầu."))
    }
  }

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" /> {msg}
      </p>
    ) : null

  const housemates = myApt
    ? myApt.current_residents
        ?.filter((cr: any) => cr.status === "living")
        .map((cr: any) => {
          const res = allResidents.find((r) => r._id === cr.resident_id)
          return res ? { ...res, relationship: cr.relationship } : null
        })
        .filter(Boolean)
    : []

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
      <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
    </div>
  )
  if (!me) return (
    <div className="py-10 text-center text-muted-foreground">Không tìm thấy thông tin cư dân.</div>
  )

  return (
    <div className="animate-in space-y-5 duration-300 fade-in pb-4">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Hồ sơ</TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Thành viên</TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-1.5 text-xs"><Car className="h-3.5 w-3.5" /> Phương tiện</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ═══════════════ TAB: Hồ sơ ═══════════════ */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          {/* Identity */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thông tin định danh</CardTitle>
              <CardDescription>Liên hệ ban quản lý để thay đổi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ["Họ và tên", me.full_name, "font-semibold"],
                ["CCCD", me.identity_card, "rounded bg-muted px-2 py-0.5 font-mono text-xs"],
                ["Ngày sinh", new Date(me.date_of_birth).toLocaleDateString("vi-VN")],
              ].map(([label, value, cls]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cls as string || ""}>{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Căn hộ</span>
                <Badge variant="secondary" className="font-mono">{myApt ? `${myApt.block}-${myApt.apartment_number}` : "—"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trạng thái cư trú</span>
                <Badge variant="outline" className="text-xs">{STATUS_LABELS[me.temporary_residence_status] || me.temporary_residence_status}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Apartment Info */}
          {myApt && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" /> Thông tin căn hộ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Block", myApt.block],
                    ["Số phòng", myApt.apartment_number],
                    ["Tầng", myApt.floor],
                    ["Diện tích", `${myApt.area_sqm} m²`],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
                      <p className="mt-1 font-mono font-bold text-primary">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Edit */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thông tin liên hệ</CardTitle>
              <CardDescription>Bạn có thể tự cập nhật số điện thoại và email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Số điện thoại</Label>
                <Input value={editPhone} onChange={(e) => { setEditPhone(e.target.value); setPhoneError("") }} placeholder="0912345678" className={phoneError ? "border-destructive" : ""} />
                <FieldError msg={phoneError} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Email</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <Button onClick={handleSaveContact} className="w-full"><Save className="mr-2 h-4 w-4" /> Lưu thay đổi</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════ TAB: Thành viên ═══════════════ */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Nhân khẩu trong hộ</h3>
              <p className="text-xs text-muted-foreground">{myApt ? `Căn hộ ${myApt.block}-${myApt.apartment_number}` : ""} · {housemates.length} người</p>
            </div>
            {myApt && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => { setMemberAction("remove"); setRemoveMemberId(""); setIsMemberDialogOpen(true) }}>
                  <UserMinus className="h-3.5 w-3.5" /> Xóa
                </Button>
                <Button size="sm" className="gap-1 h-8 text-xs" onClick={() => { setMemberAction("add"); setIsMemberDialogOpen(true) }}>
                  <UserPlus className="h-3.5 w-3.5" /> Thêm
                </Button>
              </div>
            )}
          </div>

          {housemates.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Chưa có thành viên nào.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {housemates.map((h: any) => (
                <Card key={h._id} className={`shadow-sm ${h._id === me._id ? "border-primary/20 bg-primary/[0.02]" : ""}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${h._id === me._id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {h.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {h.full_name}
                          {h._id === me._id && <span className="ml-1.5 text-[10px] text-primary font-normal">(bạn)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{h.phone_number}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {RELATION_LABELS[h.relationship] || h.relationship}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center px-4">
            Yêu cầu thêm/xóa thành viên sẽ được gửi tới ban quản lý để duyệt.
          </p>
        </div>
      )}

      {/* ═══════════════ TAB: Phương tiện ═══════════════ */}
      {activeTab === "vehicles" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Phương tiện đã đăng ký</h3>
              <p className="text-xs text-muted-foreground">{myApt ? `Căn hộ ${myApt.block}-${myApt.apartment_number}` : ""} · {vehicles.length} phương tiện</p>
            </div>
            {myApt && (
              <Button size="sm" className="gap-1 h-8 text-xs" onClick={() => { setVehErrors({}); setIsVehOpen(true) }}>
                <Plus className="h-3.5 w-3.5" /> Đăng ký
              </Button>
            )}
          </div>

          {!myApt ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm"><Car className="mx-auto h-8 w-8 opacity-20 mb-2" /> Bạn chưa được gắn vào căn hộ nào.</CardContent></Card>
          ) : vehicles.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm"><Car className="mx-auto h-8 w-8 opacity-20 mb-2" /> Chưa có phương tiện nào.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {vehicles.map((v: any) => {
                const owner = allResidents.find((r) => r._id === v.resident_id)
                return (
                  <Card key={v._id} className="shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${v.vehicle_type === "car" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}>
                          {v.vehicle_type === "car" ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-mono font-bold tracking-wider text-primary text-sm">{v.license_plate}</p>
                          <p className="text-[10px] text-muted-foreground">{v.vehicle_name || "Không có tên"}{owner ? ` · ${owner.full_name}` : ""}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}</Badge>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center px-4">
            Yêu cầu đăng ký phương tiện sẽ được gửi tới ban quản lý để duyệt.
          </p>
        </div>
      )}

      {/* Vehicle Register Dialog */}
      <Dialog open={isVehOpen} onOpenChange={setIsVehOpen}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg"><Car className="h-5 w-5 text-primary" /> Đăng ký phương tiện</DialogTitle></DialogHeader>
          <form onSubmit={handleVehicleRegister} className="space-y-4 pt-2" noValidate>
            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Biển số đăng ký</Label>
              <Input required value={vehForm.license_plate} onChange={(e) => { setVehForm({ ...vehForm, license_plate: e.target.value.toUpperCase() }); setVehErrors((p) => ({ ...p, license_plate: "" })) }} placeholder="VD: 30A-123.45" className={`bg-muted/50 font-mono ${vehErrors.license_plate ? "border-destructive" : ""}`} />
              <FieldError msg={vehErrors.license_plate} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Tên phương tiện <span className="ml-1 text-[10px] font-normal normal-case">(Hãng + Model + Năm + Màu)</span></Label>
              <Input required value={vehForm.vehicle_name} onChange={(e) => { setVehForm({ ...vehForm, vehicle_name: e.target.value }); setVehErrors((p) => ({ ...p, vehicle_name: "" })) }} placeholder="Honda Wave RSX 2020 Đỏ" className={`bg-muted/50 ${vehErrors.vehicle_name ? "border-destructive" : ""}`} />
              <FieldError msg={vehErrors.vehicle_name} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Phân loại</Label>
              <Select value={vehForm.vehicle_type} onValueChange={(v) => setVehForm({ ...vehForm, vehicle_type: v })}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="motorbike">Xe máy</SelectItem><SelectItem value="car">Ô tô</SelectItem></SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsVehOpen(false)}>Hủy</Button>
              <Button type="submit" className="flex-1 font-bold">Gửi yêu cầu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member Request Dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {memberAction === "add" ? <UserPlus className="h-5 w-5 text-primary" /> : <UserMinus className="h-5 w-5 text-destructive" />}
              {memberAction === "add" ? "Yêu cầu thêm thành viên" : "Yêu cầu xóa thành viên"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMemberRequest} className="space-y-4 pt-2" noValidate>
            {memberAction === "add" ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Họ tên</Label>
                  <Input required value={memberForm.full_name} onChange={(e) => { setMemberForm({ ...memberForm, full_name: e.target.value }); setMemberErrors(p => ({ ...p, full_name: "" })) }} placeholder="Nguyễn Văn A" className={memberErrors.full_name ? "border-destructive" : ""} />
                  <FieldError msg={memberErrors.full_name} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">CCCD</Label>
                    <Input required value={memberForm.identity_card} onChange={(e) => { setMemberForm({ ...memberForm, identity_card: e.target.value }); setMemberErrors(p => ({ ...p, identity_card: "" })) }} placeholder="079XXXXXXXXX" className={`font-mono ${memberErrors.identity_card ? "border-destructive" : ""}`} />
                    <FieldError msg={memberErrors.identity_card} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">SĐT</Label>
                    <Input required value={memberForm.phone_number} onChange={(e) => { setMemberForm({ ...memberForm, phone_number: e.target.value }); setMemberErrors(p => ({ ...p, phone_number: "" })) }} placeholder="0912345678" className={memberErrors.phone_number ? "border-destructive" : ""} />
                    <FieldError msg={memberErrors.phone_number} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Ngày sinh</Label>
                    <Input type="date" required value={memberForm.date_of_birth} onChange={(e) => { setMemberForm({ ...memberForm, date_of_birth: e.target.value }); setMemberErrors(p => ({ ...p, date_of_birth: "" })) }} className={memberErrors.date_of_birth ? "border-destructive" : ""} />
                    <FieldError msg={memberErrors.date_of_birth} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Email</Label>
                    <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="email@example.com" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Quan hệ</Label>
                  <Select value={memberForm.relationship} onValueChange={(v) => setMemberForm({ ...memberForm, relationship: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="family">Người thân</SelectItem><SelectItem value="tenant">Người thuê</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">CCCD Mặt trước</Label>
                    <ImageDropZone value={memberForm.cccd_front_base64} onChange={(v) => setMemberForm({ ...memberForm, cccd_front_base64: v })} label="Ảnh mặt trước" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">CCCD Mặt sau</Label>
                    <ImageDropZone value={memberForm.cccd_back_base64} onChange={(v) => setMemberForm({ ...memberForm, cccd_back_base64: v })} label="Ảnh mặt sau" />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Chọn thành viên cần xóa</Label>
                <Select value={removeMemberId} onValueChange={setRemoveMemberId}>
                  <SelectTrigger><SelectValue placeholder="Chọn thành viên..." /></SelectTrigger>
                  <SelectContent>
                    {housemates.filter((h: any) => h._id !== me._id).map((h: any) => (
                      <SelectItem key={h._id} value={h._id}>{h.full_name} · {RELATION_LABELS[h.relationship] || h.relationship}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsMemberDialogOpen(false)}>Hủy</Button>
              <Button type="submit" className={`flex-1 font-bold ${memberAction === "remove" ? "bg-destructive hover:bg-destructive/90" : ""}`} disabled={memberAction === "remove" && !removeMemberId}>
                {memberAction === "add" ? "Gửi yêu cầu thêm" : "Gửi yêu cầu xóa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
