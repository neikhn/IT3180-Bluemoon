import { useState, useEffect } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Home, Building2, Users, Ticket, Bell, Car, LogOut, Menu, X } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"

const menuItems = [
  { title: "Tổng quan", icon: Home, path: "/dashboard", exact: true },
  { title: "Căn hộ", icon: Building2, path: "/dashboard/apartments" },
  { title: "Cư dân", icon: Users, path: "/dashboard/residents" },
  { title: "Phương tiện", icon: Car, path: "/dashboard/vehicles" },
  { title: "Ticket hỗ trợ", icon: Ticket, path: "/dashboard/tickets" },
  { title: "Thông báo", icon: Bell, path: "/dashboard/notifications" },
]

export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem("role")
    navigate("/login")
  }

  const NavContent = () => (
    <>
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const active = (item as any).exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          )
        })}
      </nav>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-sm font-medium text-red-500 hover:bg-red-500/10 hover:text-red-600"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </Button>
    </>
  )

  return (
    <div className="flex h-screen w-full bg-background font-sans">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-16 shrink-0 items-center border-b bg-card px-6">
          <span className="text-xl font-bold tracking-tight text-primary">
            BlueMoon Admin
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto p-4">
          <NavContent />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card shadow-xl transition-transform duration-300 md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
          <span className="text-lg font-bold tracking-tight text-primary">
            BlueMoon Admin
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto p-4">
          <NavContent />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-card/95 px-4 backdrop-blur md:h-16 md:px-8">
          {/* Hamburger — mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-bold tracking-tight text-primary md:hidden">
            BlueMoon
          </span>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">Quản trị viên</span>
        </header>
        <div className="flex-1 overflow-auto bg-muted/10 p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
