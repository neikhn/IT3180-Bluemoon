import { useState, useEffect } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Receipt,
  Gauge,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"
import { ModeToggle } from "../components/mode-toggle"
import { clearAuth, getStoredUser } from "../lib/auth"

const menuItems = [
  { title: "Tổng quan", icon: LayoutDashboard, path: "/accountant" },
  { title: "Định mức phí", icon: FileText, path: "/accountant/fee-rates" },
  { title: "Hóa đơn", icon: Receipt, path: "/accountant/invoices" },
]

function getBreadcrumb(pathname: string) {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length === 1 && parts[0] === "accountant") return ["Tổng quan"]
  return parts.map((p) => {
    const item = menuItems.find((m) => m.path.includes(p))
    return item ? item.title : p
  })
}

export default function AccountantLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const breadcrumbs = getBreadcrumb(location.pathname)

  const handleLogout = () => {
    clearAuth()
    navigate("/login")
  }

  const NavContent = () => (
    <>
      <nav className="flex flex-col gap-1">
        {menuItems.map((item) => {
          const active = item.path === "/accountant"
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:shadow-sm"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active && "scale-110"
                )}
              />
              {!isCollapsed && <span>{item.title}</span>}
              {active && !isCollapsed && (
                <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
              )}
            </Link>
          )
        })}
      </nav>
      <Button
        variant="ghost"
        className="mt-2 w-full justify-start gap-3 text-sm font-medium text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        {!isCollapsed && "Đăng xuất"}
      </Button>
    </>
  )

  return (
    <div className="flex h-screen w-full bg-background font-sans">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border/50 bg-gradient-to-b from-card to-muted/20 transition-all duration-300 relative",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-border/50 px-4 gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Receipt className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold tracking-tight text-primary">
              BlueMoon
            </span>
          )}
          {!isCollapsed && (
            <span className="ml-1 rounded bg-chart-2/20 px-1.5 py-0.5 text-[10px] font-bold text-chart-2">
              KẾ TOÁN
            </span>
          )}
        </div>

        {/* Nav */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto p-3">
          <NavContent />
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-card shadow-md hover:bg-muted"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronRight className={cn("h-3 w-3 transition-transform", !isCollapsed && "rotate-180")} />
        </Button>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/50 bg-gradient-to-b from-card to-muted/30 shadow-2xl backdrop-blur-xl transition-transform duration-300 md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Receipt className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-primary">BlueMoon</span>
            <span className="ml-1 rounded bg-chart-2/20 px-1.5 py-0.5 text-[10px] font-bold text-chart-2">KẾ TOÁN</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto p-4">
          <NavContent />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-border/50 bg-background/80 backdrop-blur-md px-4 md:px-8 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="opacity-40">/</span>}
                <span className={cn(i === breadcrumbs.length - 1 && "text-foreground font-medium")}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>

          <div className="flex-1" />
          <ModeToggle />
          <span className="hidden text-xs font-medium text-muted-foreground md:inline">
            {getStoredUser()?.full_name || getStoredUser()?.username || "Kế toán"}
          </span>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto bg-muted/10 p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
