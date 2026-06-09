import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { api } from "../lib/axios"
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
import { Plus, UserCog, History, Search, EyeOff, Eye, ArrowUpDown, AlertCircle, Dices } from "lucide-react"
import { ScrollArea } from "../components/ui/scroll-area"
import { Combobox } from "../components/ui/combobox"
import { extractErrorMessage } from "../lib/utils"
import { ImageDropZone } from "../components/ui/ImageDropZone"

const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
      <AlertCircle className="h-3.5 w-3.5" /> {error}
    </div>
  )
}

const emptyNewRes = {
  full_name: "",
  date_of_birth: "",
  identity_card: "",
  phone_number: "",
  email: "",
  apartment_id: "",
  relationship: "tenant",
  cccd_front_base64: "",
  cccd_back_base64: "",
  role: "resident",
  username: "",
  password: "",
}

const STATUS_LABELS: Record<string, string> = {
  registered: "Thường trú",
  permanent: "Thường trú",
  temporary: "Tạm trú",
  temporary_absent: "Tạm vắng",
}

export default function ResidentsPage() {
  const [residents, setResidents] = useState<any[]>([])
  const [apartments, setApartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingResident, setEditingResident] = useState<any>(null)
  const [newRes, setNewRes] = useState({ ...emptyNewRes })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Search + sort + filter
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<"full_name" | "apartment">("full_name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [showMovedOut, setShowMovedOut] = useState(true)

  async function fetchData() {
    try {
      const [resRes, aptRes] = await Promise.all([
        api.get("/residents"),
        api.get("/apartments"),
      ])
      setResidents(resRes.data)
      setApartments(aptRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!newRes.full_name || newRes.full_name.trim().split(" ").length < 2) {
      errs.full_name = "Vui lòng nhập đầy đủ họ và tên (ít nhất 2 từ)."
    }
    if (!newRes.date_of_birth) {
      errs.date_of_birth = "Vui lòng chọn ngày sinh."
    } else if (new Date(newRes.date_of_birth) > new Date()) {
      errs.date_of_birth = "Ngày sinh không được lớn hơn ngày hiện tại."
    }
    if (!/^[0-9]{12}$/.test(newRes.identity_card)) {
      errs.identity_card = "CCCD/CMND phải bao gồm đúng 12 chữ số."
    }
    if (!/^0[0-9]{9}$/.test(newRes.phone_number)) {
      errs.phone_number = "Số điện thoại phải bắt đầu bằng số 0 và gồm đúng 10 chữ số."
    }
    if (newRes.role === "resident" && !newRes.apartment_id) {
      errs.apartment_id = "Vui lòng chọn căn hộ cho cư dân."
    }
    // Tài khoản
    if (!newRes.username?.trim()) {
      errs.username = "Vui lòng nhập tên đăng nhập."
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin nhập.")
      return
    }
    try {
      const payload: any = {
        full_name: newRes.full_name.trim(),
        date_of_birth: new Date(newRes.date_of_birth).toISOString(),
        identity_card: newRes.identity_card.trim(),
        phone_number: newRes.phone_number.trim(),
        email: newRes.email || undefined,
        cccd_front_base64: newRes.cccd_front_base64 || undefined,
        cccd_back_base64: newRes.cccd_back_base64 || undefined,
        role: newRes.role,
        username: newRes.username?.trim() || undefined,
        password: newRes.password?.trim() || undefined,
      }
      // Chỉ gửi apartment_id + relationship khi role = resident
      if (newRes.role === "resident") {
        payload.apartment_id = newRes.apartment_id || undefined
        payload.relationship = newRes.relationship
      }

      const res = await api.post("/residents", payload)

      // Hiển thị mật khẩu tự sinh nếu có
      const genAccount = res.data?._generated_account
      if (genAccount?.auto_generated_password) {
        toast.success(
          `Đăng ký thành công! Tài khoản: ${genAccount.username} | Mật khẩu: ${genAccount.password}`,
          { duration: 15000 }
        )
      } else {
        toast.success("Đăng ký cư dân thành công!")
      }

      setIsRegisterOpen(false)
      setNewRes({ ...emptyNewRes })
      setFormErrors({})
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi đăng ký cư dân."))
    }
  }

  const handleGeneratePassword = () => {
    const randomPass = Math.random().toString(36).slice(-8) + "X1!"
    setNewRes({ ...newRes, password: randomPass })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.patch(`/residents/${editingResident._id}`, {
        full_name: editingResident.full_name,
        phone_number: editingResident.phone_number,
        email: editingResident.email,
        temporary_residence_status: editingResident.temporary_residence_status,
        cccd_front_base64: editingResident.cccd_front_base64,
        cccd_back_base64: editingResident.cccd_back_base64,
      })
      toast.success("Cập nhật hồ sơ cư dân thành công!")
      setIsEditOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi cập nhật thông tin."))
    }
  }



  const getApartmentForResident = (resId: string) => {
    const matched = apartments.find((apt) =>
      apt.current_residents?.some((cr: any) => cr.resident_id === resId && cr.status === "living")
    )
    return matched ? { id: matched._id, label: `${matched.block}-${matched.apartment_number}` } : null
  }

  const isMovedOut = (resId: string) => getApartmentForResident(resId) === null

  const apartmentOptions = apartments.map((apt) => ({
    value: apt._id,
    label: `${apt.block}-${apt.apartment_number}`,
  }))

  const toggleSort = (key: "full_name" | "apartment") => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const filteredResidents = useMemo(() => {
    let list = residents.filter((r) => {
      const movedOut = isMovedOut(r._id)
      if (!showMovedOut && movedOut) return false
      const q = search.toLowerCase()
      return (
        r.full_name?.toLowerCase().includes(q) ||
        r.phone_number?.includes(q) ||
        r.identity_card?.includes(q) ||
        r.email?.toLowerCase().includes(q)
      )
    })

    list = [...list].sort((a, b) => {
      let valA = "", valB = ""
      if (sortKey === "full_name") {
        valA = a.full_name || ""; valB = b.full_name || ""
      } else {
        valA = getApartmentForResident(a._id)?.label || "zzz"
        valB = getApartmentForResident(b._id)?.label || "zzz"
      }
      return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })
    return list
  }, [residents, apartments, search, sortKey, sortDir, showMovedOut])

  return (
    <div className="animate-in space-y-6 duration-500 fade-in">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản lý Cư dân</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách nhân khẩu và tra cứu thông tin phòng.
          </p>
        </div>
        <Button
          onClick={() => setIsRegisterOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Đăng ký cư dân
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Cư dân</CardTitle>
          <CardDescription>
            Hệ thống cơ sở dữ liệu nhân khẩu toàn diện với liên kết phòng lưu trữ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + filter toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Tìm theo tên, SĐT, CCCD, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowMovedOut(v => !v)}
            >
              {showMovedOut ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showMovedOut ? "Ẩn đã chuyển đi" : "Hiện đã chuyển đi"}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border bg-card/80">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("full_name")}>
                      Họ và tên <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("apartment")}>
                      Căn hộ <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CCCD/CMND</TableHead>
                  <TableHead>Pháp lý</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredResidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Không tìm thấy cư dân nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResidents.map((r: any) => {
                    const apt = getApartmentForResident(r._id)
                    const movedOut = !apt
                    return (
                      <TableRow
                        key={r._id}
                        className={`transition-colors hover:bg-muted/50 ${movedOut ? "opacity-50" : ""}`}
                      >
                        <TableCell className="font-semibold text-primary">
                          {r.full_name}
                          {movedOut && <span className="ml-2 text-[10px] text-muted-foreground font-normal">(đã chuyển đi)</span>}
                        </TableCell>
                        <TableCell>
                          {apt
                            ? <Badge variant="secondary" className="font-mono">{apt.label}</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>
                          }
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {r.phone_number}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.email}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {r.identity_card}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {STATUS_LABELS[r.temporary_residence_status] || r.temporary_residence_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingResident({ ...r })
                              setIsEditOpen(true)
                            }}
                          >
                            <UserCog className="h-4 w-4" />
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

      {/* Register Resident Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleRegister}>
            <DialogHeader>
              <DialogTitle>Đăng ký Cư dân mới</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Role selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Vai trò
                </Label>
                <Select
                  value={newRes.role}
                  onValueChange={(v) =>
                    setNewRes({ ...newRes, role: v, apartment_id: "", relationship: "tenant" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident">Cư dân</SelectItem>
                    <SelectItem value="accountant">Kế toán</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Họ và tên
                  </Label>
                  <Input
                    required
                    value={newRes.full_name}
                    onChange={(e) => {
                      setNewRes({ ...newRes, full_name: e.target.value })
                      setFormErrors(prev => ({ ...prev, full_name: "" }))
                    }}
                    placeholder="Nguyễn Văn A"
                  />
                  <FieldError error={formErrors.full_name} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Ngày sinh
                  </Label>
                  <Input
                    type="date"
                    required
                    value={newRes.date_of_birth}
                    onChange={(e) => {
                      setNewRes({ ...newRes, date_of_birth: e.target.value })
                      setFormErrors(prev => ({ ...prev, date_of_birth: "" }))
                    }}
                  />
                  <FieldError error={formErrors.date_of_birth} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Số CCCD/CMND
                  </Label>
                  <Input
                    required
                    value={newRes.identity_card}
                    onChange={(e) => {
                      setNewRes({ ...newRes, identity_card: e.target.value })
                      setFormErrors(prev => ({ ...prev, identity_card: "" }))
                    }}
                    placeholder="079XXXXXXXXX"
                  />
                  <FieldError error={formErrors.identity_card} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Số điện thoại
                  </Label>
                  <Input
                    required
                    value={newRes.phone_number}
                    onChange={(e) => {
                      setNewRes({ ...newRes, phone_number: e.target.value })
                      setFormErrors(prev => ({ ...prev, phone_number: "" }))
                    }}
                    placeholder="0912345678"
                  />
                  <FieldError error={formErrors.phone_number} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Email
                </Label>
                <Input
                  type="email"
                  value={newRes.email}
                  onChange={(e) =>
                    setNewRes({ ...newRes, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>

              {/* Apartment + Relationship — chỉ hiện khi role = resident */}
              {newRes.role === "resident" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Căn hộ
                    </Label>
                    <Combobox
                      options={apartmentOptions}
                      value={newRes.apartment_id}
                      onValueChange={(v) => {
                        setNewRes({ ...newRes, apartment_id: v })
                        setFormErrors(prev => ({ ...prev, apartment_id: "" }))
                      }}
                      placeholder="Tìm căn hộ..."
                      searchPlaceholder="Nhập block hoặc số phòng..."
                    />
                    <FieldError error={formErrors.apartment_id} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Quan hệ
                    </Label>
                    <Select
                      value={newRes.relationship}
                      onValueChange={(v) =>
                        setNewRes({ ...newRes, relationship: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Chủ hộ</SelectItem>
                        <SelectItem value="family">Người thân</SelectItem>
                        <SelectItem value="tenant">Người thuê</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Account fields */}
              <div className="border-t pt-4 mt-2">
                <h4 className="mb-3 text-xs font-bold text-muted-foreground uppercase">
                  Tài khoản đăng nhập
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Username
                    </Label>
                    <Input
                      value={newRes.username}
                      required
                      onChange={(e) => {
                        setNewRes({ ...newRes, username: e.target.value })
                        setFormErrors(prev => ({ ...prev, username: "" }))
                      }}
                      placeholder="Tên đăng nhập"
                    />
                    <FieldError error={formErrors.username} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Password
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newRes.password}
                        onChange={(e) =>
                          setNewRes({ ...newRes, password: e.target.value })
                        }
                        placeholder="Để trống = tự động tạo"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={handleGeneratePassword}
                        title="Sinh ngẫu nhiên"
                      >
                        <Dices className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Ảnh CCCD mặt trước
                  </Label>
                  <ImageDropZone
                    value={newRes.cccd_front_base64}
                    onChange={(val) => setNewRes({ ...newRes, cccd_front_base64: val })}
                    label="Mặt trước CCCD"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Ảnh CCCD mặt sau
                  </Label>
                  <ImageDropZone
                    value={newRes.cccd_back_base64}
                    onChange={(val) => setNewRes({ ...newRes, cccd_back_base64: val })}
                    label="Mặt sau CCCD"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">
                Đăng ký
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Resident Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px]">
          {editingResident && (
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle>Cập nhật Thông tin Cư dân</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Họ và tên
                    </Label>
                    <Input
                      value={editingResident.full_name}
                      onChange={(e) =>
                        setEditingResident({
                          ...editingResident,
                          full_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Số điện thoại
                    </Label>
                    <Input
                      value={editingResident.phone_number}
                      onChange={(e) =>
                        setEditingResident({
                          ...editingResident,
                          phone_number: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      CCCD/CMND
                    </Label>
                    <Input value={editingResident.identity_card} disabled className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Ngày sinh
                    </Label>
                    <Input
                      type="date"
                      value={editingResident.date_of_birth ? new Date(editingResident.date_of_birth).toISOString().split('T')[0] : ""}
                      disabled
                      className="bg-muted/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Trạng thái cư trú
                    </Label>
                    <Select
                      value={editingResident.temporary_residence_status}
                      onValueChange={(v) =>
                        setEditingResident({
                          ...editingResident,
                          temporary_residence_status: v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registered">Thường trú</SelectItem>
                        <SelectItem value="permanent">Thường trú (cũ)</SelectItem>
                        <SelectItem value="temporary">Tạm trú</SelectItem>
                        <SelectItem value="temporary_absent">Tạm vắng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={editingResident.email || ""}
                    onChange={(e) =>
                      setEditingResident({
                        ...editingResident,
                        email: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Ảnh CCCD mặt trước
                    </Label>
                    <ImageDropZone
                      value={editingResident.cccd_front_base64}
                      onChange={(val) => setEditingResident({ ...editingResident, cccd_front_base64: val })}
                      label="Cập nhật CCCD mặt trước"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Ảnh CCCD mặt sau
                    </Label>
                    <ImageDropZone
                      value={editingResident.cccd_back_base64}
                      onChange={(val) => setEditingResident({ ...editingResident, cccd_back_base64: val })}
                      label="Cập nhật CCCD mặt sau"
                    />
                  </div>
                </div>

                {editingResident.change_history?.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase">
                      <History className="h-3 w-3" /> Lịch sử thay đổi
                    </h4>
                    <ScrollArea className="h-[100px] rounded-md border bg-muted/30 p-2">
                      {editingResident.change_history.map(
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
                <Button type="submit" className="w-full">
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
