import { useState, useEffect } from "react"
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
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Badge } from "../components/ui/badge"
import { Trash2, Search, Maximize2 } from "lucide-react"
import { getStoredUser } from "../lib/auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"

const SCOPE_LABELS: Record<string, string> = {
  all: "Toàn bộ",
  block: "Block",
  floor: "Tầng",
  apartment: "Căn hộ",
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [scope, setScope] = useState("all")
  const [targetVal, setTargetVal] = useState("")
  const [selectedNotif, setSelectedNotif] = useState<any>(null)
  const ADMIN_ID = getStoredUser()?.id

  const fetchNotifs = async () => {
    try {
      const res = await api.get("/notifications")
      setNotifs(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifs()
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/notifications", {
        title,
        content,
        scope_type: scope,
        target_value: scope !== "all" ? targetVal : null,
        created_by: ADMIN_ID,
      })
      toast.success("Đã gửi thông báo thành công!")
      setTitle("")
      setContent("")
      setTargetVal("")
      setScope("all")
      fetchNotifs()
    } catch (e) {
      console.error(e)
      toast.error("Gửi thông báo thất bại.")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return
    try {
      await api.delete(`/notifications/${id}`)
      toast.success("Đã xóa thông báo.")
      fetchNotifs()
    } catch (e) {
      console.error(e)
      toast.error("Lỗi xóa thông báo.")
    }
  }

  const filtered = notifs.filter(
    (n) =>
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="grid animate-in items-start gap-6 duration-500 fade-in xl:grid-cols-2">
      {/* Left: Form */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gửi Thông báo</h2>
          <p className="text-muted-foreground">
            Phát thông báo đến cư dân theo phạm vi tùy chọn.
          </p>
        </div>
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle>Soạn thông báo mới</CardTitle>
            <CardDescription>
              Thông báo sẽ được gửi trực tiếp đến ứng dụng của cư dân.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-5">
              <div className="space-y-2">
                <Label>Tiêu đề thông báo</Label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Bảo trì thang máy định kỳ"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phạm vi gửi</Label>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phạm vi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toàn bộ cư dân</SelectItem>
                      <SelectItem value="block">Theo Block</SelectItem>
                      <SelectItem value="floor">Theo Tầng</SelectItem>
                      <SelectItem value="apartment">Theo Căn hộ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scope !== "all" && (
                  <div className="animate-in space-y-2 slide-in-from-left-2">
                    <Label>Giá trị mục tiêu</Label>
                    <Input
                      required
                      value={targetVal}
                      onChange={(e) => setTargetVal(e.target.value)}
                      placeholder={`VD: ${scope === "block" ? "A" : "12"}`}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nội dung thông báo</Label>
                <textarea
                  required
                  className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Kính gửi cư dân..."
                />
              </div>
              <Button type="submit" className="w-full font-bold">
                Gửi thông báo
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right: History */}
      <div className="space-y-6">
        <div className="pt-2 xl:pt-0">
          <h2 className="text-2xl font-bold tracking-tight">Lịch sử gửi</h2>
          <p className="text-muted-foreground">
            Danh sách thông báo đã phát trước đó.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm kiếm thông báo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card className="flex flex-col border-muted">
          <CardContent className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/10 backdrop-blur">
                <TableRow>
                  <TableHead>Chi tiết</TableHead>
                  <TableHead className="w-[60px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      Đang tải lịch sử...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {search ? "Không tìm thấy thông báo." : "Chưa có thông báo nào."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((n: any) => (
                    <TableRow key={n._id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="mb-1 line-clamp-1 text-sm font-semibold">
                          {n.title}
                        </div>
                        <div className="mb-1 line-clamp-1 text-xs text-muted-foreground break-words whitespace-pre-wrap">
                          {n.content}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              n.scope_type === "all" ? "secondary" : "default"
                            }
                            className="px-1.5 py-0 text-[10px]"
                          >
                            {SCOPE_LABELS[n.scope_type] || n.scope_type}{" "}
                            {n.target_value && `(${n.target_value})`}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => setSelectedNotif(n)}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(n._id)}
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
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedNotif} onOpenChange={(o) => !o && setSelectedNotif(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">
                {selectedNotif && (SCOPE_LABELS[selectedNotif.scope_type] || selectedNotif.scope_type)}
                {selectedNotif?.target_value && ` (${selectedNotif.target_value})`}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {selectedNotif && new Date(selectedNotif.created_at).toLocaleString("vi-VN")}
              </span>
            </div>
            <DialogTitle>{selectedNotif?.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap break-words border rounded-lg p-4 bg-muted/20">
            {selectedNotif?.content}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setSelectedNotif(null)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
