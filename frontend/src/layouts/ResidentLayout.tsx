import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Ticket, User, Bell, LogOut, Moon, Sun, Receipt } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"
import { useTheme } from "../components/theme-provider"
import { clearAuth, getStoredUser, setStoredUser } from "../lib/auth"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { api } from "../lib/axios"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"

export default function ResidentLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [unreadCount, setUnreadCount] = useState(0)

  const handleLogout = () => {
    clearAuth()
    navigate("/login")
  }

  const handleToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const user = getStoredUser()
  const [showForcePasswordChange, setShowForcePasswordChange] = useState(!!user?.needs_password_change)
  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [loading, setLoading] = useState(false)

  // Fetch unread notification count
  useEffect(() => {
    async function fetchUnread() {
      try {
        if (!user?.resident_id) return
        const aptRes = await api.get("/apartments")
        const apt = aptRes.data.find((a: any) =>
          a.current_residents?.some(
            (cr: any) => cr.resident_id === user.resident_id && cr.status === "living"
          )
        )
        const notifRes = apt
          ? await api.get(`/notifications/my-feed?apartment_id=${apt._id}`)
          : await api.get("/notifications")
        const unread = notifRes.data.filter(
          (n: any) => !n.read_by?.includes(user.resident_id)
        ).length
        setUnreadCount(unread)
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!passForm.currentPassword || !passForm.newPassword || !passForm.confirmPassword) {
      toast.error("Vui lòng điền đầy đủ thông tin.")
      return
    }

    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error("Mật khẩu mới và xác nhận mật khẩu không trùng khớp.")
      return
    }

    if (passForm.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có tối thiểu 6 ký tự.")
      return
    }

    setLoading(true)
    try {
      await api.patch(`/accounts/${user.id}/password`, {
        current_password: passForm.currentPassword,
        new_password: passForm.newPassword
      })

      const updatedUser = { ...user, needs_password_change: false }
      setStoredUser(updatedUser)

      toast.success("Đổi mật khẩu thành công!")
      setShowForcePasswordChange(false)
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { name: "Thông báo", path: "/resident/feed", icon: Bell },
    { name: "Yêu cầu", path: "/resident/tickets", icon: Ticket },
    { name: "Hóa đơn", path: "/resident/fees", icon: Receipt },
    { name: "Hồ sơ", path: "/resident/profile", icon: User },
  ]

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col border-x border-border/50 bg-background shadow-[0_0_60px_rgba(0,0,0,0.08)]">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Moon className="h-3.5 w-3.5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-primary">
            BlueMoon
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="h-8 w-8 rounded-lg"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto bg-muted/20 p-5">
        <Outlet />
      </main>

      {/* Bottom nav — 4 items */}
      <nav className="shrink-0 border-t border-border/50 bg-card/80 backdrop-blur-md">
        <div className="flex h-[60px] items-center justify-around px-4">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200",
                    isActive && "bg-primary/10 shadow-lg shadow-primary/20"
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-primary")} />
                  {/* Unread badge for Bell */}
                  {item.icon === Bell && unreadCount > 0 && (
                    <span className="absolute -top-0.5 right-1/2 translate-x-4 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-wide">
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Dialog đổi mật khẩu bắt buộc */}
      <Dialog open={showForcePasswordChange} onOpenChange={() => { }}>
        <DialogContent
          className="mx-auto w-[92vw] rounded-2xl p-5 sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-center">Đổi mật khẩu lần đầu</DialogTitle>
            <DialogDescription className="text-xs text-center">
              Tài khoản của bạn được cấp phát tự động. Vui lòng đổi mật khẩu mới để tiếp tục sử dụng dịch vụ.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mật khẩu hiện tại (Số điện thoại của bạn)</Label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu hiện tại"
                value={passForm.currentPassword}
                onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mật khẩu mới</Label>
              <Input
                type="password"
                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                value={passForm.newPassword}
                onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Xác nhận mật khẩu mới</Label>
              <Input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={passForm.confirmPassword}
                onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                className="h-10 text-xs"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-xs h-10"
                onClick={handleLogout}
              >
                Đăng xuất
              </Button>
              <Button type="submit" className="flex-1 text-xs h-10" disabled={loading}>
                {loading ? "Đang lưu..." : "Đổi mật khẩu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}