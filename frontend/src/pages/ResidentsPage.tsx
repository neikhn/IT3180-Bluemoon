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
import { Plus, UserCog, History, Search, EyeOff, Eye, ArrowUpDown } from "lucide-react"
import { ScrollArea } from "../components/ui/scroll-area"
import { Combobox } from "../components/ui/combobox"
import { extractErrorMessage } from "../lib/utils"

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
}

const STATUS_LABELS: Record<string, string> = {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/residents", {
        ...newRes,
        date_of_birth: new Date(newRes.date_of_birth).toISOString(),
      })
      toast.success("Đăng ký cư dân thành công!")
      setIsRegisterOpen(false)
      setNewRes({ ...emptyNewRes })
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi đăng ký cư dân."))
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.patch(`/residents/${editingResident._id}`, {
        full_name: editingResident.full_name,
        phone_number: editingResident.phone_number,
        email: editingResident.email,
        temporary_residence_status: editingResident.temporary_residence_status,
      })
      toast.success("Cập nhật hồ sơ cư dân thành công!")
      setIsEditOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi cập nhật thông tin."))
    }
  }

  const readFileAsBase64 = (file: File, callback: (result: string) => void) => {
    const reader = new FileReader()
    reader.onload = () => callback(reader.result as string)
    reader.readAsDataURL(file)
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
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleRegister}>
            <DialogHeader>
              <DialogTitle>Đăng ký Cư dân mới</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Họ và tên
                  </Label>
                  <Input
                    required
                    value={newRes.full_name}
                    onChange={(e) =>
                      setNewRes({ ...newRes, full_name: e.target.value })
                    }
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Ngày sinh
                  </Label>
                  <Input
                    type="date"
                    required
                    value={newRes.date_of_birth}
                    onChange={(e) =>
                      setNewRes({ ...newRes, date_of_birth: e.target.value })
                    }
                  />
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
                    onChange={(e) =>
                      setNewRes({ ...newRes, identity_card: e.target.value })
                    }
                    placeholder="079XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Số điện thoại
                  </Label>
                  <Input
                    required
                    value={newRes.phone_number}
                    onChange={(e) =>
                      setNewRes({ ...newRes, phone_number: e.target.value })
                    }
                    placeholder="0912345678"
                  />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Căn hộ
                  </Label>
                  <Combobox
                    options={apartmentOptions}
                    value={newRes.apartment_id}
                    onValueChange={(v) =>
                      setNewRes({ ...newRes, apartment_id: v })
                    }
                    placeholder="Tìm căn hộ..."
                    searchPlaceholder="Nhập block hoặc số phòng..."
                  />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Ảnh CCCD mặt trước
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file)
                        readFileAsBase64(file, (b64) =>
                          setNewRes({ ...newRes, cccd_front_base64: b64 })
                        )
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Ảnh CCCD mặt sau
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file)
                        readFileAsBase64(file, (b64) =>
                          setNewRes({ ...newRes, cccd_back_base64: b64 })
                        )
                    }}
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
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="permanent">Thường trú</SelectItem>
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
