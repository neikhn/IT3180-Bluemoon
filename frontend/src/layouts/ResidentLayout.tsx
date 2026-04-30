import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Ticket, User, Bell, LogOut, Moon, Sun } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"
import { useTheme } from "../components/theme-provider"
import { clearAuth } from "../lib/auth"

export default function ResidentLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    clearAuth()
    navigate("/login")
  }

  const handleToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const navItems = [
    { name: "Thông báo", path: "/resident/feed", icon: Bell },
    { name: "Yêu cầu", path: "/resident/tickets", icon: Ticket },
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

      {/* Bottom nav */}
      <nav className="shrink-0 border-t border-border/50 bg-card/80 backdrop-blur-md">
        <div className="flex h-[70px] items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-1.5 transition-all duration-200",
                  isActive
                    ? "-translate-y-1 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/10 shadow-lg shadow-primary/20"
                      : "bg-muted/50"
                  )}
                >
                  <item.icon className={cn("h-[22px] w-[22px]", isActive && "text-primary")} />
                </div>
                <span className="text-[11px] font-semibold tracking-wide">
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