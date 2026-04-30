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
import { AlertCircle, Save, Car, Users, Building2, Layers } from "lucide-react"
import { getStoredUser } from "../../lib/auth"
import { extractErrorMessage } from "../../lib/utils"

const PLATE_REGEX = /^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3,4}\.?[0-9]{2}$/
const VEHICLE_NAME_REGEX = /^.+\s.+\s(19|20)\d{2}(\s.+)?$/

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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<any>(null)
  const [myApt, setMyApt] = useState<any>(null)
  const [allResidents, setAllResidents] = useState<any[]>([])
  const [aptVehicles, setAptVehicles] = useState<any[]>([])

  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [phoneError, setPhoneError] = useState("")

  const [isVehicleOpen, setIsVehicleOpen] = useState(false)
  const [vehForm, setVehForm] = useState({
    license_plate: "",
    vehicle_type: "motorbike",
    vehicle_name: "",
  })
  const [vehErrors, setVehErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function init() {
      try {
        const user = getStoredUser()
        if (!user?.resident_id) {
          setLoading(false)
          return
        }

        const [resRes, aptRes, vehRes] = await Promise.all([
          api.get("/residents"),
          api.get("/apartments"),
          api.get("/vehicles"),
        ])
        setAllResidents(resRes.data)

        const resident = resRes.data.find((r: any) => r._id === user.resident_id)
        if (!resident) {
          setLoading(false)
          return
        }
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
          const veh = vehRes.data.filter((v: any) => v.apartment_id === apt._id)
          setAptVehicles(veh)
        }
      } catch {
        toast.error("Không thể tải thông tin cá nhân.")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleSaveContact = async () => {
    if (!me) return
    const phonePattern = /^0[0-9]{9}$/
    if (!phonePattern.test(editPhone)) {
      setPhoneError("Số điện thoại không hợp lệ. VD: 0912345678")
      return
    }
    setPhoneError("")
    try {
      await api.patch(`/residents/${me._id}`, {
        phone_number: editPhone,
        email: editEmail,
      })
      toast.success("Cập nhật thông tin liên hệ thành công!")
      const res = await api.get(`/residents/${me._id}`)
      setMe(res.data)
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi cập nhật thông tin."))
    }
  }

  const handleVehicleTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!me || !myApt) return

    const errs: Record<string, string> = {}
    const sanitizedPlate = vehForm.license_plate.toUpperCase().replace(" ", "")
    if (!PLATE_REGEX.test(sanitizedPlate))
      errs.license_plate = "Biển số không đúng định dạng. VD: 30A-123.45"
    if (!VEHICLE_NAME_REGEX.test(vehForm.vehicle_name))
      errs.vehicle_name =
        "Tên cần theo định dạng: Hãng + Model + Năm + Màu. VD: Honda Wave RSX 2020 Đỏ"
    setVehErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      await api.post("/tickets", {
        resident_id: me._id,
        apartment_id: myApt._id,
        category: "vehicle_registration",
        title: `Đăng ký phương tiện: ${vehForm.vehicle_name} (${sanitizedPlate})`,
        description: JSON.stringify({
          ...vehForm,
          license_plate: sanitizedPlate,
        }),
      })
      setIsVehicleOpen(false)
      setVehForm({ license_plate: "", vehicle_type: "motorbike", vehicle_name: "" })
      setVehErrors({})
      toast.success("Đã gửi yêu cầu đăng ký! Ban quản lý sẽ duyệt sớm nhất có thể.")
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi gửi yêu cầu đăng ký."))
    }
  }

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        {msg}
      </p>
    ) : null

  // Residents living in the same apartment
  const housemates = myApt
    ? myApt.current_residents
        ?.filter((cr: any) => cr.status === "living")
        .map((cr: any) => {
          const res = allResidents.find((r) => r._id === cr.resident_id)
          return res ? { ...res, relationship: cr.relationship } : null
        })
        .filter(Boolean)
    : []

  if (loading)
    return (
      <div className="space-y-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  if (!me)
    return (
      <div className="py-10 text-center text-muted-foreground">
        Không tìm thấy thông tin cư dân.
      </div>
    )

  return (
    <div className="animate-in space-y-5 duration-300 fade-in">
      <h2 className="text-xl font-bold tracking-tight">Hồ sơ cá nhân</h2>

      {/* Identity Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin định danh</CardTitle>
          <CardDescription>
            Liên hệ ban quản lý để thay đổi thông tin này.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Họ và tên</span>
            <span className="font-semibold">{me.full_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">CCCD</span>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
              {me.identity_card}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ngày sinh</span>
            <span>
              {new Date(me.date_of_birth).toLocaleDateString("vi-VN")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Căn hộ</span>
            <Badge variant="secondary" className="font-mono">
              {myApt ? `${myApt.block}-${myApt.apartment_number}` : "—"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Trạng thái cư trú</span>
            <Badge variant="outline" className="text-xs">
              {STATUS_LABELS[me.temporary_residence_status] || me.temporary_residence_status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Apartment Info */}
      {myApt && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" />
              Thông tin căn hộ
            </CardTitle>
            <CardDescription>
              Chi tiết căn hộ {myApt.block}-{myApt.apartment_number} bạn đang cư trú.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Block</p>
                <p className="mt-1 font-mono font-bold text-primary">{myApt.block}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Số phòng</p>
                <p className="mt-1 font-mono font-bold text-primary">{myApt.apartment_number}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Tầng</p>
                <p className="mt-1 font-semibold">{myApt.floor}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Diện tích</p>
                <p className="mt-1 font-semibold">{myApt.area_sqm} m²</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Trạng thái phòng</p>
              <Badge
                className="mt-1"
                variant={myApt.status === "occupied" ? "default" : "secondary"}
              >
                {myApt.status === "available" ? "Trống" : myApt.status === "occupied" ? "Đang ở" : "Bảo trì"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Housemates */}
      {housemates.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Nhân khẩu trong hộ
            </CardTitle>
            <CardDescription>
              {housemates.length} người đang sinh sống trong căn hộ này.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {housemates.map((h: any) => (
              <div
                key={h._id}
                className={`flex items-center justify-between rounded-lg p-3 text-sm ${h._id === me._id ? "bg-primary/5 border border-primary/20" : "bg-muted/40"}`}
              >
                <div>
                  <p className="font-semibold">
                    {h.full_name}
                    {h._id === me._id && (
                      <span className="ml-2 text-[10px] text-primary font-normal">(bạn)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{h.phone_number}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {RELATION_LABELS[h.relationship] || h.relationship}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vehicles in apartment */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" />
            Phương tiện đã đăng ký
          </CardTitle>
          <CardDescription>
            Phương tiện thuộc căn hộ {myApt ? `${myApt.block}-${myApt.apartment_number}` : "của bạn"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aptVehicles.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Chưa có phương tiện nào được đăng ký.
            </p>
          ) : (
            <div className="space-y-2">
              {aptVehicles.map((v: any) => {
                const owner = allResidents.find((r) => r._id === v.resident_id)
                return (
                  <div
                    key={v._id}
                    className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm"
                  >
                    <div>
                      <p className="font-mono font-bold tracking-wider text-primary">
                        {v.license_plate}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {v.vehicle_name || "Không có tên"} · {owner?.full_name}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {v.vehicle_type === "motorbike" ? "Xe máy" : "Ô tô"}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Edit */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin liên hệ</CardTitle>
          <CardDescription>
            Bạn có thể tự cập nhật số điện thoại và email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-muted-foreground uppercase">
              Số điện thoại
            </Label>
            <Input
              value={editPhone}
              onChange={(e) => {
                setEditPhone(e.target.value)
                setPhoneError("")
              }}
              placeholder="0912345678"
              className={phoneError ? "border-destructive" : ""}
            />
            <FieldError msg={phoneError} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-muted-foreground uppercase">
              Email
            </Label>
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <Button onClick={handleSaveContact} className="w-full">
            <Save className="mr-2 h-4 w-4" /> Lưu thay đổi
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Yêu cầu dịch vụ</CardTitle>
          <CardDescription>
            Các yêu cầu sẽ được gửi dưới dạng Ticket cho ban quản lý xét duyệt.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant="outline"
            className="h-16 flex-1 flex-col gap-1.5 transition-all hover:border-primary/30 hover:bg-primary/5"
            onClick={() => {
              setVehErrors({})
              setIsVehicleOpen(true)
            }}
          >
            <Car className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-medium">Đăng ký phương tiện</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-1 flex-col gap-1.5 transition-all hover:border-primary/30 hover:bg-primary/5"
            onClick={() => toast.info("Tính năng đang được phát triển.")}
          >
            <Users className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-medium">Thay đổi nhân khẩu</span>
          </Button>
        </CardContent>
      </Card>

      {/* Vehicle Registration Dialog */}
      <Dialog open={isVehicleOpen} onOpenChange={setIsVehicleOpen}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5 text-primary" /> Đăng ký phương tiện
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleVehicleTicket}
            className="space-y-4 pt-2"
            noValidate
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Biển số đăng ký
              </Label>
              <Input
                required
                value={vehForm.license_plate}
                onChange={(e) => {
                  setVehForm({
                    ...vehForm,
                    license_plate: e.target.value.toUpperCase(),
                  })
                  setVehErrors((p) => ({ ...p, license_plate: "" }))
                }}
                placeholder="VD: 30A-123.45"
                className={`bg-muted/50 font-mono ${vehErrors.license_plate ? "border-destructive" : ""}`}
              />
              <FieldError msg={vehErrors.license_plate} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Tên phương tiện
                <span className="ml-1 text-[10px] font-normal text-muted-foreground normal-case">
                  (Hãng + Model + Năm + Màu)
                </span>
              </Label>
              <Input
                required
                value={vehForm.vehicle_name}
                onChange={(e) => {
                  setVehForm({ ...vehForm, vehicle_name: e.target.value })
                  setVehErrors((p) => ({ ...p, vehicle_name: "" }))
                }}
                placeholder="Honda Wave RSX 2020 Đỏ"
                className={`bg-muted/50 ${vehErrors.vehicle_name ? "border-destructive" : ""}`}
              />
              <FieldError msg={vehErrors.vehicle_name} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Phân loại
              </Label>
              <Select
                value={vehForm.vehicle_type}
                onValueChange={(v) =>
                  setVehForm({ ...vehForm, vehicle_type: v })
                }
              >
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorbike">Xe máy</SelectItem>
                  <SelectItem value="car">Ô tô</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsVehicleOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" className="flex-1 font-bold">
                Gửi yêu cầu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
