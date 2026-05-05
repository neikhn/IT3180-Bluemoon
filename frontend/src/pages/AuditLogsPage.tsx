import { useState, useEffect } from "react"
import { api } from "../lib/axios"
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Filter, User, Activity,
  ChevronLeft, ChevronRight, FileJson, Clock
} from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { Skeleton } from "../components/ui/skeleton"

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resourceType, setResourceType] = useState<string>("all")
  const [action, setAction] = useState<string>("all")
  const [page, setPage] = useState(0)
  const limit = 15

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params: any = {
        skip: page * limit,
        limit: limit
      }
      if (resourceType !== "all") params.resource_type = resourceType
      if (action !== "all") params.action = action

      const res = await api.get("/audit-logs", { params })
      setLogs(res.data)
    } catch (error) {
      console.error("Failed to fetch audit logs", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, resourceType, action])

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200/50">CREATE</Badge>
      case 'update': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200/50">UPDATE</Badge>
      case 'delete': return <Badge className="bg-red-500/10 text-red-600 border-red-200/50">DELETE</Badge>
      case 'bulk_generate': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200/50">BULK_GENERATE</Badge>
      case 'register': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200/50">REGISTER</Badge>
      default: return <Badge variant="outline">{action.toUpperCase()}</Badge>
    }
  }

  const getResourceLabel = (type: string) => {
    const labels: any = {
      apartment: "Căn hộ",
      resident: "Cư dân",
      vehicle: "Phương tiện",
      ticket: "Ticket hỗ trợ",
      notification: "Thông báo",
      invoice: "Hóa đơn",
      fee_rate: "Định mức phí",
      meter_reading: "Số điện nước"
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Nhật ký hệ thống
          </h1>
          <p className="text-muted-foreground">Theo dõi mọi thay đổi và hoạt động của người dùng.</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 min-w-[200px]">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={resourceType} onValueChange={(v) => { setResourceType(v); setPage(0); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Loại tài nguyên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tài nguyên</SelectItem>
                  <SelectItem value="apartment">Căn hộ</SelectItem>
                  <SelectItem value="resident">Cư dân</SelectItem>
                  <SelectItem value="vehicle">Phương tiện</SelectItem>
                  <SelectItem value="ticket">Ticket hỗ trợ</SelectItem>
                  <SelectItem value="notification">Thông báo</SelectItem>
                  <SelectItem value="invoice">Hóa đơn</SelectItem>
                  <SelectItem value="fee_rate">Định mức phí</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 min-w-[150px]">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <Select value={action} onValueChange={(v) => { setAction(v); setPage(0); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Hành động" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả hành động</SelectItem>
                  <SelectItem value="create">Tạo mới</SelectItem>
                  <SelectItem value="update">Cập nhật</SelectItem>
                  <SelectItem value="delete">Xóa</SelectItem>
                  <SelectItem value="bulk_generate">Tạo hàng loạt</SelectItem>
                  <SelectItem value="register">Đăng ký</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={() => { setPage(0); fetchLogs(); }} className="h-9">
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/40 overflow-hidden bg-background/50">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Thời gian</TableHead>
                  <TableHead className="w-[120px]">Hành động</TableHead>
                  <TableHead className="w-[150px]">Tài nguyên</TableHead>
                  <TableHead className="w-[150px]">Người thực hiện</TableHead>
                  <TableHead>Nội dung chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Không tìm thấy dữ liệu nhật ký phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-medium">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 opacity-50" />
                            {new Date(log.created_at).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-4">
                            {new Date(log.created_at).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal border-border/60">
                          {getResourceLabel(log.resource_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">{log.actor_username}</span>
                            <span className="text-[9px] uppercase tracking-wider opacity-50">{log.actor_role}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/80 leading-relaxed">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                                <FileJson className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <FileJson className="h-5 w-5 text-primary" />
                                  Chi tiết thay đổi dữ liệu
                                </DialogTitle>
                              </DialogHeader>
                              <div className="flex-1 overflow-auto mt-4 p-4 rounded-xl bg-muted/30 border font-mono text-[11px] leading-relaxed">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-muted-foreground">
              Đang hiển thị trang {page + 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={logs.length < limit || loading}
                className="h-8"
              >
                Sau <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
