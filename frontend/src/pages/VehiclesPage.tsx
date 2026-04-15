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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { ScrollArea } from "../components/ui/scroll-area"
import { Combobox } from "../components/ui/combobox"
import { extractErrorMessage } from "../lib/utils"
import {
  CarFront,
  Plus,
  Pencil,
  Trash2,
  History,
  AlertCircle,
  Info,
  Search,
  ArrowUpDown,
} from "lucide-react"

// Validation helpers
const PLATE_REGEX = /^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3,4}\.?[0-9]{2}$/
// Vehicle name: at least 3 words including a 4-digit year
const VEHICLE_NAME_REGEX = /^.+\s.+\s(19|20)\d{2}(\s.+)?$/

function validatePlate(plate: string): string {
  if (!plate.trim()) return "Biển số không được để trống."
  if (!PLATE_REGEX.test(plate.toUpperCase().replace(" ", "")))
    return "Biển số không đúng định dạng. VD: 30A-123.45 hoặc 51G1-12345"
  return ""
}

function validateVehicleName(name: string): string {
  if (!name.trim()) return "Tên phương tiện không được để trống."
  if (!VEHICLE_NAME_REGEX.test(name))
    return "Tên cần theo định dạng: Hãng + Model + Năm + Màu. VD: Honda Wave RSX 2020 Đỏ"
  return ""
}

const emptyForm = {
  apartment_id: "",
  resident_id: "",
  license_plate: "",
  vehicle_type: "motorbike",
  vehicle_name: "",
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [residents, setResidents] = useState<any[]>([])
  const [apartments, setApartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingVehicle, setDeletingVehicle] = useState<any>(null)

  const [newVehicle, setNewVehicle] = useState({ ...emptyForm })
  const [newErrors, setNewErrors] = useState<Record<string, string>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Search + sort
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<"license_plate" | "vehicle_name" | "apartment">("apartment")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const fetchData = async () => {
    try {
      const [vehRes, resRes, aptRes] = await Promise.all([
        api.get("/vehicles"),
        api.get("/residents"),
        api.get("/apartments"),
      ])
      setVehicles(vehRes.data)
      setResidents(resRes.data)
      setApartments(aptRes.data)
    } catch {
      toast.error("Không thể tải dữ liệu. Kiểm tra kết nối backend.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Combobox options
  const residentOptions = residents.map((r) => ({
    value: r._id,
    label: r.full_name,
    sublabel: r.phone_number,
  }))
  const apartmentOptions = apartments.map((a) => ({
    value: a._id,
    label: `${a.block}-${a.apartment_number}`,
    sublabel: `Tầng ${a.floor} · ${a.current_residents?.filter((cr: any) => cr.status === "living").length || 0} cư dân`,
  }))

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const plateErr = validatePlate(newVehicle.license_plate)
    if (plateErr) errs.license_plate = plateErr
    const nameErr = validateVehicleName(newVehicle.vehicle_name)
    if (nameErr) errs.vehicle_name = nameErr
    if (!newVehicle.apartment_id) errs.apartment_id = "Vui lòng chọn căn hộ."
    if (!newVehicle.resident_id)
      errs.resident_id = "Vui lòng chọn chủ phương tiện."
    setNewErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      await api.post("/vehicles", newVehicle)
      toast.success("Đăng ký phương tiện thành công!")
      setIsRegisterOpen(false)
      setNewVehicle({ ...emptyForm })
      setNewErrors({})
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi đăng ký phương tiện."))
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const plateErr = validatePlate(editingVehicle.license_plate)
    if (plateErr) errs.license_plate = plateErr
    const nameErr = validateVehicleName(editingVehicle.vehicle_name || "")
    if (nameErr) errs.vehicle_name = nameErr
    setEditErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      await api.patch(`/vehicles/${editingVehicle._id}`, {
        license_plate: editingVehicle.license_plate,
        vehicle_type: editingVehicle.vehicle_type,
        vehicle_name: editingVehicle.vehicle_name,
        status: editingVehicle.status,
      })
      toast.success("Cập nhật phương tiện thành công!")
      setIsEditOpen(false)
      setEditErrors({})
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi cập nhật phương tiện."))
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/vehicles/${deletingVehicle._id}`)
      toast.success(`Đã xóa phương tiện ${deletingVehicle.license_plate}.`)
      setIsDeleteOpen(false)
      setDeletingVehicle(null)
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi xóa phương tiện."))
    }
  }

  const getOwnerName = (id: string) =>
    residents.find((r) => r._id === id)?.full_name || "—"
  const getApartmentName = (id: string) => {
    const a = apartments.find((a) => a._id === id)
    return a ? `${a.block}-${a.apartment_number}` : "—"
  }

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const filteredVehicles = useMemo(() => {
    const q = search.toLowerCase()
    let list = vehicles.filter(v =>
      v.license_plate?.toLowerCase().includes(q) ||
      v.vehicle_name?.toLowerCase().includes(q) ||
      getOwnerName(v.resident_id).toLowerCase().includes(q) ||
      getApartmentName(v.apartment_id).toLowerCase().includes(q)
    )
    return [...list].sort((a, b) => {
      let va = "", vb = ""
      if (sortKey === "license_plate") { va = a.license_plate || ""; vb = b.license_plate || "" }
      else if (sortKey === "vehicle_name") { va = a.vehicle_name || ""; vb = b.vehicle_name || "" }
      else { va = getApartmentName(a.apartment_id); vb = getApartmentName(b.apartment_id) }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [vehicles, residents, apartments, search, sortKey, sortDir])

  // Field row with inline validation
  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        {msg}
      </p>
    ) : null

  return (
    <div className="animate-in space-y-6 duration-500 fade-in">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Quản lý Phương tiện
          </h2>
          <p className="text-muted-foreground">
            Danh sách phương tiện đã đăng ký theo căn hộ.
          </p>
        </div>
        <Button
          onClick={() => {
            setNewVehicle({ ...emptyForm })
            setNewErrors({})
            setIsRegisterOpen(true)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Đăng ký Phương tiện
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <span>
          Mỗi căn hộ chỉ có thể có{" "}
          <strong>tối đa 2 xe máy</strong> và{" "}
          <strong>1 ô tô</strong>.
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phương tiện đã đăng ký</CardTitle>
          <CardDescription>
            Dữ liệu ghép từ danh sách cư dân và căn hộ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search toolbar */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm biển số, tên xe, cư dân, căn hộ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto rounded-md border bg-card/80">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("license_plate")}>
                      Biển số <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("vehicle_name")}>
                      Tên phương tiện <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("apartment")}>
                      Căn hộ <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Chủ sở hữu</TableHead>
                  <TableHead>Phân loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {search ? "Không tìm thấy phương tiện nào." : "Chưa có phương tiện nào được đăng ký."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((v: any) => (
                    <TableRow key={v._id} className="hover:bg-muted/50">
                      <TableCell className="font-bold tracking-widest text-primary">
                        {v.license_plate}
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.vehicle_name || (
                          <span className="text-muted-foreground italic">
                            Chưa có tên
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getApartmentName(v.apartment_id)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {getOwnerName(v.resident_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {v.vehicle_type === "motorbike" ? "Xe máy" : "Ô tô"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            v.status === "active" ? "default" : "secondary"
                          }
                        >
                          {v.status === "active" ? "Hoạt động" : "Tạm dừng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingVehicle({ ...v })
                              setEditErrors({})
                              setIsEditOpen(true)
                            }}
                            title="Sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingVehicle(v)
                              setIsDeleteOpen(true)
                            }}
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Register Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleRegister} noValidate>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CarFront className="h-5 w-5 text-primary" /> Đăng ký Phương
                tiện Mới
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Biển số đăng ký
                </Label>
                <Input
                  value={newVehicle.license_plate}
                  onChange={(e) => {
                    setNewVehicle({
                      ...newVehicle,
                      license_plate: e.target.value.toUpperCase(),
                    })
                    setNewErrors((p) => ({ ...p, license_plate: "" }))
                  }}
                  placeholder="VD: 30A-123.45"
                  className={
                    newErrors.license_plate ? "border-destructive" : ""
                  }
                />
                <FieldError msg={newErrors.license_plate} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Tên phương tiện
                </Label>
                <Input
                  value={newVehicle.vehicle_name}
                  onChange={(e) => {
                    setNewVehicle({
                      ...newVehicle,
                      vehicle_name: e.target.value,
                    })
                    setNewErrors((p) => ({ ...p, vehicle_name: "" }))
                  }}
                  placeholder="VD: Honda Wave RSX 2020 Đỏ"
                  className={newErrors.vehicle_name ? "border-destructive" : ""}
                />
                <FieldError msg={newErrors.vehicle_name} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Phân loại
                  </Label>
                  <Select
                    value={newVehicle.vehicle_type}
                    onValueChange={(v) =>
                      setNewVehicle({ ...newVehicle, vehicle_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motorbike">Xe máy</SelectItem>
                      <SelectItem value="car">Ô tô</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Căn hộ
                  </Label>
                  <Combobox
                    options={apartmentOptions}
                    value={newVehicle.apartment_id}
                    onValueChange={(v) => {
                      setNewVehicle({ ...newVehicle, apartment_id: v })
                      setNewErrors((p) => ({ ...p, apartment_id: "" }))
                    }}
                    placeholder="Tìm căn hộ..."
                    searchPlaceholder="Nhập số phòng hoặc block..."
                  />
                  <FieldError msg={newErrors.apartment_id} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Chủ sở hữu phương tiện
                </Label>
                <Combobox
                  options={residentOptions}
                  value={newVehicle.resident_id}
                  onValueChange={(v) => {
                    setNewVehicle({ ...newVehicle, resident_id: v })
                    setNewErrors((p) => ({ ...p, resident_id: "" }))
                  }}
                  placeholder="Tìm cư dân..."
                  searchPlaceholder="Nhập tên hoặc số điện thoại..."
                />
                <FieldError msg={newErrors.resident_id} />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsRegisterOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">Đăng ký Phương tiện</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[460px]">
          {editingVehicle && (
            <form onSubmit={handleEdit} noValidate>
              <DialogHeader>
                <DialogTitle>Cập nhật Phương tiện</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Biển số
                  </Label>
                  <Input
                    value={editingVehicle.license_plate}
                    onChange={(e) => {
                      setEditingVehicle({
                        ...editingVehicle,
                        license_plate: e.target.value.toUpperCase(),
                      })
                      setEditErrors((p) => ({ ...p, license_plate: "" }))
                    }}
                    className={
                      editErrors.license_plate ? "border-destructive" : ""
                    }
                  />
                  <FieldError msg={editErrors.license_plate} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Tên phương tiện
                  </Label>
                  <Input
                    value={editingVehicle.vehicle_name || ""}
                    onChange={(e) => {
                      setEditingVehicle({
                        ...editingVehicle,
                        vehicle_name: e.target.value,
                      })
                      setEditErrors((p) => ({ ...p, vehicle_name: "" }))
                    }}
                    placeholder="Honda Rebel 500 2025 Đen"
                    className={
                      editErrors.vehicle_name ? "border-destructive" : ""
                    }
                  />
                  <FieldError msg={editErrors.vehicle_name} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Phân loại
                    </Label>
                    <Select
                      value={editingVehicle.vehicle_type}
                      onValueChange={(v) =>
                        setEditingVehicle({
                          ...editingVehicle,
                          vehicle_type: v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motorbike">Xe máy</SelectItem>
                        <SelectItem value="car">Ô tô</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Trạng thái
                    </Label>
                    <Select
                      value={editingVehicle.status}
                      onValueChange={(v) =>
                        setEditingVehicle({ ...editingVehicle, status: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Hoạt động</SelectItem>
                        <SelectItem value="inactive">Tạm dừng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {editingVehicle.change_history?.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase">
                      <History className="h-3 w-3" /> Lịch sử thay đổi
                    </h4>
                    <ScrollArea className="h-[100px] rounded-md border bg-muted/30 p-2">
                      {editingVehicle.change_history.map(
                        (h: any, i: number) => (
                          <div
                            key={i}
                            className="mb-2 border-b border-dashed pb-1 text-[11px] last:border-0"
                          >
                            <span className="mr-2 font-bold text-primary">
                              [{new Date(h.changed_at).toLocaleString("vi-VN")}]
                            </span>
                            {h.changes_summary}
                          </div>
                        )
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit">Lưu thay đổi</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Xác nhận xóa phương tiện
            </DialogTitle>
          </DialogHeader>
          <p className="py-3 text-sm">
            Bạn có chắc muốn xóa phương tiện biển số{" "}
            <strong className="font-mono tracking-widest text-primary">
              {deletingVehicle?.license_plate}
            </strong>
            ?
            <br />
            <span className="text-xs text-muted-foreground">
              Hành động này không thể hoàn tác.
            </span>
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Xóa phương tiện
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
