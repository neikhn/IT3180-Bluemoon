import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Ticket, User, Bell, LogOut } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"

export default function ResidentLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("role")
    navigate("/login")
  }

  const navItems = [
    { name: "Thông báo", path: "/resident/feed", icon: Bell },
    { name: "Yêu cầu", path: "/resident/tickets", icon: Ticket },
    { name: "Hồ sơ", path: "/resident/profile", icon: User },
  ]

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col border-x border-muted bg-background shadow-[0_0_40px_rgba(0,0,0,0.1)]">
      {/* Sticky top header */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-card/90 px-4 backdrop-blur">
        <div className="text-lg font-bold tracking-tight text-primary">
          BlueMoon
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Đăng xuất">
          <LogOut className="h-5 w-5 text-muted-foreground transition-colors hover:text-red-500" />
        </Button>
      </header>

      {/* Scrollable content area — grows to fill space between header and nav */}
      <main className="flex-1 overflow-y-auto bg-muted/10 p-5">
        <Outlet />
      </main>

      {/* Sticky bottom nav — always visible regardless of content height */}
      <nav className="shrink-0 border-t bg-card/95 backdrop-blur">
        <div className="flex h-[68px] items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-1.5 transition-all",
                  isActive
                    ? "-translate-y-1 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-[22px] w-[22px]" />
                <span className="text-[11px] font-medium tracking-wide">
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
