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
import { CheckCircle2, Circle, Bell, EyeOff, Eye } from "lucide-react"

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

  // Fetch the current resident's real apartment id
  useEffect(() => {
    async function init() {
      try {
        const [resRes, aptRes] = await Promise.all([
          api.get("/residents"),
          api.get("/apartments"),
        ])

        if (resRes.data.length > 0) {
          const resident = resRes.data[0]
          setResId(resident._id)

          const apt = aptRes.data.find((a: any) =>
            a.current_residents?.some(
              (cr: any) => cr.resident_id === resident._id && cr.status === "living"
            )
          )
          if (apt) {
            setAptId(apt._id)
          } else {
            setAptId("none")
          }
        } else {
          setLoading(false)
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
            onClick={() => !read && handleRead(n._id)}
            className={`cursor-pointer border-l-[4px] shadow-sm transition-all ${
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
                className="line-clamp-3 overflow-hidden text-sm leading-relaxed text-ellipsis text-foreground/80"
                dangerouslySetInnerHTML={{ __html: n.content }}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
