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
  DialogFooter,
} from "../../components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { getStoredUser } from "../../lib/auth"
import { extractErrorMessage } from "../../lib/utils"
import { Car, Plus, AlertCircle, Bike, Loader2 } from "lucide-react"

const PLATE_REGEX = /^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3,4}\.?[0-9]{2}$/
const VEHICLE_NAME_REGEX = /^.+\s.+\s(19|20)\d{2}(\s.+)?$/

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  motorbike: "Xe máy",
  car: "Ô tô",
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  owner: "Chủ hộ",
  family: "Người thân",
  tenant: "Người thuê",
}

export default function VehiclesPage() {
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [allResidents, setAllResidents] = useState<any[]>([])
  const [apartment, setApartment] = useState<any>(null)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [vehForm, setVehForm] = useState({
    license_plate: "",
    vehicle_type: "motorbike",
    vehicle_name: "",
  })
  const [vehErrors, setVehErrors] = useState<Record<string, string>>({})

  const user = getStoredUser()

  const fetchData = async () => {
    try {
      const [aptRes, vehRes, resRes] = await Promise.all([
        api.get("/apartments"),
        api.get("/vehicles"),
        api.get("/residents"),
      ])

      setAllResidents(resRes.data)

      const myApt = aptRes.data.find((a: any) =>
        a.current_residents?.some(
          (r: any) => r.resident_id === user?.resident_id && r.status === "living"
        )
      )
      setApartment(myApt)

      if (myApt) {
        setVehicles(vehRes.data.filter((v: any) => v.apartment_id === myApt._id))
      }
    } catch {
      toast.error("Không thể tải dữ liệu phương tiện.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.resident_id || !apartment) return

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
        resident_id: user.resident_id,
        apartment_id: apartment._id,
        category: "vehicle_registration",
        title: `Đăng ký phương tiện: ${vehForm.vehicle_name} (${sanitizedPlate})`,
        description: JSON.stringify({
          ...vehForm,
          license_plate: sanitizedPlate,
        }),
      })
      setIsRegisterOpen(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Phương tiện</h2>
        <Button
          size="sm"
          onClick={() => { setVehErrors({}); setIsRegisterOpen(true) }}
          className="gap-1.5 rounded-full shadow-md"
        >
          <Plus className="h-4 w-4" /> Đăng ký
        </Button>
      </div>

      {/* Vehicle List */}
      {!apartment ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Car className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              Bạn chưa được gắn vào căn hộ nào.
            </p>
          </CardContent>
        </Card>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Car className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              Chưa có phương tiện nào được đăng ký.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Nhấn "Đăng ký" để gửi yêu cầu đăng ký phương tiện mới.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {vehicles.map((v: any) => {
            const ownerResident = allResidents.find((r) => r._id === v.resident_id)
            return (
              <Card key={v._id} className="border-0 shadow-sm bg-card/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${v.vehicle_type === "car" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}>
                      {v.vehicle_type === "car" ? <Car className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-mono font-bold tracking-wider text-primary text-sm">
                        {v.license_plate}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {v.vehicle_name || "Không có tên"}{ownerResident ? ` · ${ownerResident.full_name}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {VEHICLE_TYPE_LABELS[v.vehicle_type] || v.vehicle_type}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Info Card */}
      {apartment && (
        <div className="rounded-xl bg-muted/30 border p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground text-sm">
            Căn hộ {apartment.block}-{apartment.apartment_number}
          </p>
          <p>{vehicles.length} phương tiện đã đăng ký</p>
          <p className="text-[10px]">
            Để đăng ký thêm phương tiện, nhấn nút "Đăng ký". Yêu cầu sẽ được gửi tới ban quản lý để duyệt.
          </p>
        </div>
      )}

      {/* Register Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5 text-primary" /> Đăng ký phương tiện
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4 pt-2" noValidate>
            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Biển số đăng ký
              </Label>
              <Input
                required
                value={vehForm.license_plate}
                onChange={(e) => {
                  setVehForm({ ...vehForm, license_plate: e.target.value.toUpperCase() })
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
                onValueChange={(v) => setVehForm({ ...vehForm, vehicle_type: v })}
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
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsRegisterOpen(false)}>
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
