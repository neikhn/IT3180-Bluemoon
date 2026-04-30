import { useState, useEffect, useMemo } from "react"
import { api } from "../../lib/axios"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { CheckCircle2, Circle, Bell, EyeOff, Eye, ChevronRight } from "lucide-react"
import { getStoredUser } from "../../lib/auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog"

const SCOPE_LABELS: Record<string, string> = {
  all: "Toàn bộ",
  block: "Block",
  floor: "Tầng",
  apartment: "Căn hộ",
}

export default function FeedPage() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aptId, setAptId] = useState<string | null>(null)
  const [resId, setResId] = useState<string | null>(null)
  const [showRead, setShowRead] = useState(true)
  const [selectedNotif, setSelectedNotif] = useState<any>(null)

  // Fetch the current resident's real apartment id
  useEffect(() => {
    async function init() {
      try {
        const user = getStoredUser()
        if (!user?.resident_id) {
          setLoading(false)
          return
        }
        setResId(user.resident_id)

        const aptRes = await api.get("/apartments")
        const apt = aptRes.data.find((a: any) =>
          a.current_residents?.some(
            (cr: any) => cr.resident_id === user.resident_id && cr.status === "living"
          )
        )
        if (apt) {
          setAptId(apt._id)
        } else {
          setAptId("none")
        }
      } catch (e) {
        console.error(e)
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (aptId === null) return
    fetchFeed(aptId)
  }, [aptId])

  const fetchFeed = async (id: string) => {
    try {
      if (id === "none") {
        const res = await api.get("/notifications")
        setNotifs(res.data)
      } else {
        const res = await api.get(`/notifications/my-feed?apartment_id=${id}`)
        setNotifs(res.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRead = async (id: string) => {
    if (!resId) return
    try {
      await api.patch(`/notifications/${id}/read?resident_id=${resId}`)
      if (aptId) fetchFeed(aptId)
    } catch (e) {
      console.error(e)
    }
  }

  function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function renderContent(content: string): string {
  // Tránh lỗi bảo mật khi render HTML nhưng vẫn giữ được xuống dòng
  return escapeHtml(content).replace(/\n/g, "<br/>")
}

const isRead = (n: any) => resId && n.read_by?.includes(resId)

  const readCount = useMemo(
    () => notifs.filter(n => isRead(n)).length,
    [notifs, resId]
  )

  const filteredNotifs = useMemo(() => {
    if (showRead) return notifs
    return notifs.filter(n => !isRead(n))
  }, [notifs, showRead, resId])

  const unreadCount = notifs.length - readCount

  return (
    <div className="animate-in space-y-4 duration-500 fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Bảng tin</h2>
        {!loading && (
          <Badge variant="outline" className="text-xs">
            {unreadCount} chưa đọc
          </Badge>
        )}
      </div>

      {/* Toggle read notifications */}
      {!loading && readCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => setShowRead(v => !v)}
        >
          {showRead ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showRead
            ? `Ẩn ${readCount} thông báo đã đọc`
            : `Hiện ${readCount} thông báo đã đọc`}
        </Button>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : null}

      {!loading && filteredNotifs.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center text-muted-foreground">
          <Bell className="mb-4 h-12 w-12 opacity-20" />
          <p className="text-sm font-medium">
            {notifs.length === 0
              ? "Chưa có thông báo nào."
              : "Tất cả thông báo đã được đọc."}
          </p>
          <p className="mt-1 text-xs">
            {notifs.length === 0
              ? "Thông báo từ ban quản lý sẽ xuất hiện tại đây."
              : "Bấm nút ở trên để hiện lại."}
          </p>
        </div>
      )}

      {filteredNotifs.map((n: any) => {
        const read = isRead(n)
        return (
          <Card
            key={n._id}
            onClick={() => {
              setSelectedNotif(n)
              if (!read) handleRead(n._id)
            }}
            className={`cursor-pointer border-l-[4px] shadow-sm transition-all hover:translate-x-1 ${
              read
                ? "border-l-muted opacity-70"
                : "scale-[1.01] border-l-primary shadow-md"
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-muted font-mono text-[10px] tracking-widest uppercase"
                  >
                    {SCOPE_LABELS[n.scope_type] || n.scope_type}
                    {n.target_value && ` · ${n.target_value}`}
                  </Badge>
                  {read ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Đã đọc
                    </span>
                  ) : (
                    <span className="flex animate-bounce items-center gap-1 text-[10px] font-bold text-primary">
                      <Circle className="h-2 w-2 fill-primary" /> Mới
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {new Date(n.created_at).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <CardTitle
                className={`mt-1 text-[17px] leading-snug ${!read && "font-bold"}`}
              >
                {n.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="line-clamp-2 overflow-hidden text-sm leading-relaxed text-foreground/80 break-words"
                dangerouslySetInnerHTML={{ __html: renderContent(n.content) }}
              />
              <div className="mt-3 flex items-center justify-end text-[10px] font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                XEM CHI TIẾT <ChevronRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Detail Dialog */}
      <Dialog open={!!selectedNotif} onOpenChange={(open) => !open && setSelectedNotif(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary/5 p-6 pb-4">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-background">
                  {selectedNotif && (SCOPE_LABELS[selectedNotif.scope_type] || selectedNotif.scope_type)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedNotif && new Date(selectedNotif.created_at).toLocaleString("vi-VN")}
                </span>
              </div>
              <DialogTitle className="text-xl font-bold leading-tight text-primary">
                {selectedNotif?.title}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            <div 
              className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ 
                __html: selectedNotif ? renderContent(selectedNotif.content) : "" 
              }}
            />
          </div>
          <div className="border-t bg-muted/20 p-4 flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedNotif(null)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
