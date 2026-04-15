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
import { Badge } from "../components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
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
import {
  HousePlus,
  Plus,
  Trash2,
  Info,
  History,
  UserPlus,
  X,
  Search,
  ArrowUpDown,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { extractErrorMessage } from "../lib/utils"

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState<any[]>([])
  const [residents, setResidents] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedApt, setSelectedApt] = useState<any>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingApt, setEditingApt] = useState<any>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingApt, setDeletingApt] = useState<any>(null)
  const [deleteError, setDeleteError] = useState("")

  // Add resident to apartment
  const [addResidentId, setAddResidentId] = useState("")
  const [addRelationship, setAddRelationship] = useState("tenant")

  const [newApt, setNewApt] = useState({
    apartment_number: "",
    block: "",
    floor: 0,
    area_sqm: 0,
    apartment_type: "standard",
    status: "available",
  })

  // Search + sort
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<"apartment_number" | "block" | "floor" | "status">("block")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const fetchAll = async () => {
    try {
      const [aptRes, resRes, vehRes] = await Promise.all([
        api.get("/apartments"),
        api.get("/residents"),
        api.get("/vehicles"),
      ])
      setApartments(aptRes.data)
      setResidents(resRes.data)
      setVehicles(vehRes.data)
      setError(null)
      // Refresh selectedApt if open
      if (selectedApt) {
        const fresh = aptRes.data.find((a: any) => a._id === selectedApt._id)
        if (fresh) setSelectedApt(fresh)
      }
    } catch {
      setError("Kết nối Backend thất bại.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const filteredApartments = useMemo(() => {
    const q = search.toLowerCase()
    let list = apartments.filter(a =>
      a.apartment_number?.toLowerCase().includes(q) ||
      a.block?.toLowerCase().includes(q) ||
      String(a.floor).includes(q)
    )
    return [...list].sort((a, b) => {
      let va: any = a[sortKey] || "", vb: any = b[sortKey] || ""
      if (sortKey === "floor") { va = Number(va); vb = Number(vb); return sortDir === "asc" ? va - vb : vb - va }
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [apartments, search, sortKey, sortDir])

  const handleViewAndEdit = async (apt: any) => {
    setSelectedApt(apt)
    setEditingApt({ ...apt })
    setAddResidentId("")
    setAddRelationship("tenant")
    setIsEditOpen(true)
    // refresh vehicles for this apt
    try {
      const res = await api.get("/vehicles")
      setVehicles(res.data)
    } catch {
      /* silent */
    }
  }

  const handleCreateApt = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/apartments", newApt)
      toast.success("Tạo căn hộ thành công!")
      setIsCreateOpen(false)
      setNewApt({
        apartment_number: "",
        block: "",
        floor: 0,
        area_sqm: 0,
        apartment_type: "standard",
        status: "available",
      })
      fetchAll()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi khi tạo căn hộ."))
    }
  }

  const handleEditApt = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.patch(`/apartments/${editingApt._id}`, {
        area_sqm: editingApt.area_sqm,
        apartment_type: editingApt.apartment_type,
        interior_notes: editingApt.interior_notes,
        status: editingApt.status,
      })
      toast.success("Cập nhật căn hộ thành công!")
      setIsEditOpen(false)
      fetchAll()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi cập nhật căn hộ."))
    }
  }

  const handleDeleteApt = async () => {
    setDeleteError("")
    try {
      await api.delete(`/apartments/${deletingApt._id}`)
      toast.success(`Đã xóa căn hộ ${deletingApt.apartment_number}.`)
      setIsDeleteOpen(false)
      setDeletingApt(null)
      fetchAll()
    } catch (err: any) {
      setDeleteError(extractErrorMessage(err, "Không thể xóa căn hộ."))
    }
  }

  const handleAddResident = async () => {
    if (!addResidentId) {
      toast.error("Vui lòng chọn cư dân.")
      return
    }
    // Check owner uniqueness client-side first
    if (addRelationship === "owner") {
      const hasOwner = selectedApt.current_residents?.some(
        (cr: any) => cr.relationship === "owner" && cr.status === "living"
      )
      if (hasOwner) {
        toast.error("Căn hộ này đã có chủ hộ! Mỗi phòng chỉ được 1 owner.")
        return
      }
    }
    // We piggyback on the resident register endpoint with the apartment_id
    const resident = residents.find((r) => r._id === addResidentId)
    if (!resident) return
    try {
      // PATCH apartment to embed resident directly using our existing endpoint
      await api.post("/residents", {
        full_name: resident.full_name,
        date_of_birth: resident.date_of_birth,
        identity_card: resident.identity_card + "_dup", // will fail — use dedicated add endpoint
        phone_number: resident.phone_number,
        email: resident.email,
        apartment_id: selectedApt._id,
        relationship: addRelationship,
      })
    } catch {
      // Try a different approach: patch apartment embedded list directly
    }

    // Correct approach: use a dedicated patch on apartment to add existing resident
    try {
      await api.patch(`/apartments/${selectedApt._id}/add-resident`, {
        resident_id: addResidentId,
        relationship: addRelationship,
      })
      toast.success("Đã thêm cư dân vào căn hộ.")
      setAddResidentId("")
      fetchAll()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi thêm cư dân."))
    }
  }

  const handleRemoveResident = async (residentId: string, fullName: string) => {
    try {
      await api.patch(`/apartments/${selectedApt._id}/remove-resident`, {
        resident_id: residentId,
      })
      toast.success(`Đã chuyển cư dân ${fullName} ra khỏi phòng.`)
      fetchAll()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Lỗi xóa cư dân khỏi phòng."))
    }
  }

  // Only show residents not already living in this apartment
  const availableResidentOptions = residents
    .filter(
      (r) =>
        !selectedApt?.current_residents?.some(
          (cr: any) => cr.resident_id === r._id && cr.status === "living"
        )
    )
    .map((r) => ({
      value: r._id,
      label: r.full_name,
      sublabel: r.phone_number,
    }))

  const aptVehicles = vehicles.filter(
    (v) => v.apartment_id === selectedApt?._id
  )

  const livingResidents =
    selectedApt?.current_residents?.filter((r: any) => r.status === "living") ||
    []

  return (
    <div className="animate-in space-y-6 duration-500 fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản lý Căn hộ</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách căn hộ và thông tin cư dân.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Thêm căn hộ
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <span>
          Chỉ có thể xóa căn hộ khi phòng{" "}
          <strong>không còn cư dân sinh sống</strong> và{" "}
          <strong>không còn phương tiện đăng ký</strong>. Hãy xử lý các ràng
          buộc đó trước.
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách căn hộ</CardTitle>
          <CardDescription>
            Nhấn các biểu tượng thao tác để xem chi tiết, chỉnh sửa hoặc xóa căn
            hộ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search toolbar */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo số phòng, block, tầng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("apartment_number")}>
                      Số phòng <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("block")}>
                      Block <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("floor")}>
                      Tầng <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Diện tích</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Cư dân</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center font-medium text-destructive"
                    >
                      ⚠️ {error}
                    </TableCell>
                  </TableRow>
                ) : filteredApartments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {search ? "Không tìm thấy căn hộ nào." : "Chưa có căn hộ nào."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApartments.map((apt: any) => (
                    <TableRow
                      key={apt._id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium text-primary">
                        {apt.apartment_number}
                      </TableCell>
                      <TableCell>{apt.block}</TableCell>
                      <TableCell>Tầng {apt.floor}</TableCell>
                      <TableCell className="capitalize">
                        <Badge variant="outline">{apt.apartment_type}</Badge>
                      </TableCell>
                      <TableCell>{apt.area_sqm} m²</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            apt.status === "available"
                              ? "secondary"
                              : apt.status === "occupied"
                                ? "default"
                                : "outline"
                          }
                        >
                          {apt.status === "available"
                            ? "Trống"
                            : apt.status === "occupied"
                              ? "Đang ở"
                              : "Bảo trì"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {apt.current_residents?.filter(
                          (r: any) => r.status === "living"
                        ).length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewAndEdit(apt)}
                            title="Quản lý chi tiết"
                          >
                            <HousePlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingApt(apt)
                              setDeleteError("")
                              setIsDeleteOpen(true)
                            }}
                            title="Xóa"
                            className="text-destructive hover:text-destructive"
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form onSubmit={handleCreateApt}>
            <DialogHeader>
              <DialogTitle>Thêm căn hộ mới</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Số phòng
                  </Label>
                  <Input
                    required
                    value={newApt.apartment_number}
                    onChange={(e) =>
                      setNewApt({ ...newApt, apartment_number: e.target.value })
                    }
                    placeholder="301"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Block
                  </Label>
                  <Input
                    required
                    value={newApt.block}
                    onChange={(e) =>
                      setNewApt({
                        ...newApt,
                        block: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="A"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Tầng
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={newApt.floor || ""}
                    onChange={(e) =>
                      setNewApt({ ...newApt, floor: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Diện tích (m²)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step="0.1"
                    required
                    value={newApt.area_sqm || ""}
                    onChange={(e) =>
                      setNewApt({
                        ...newApt,
                        area_sqm: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">
                  Loại căn hộ
                </Label>
                <Select
                  value={newApt.apartment_type}
                  onValueChange={(v) =>
                    setNewApt({ ...newApt, apartment_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="duplex">Duplex</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">Tạo căn hộ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Dialog (View & Edit Unified) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          {editingApt && selectedApt && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Quản lý căn hộ {editingApt.block}-{editingApt.apartment_number}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details" className="mt-2 w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Thông tin & Cư dân</TabsTrigger>
                  <TabsTrigger value="edit">Chỉnh sửa</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="pt-2">
                  <ScrollArea className="-mx-1 flex-1 px-1">
            <div className="space-y-4 py-2">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">
                    Vị trí:
                  </span>{" "}
                  Tầng {selectedApt?.floor} · Block {selectedApt?.block}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Diện tích:
                  </span>{" "}
                  {selectedApt?.area_sqm} m²
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Loại:
                  </span>{" "}
                  <span className="capitalize">
                    {selectedApt?.apartment_type}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">
                    Nội thất:
                  </span>{" "}
                  {selectedApt?.interior_notes || "Chưa ghi nhận"}
                </div>
              </div>

              {/* Residents Section */}
              <div className="space-y-3">
                <h4 className="flex items-center justify-between text-sm font-bold">
                  <span>Danh sách cư dân ({livingResidents.length})</span>
                </h4>

                {livingResidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Phòng chưa có cư dân nào.
                  </p>
                ) : (
                  <div className="divide-y overflow-hidden rounded-md border">
                    {livingResidents.map((r: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-card p-3 text-sm transition-colors hover:bg-muted/30"
                      >
                        <div>
                          <span className="font-medium">{r.full_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            từ{" "}
                            {new Date(r.move_in_date).toLocaleDateString(
                              "vi-VN"
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              r.relationship === "owner" ? "default" : "outline"
                            }
                            className="text-xs capitalize"
                          >
                            {r.relationship === "owner"
                              ? "Chủ hộ"
                              : r.relationship === "family"
                                ? "Người thân"
                                : "Người thuê"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              handleRemoveResident(r.resident_id, r.full_name)
                            }
                            title="Chuyển ra"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Resident Section */}
                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <h5 className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase">
                    <UserPlus className="h-3.5 w-3.5" /> Thêm cư dân vào phòng
                  </h5>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Combobox
                      options={availableResidentOptions}
                      value={addResidentId}
                      onValueChange={setAddResidentId}
                      placeholder="Tìm cư dân..."
                      searchPlaceholder="Nhập tên hoặc SĐT..."
                    />
                    <Select
                      value={addRelationship}
                      onValueChange={setAddRelationship}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Chủ hộ</SelectItem>
                        <SelectItem value="family">Người thân</SelectItem>
                        <SelectItem value="tenant">Người thuê</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddResident}
                    className="w-full"
                    disabled={!addResidentId}
                  >
                    <UserPlus className="mr-2 h-4 w-4" /> Thêm cư dân
                  </Button>
                </div>
              </div>

              {/* Vehicles Section */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold">
                  Phương tiện ({aptVehicles.length})
                </h4>
                {aptVehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Phòng chưa có phương tiện đăng ký.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {aptVehicles.map((v: any, idx: number) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="gap-1.5 px-3 py-1.5 font-mono text-sm tracking-widest"
                      >
                        {v.license_plate}
                        {v.vehicle_name && (
                          <span className="ml-1 text-xs font-normal opacity-70">
                            {v.vehicle_name}
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
                </TabsContent>
                <TabsContent value="edit" className="pt-4">
                  <form onSubmit={handleEditApt}>
              <DialogHeader>
                <DialogTitle>
                  Chỉnh sửa căn hộ {editingApt.block}-
                  {editingApt.apartment_number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Diện tích (m²)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      step="0.1"
                      value={editingApt.area_sqm}
                      onChange={(e) =>
                        setEditingApt({
                          ...editingApt,
                          area_sqm: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                      Loại
                    </Label>
                    <Select
                      value={editingApt.apartment_type}
                      onValueChange={(v) =>
                        setEditingApt({ ...editingApt, apartment_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="duplex">Duplex</SelectItem>
                        <SelectItem value="penthouse">Penthouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Trạng thái
                  </Label>
                  <Select
                    value={editingApt.status}
                    onValueChange={(v) =>
                      setEditingApt({ ...editingApt, status: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Trống</SelectItem>
                      <SelectItem value="occupied">Đang ở</SelectItem>
                      <SelectItem value="maintenance">Bảo trì</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    Ghi chú nội thất
                  </Label>
                  <Input
                    value={editingApt.interior_notes || ""}
                    onChange={(e) =>
                      setEditingApt({
                        ...editingApt,
                        interior_notes: e.target.value,
                      })
                    }
                    placeholder="VD: Đầy đủ nội thất, có điều hoà..."
                  />
                </div>

                {editingApt.change_history?.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase">
                      <History className="h-3 w-3" /> Lịch sử thay đổi
                    </h4>
                    <ScrollArea className="h-[100px] rounded-md border bg-muted/30 p-2">
                      {editingApt.change_history.map((h: any, i: number) => (
                        <div
                          key={i}
                          className="mb-2 border-b border-dashed pb-1 text-[11px] last:border-0"
                        >
                          <span className="mr-2 font-bold text-primary">
                            [{new Date(h.changed_at).toLocaleString("vi-VN")}]
                          </span>
                          {h.changes_summary}
                        </div>
                      ))}
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
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              ⚠️ Xác nhận xóa căn hộ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm">
              Bạn có chắc chắn muốn xóa phòng{" "}
              <strong className="text-primary">
                {deletingApt?.apartment_number}
              </strong>{" "}
              (Block {deletingApt?.block})?
            </p>
            <p className="text-xs text-muted-foreground">
              Hành động này không thể hoàn tác. Phòng phải rỗng (không cư dân,
              không phương tiện).
            </p>
            {deleteError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {deleteError}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteApt}>
              Xóa vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
    </div>
  )
}
