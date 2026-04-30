import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import { Moon } from "lucide-react"
import { login } from "../lib/auth"
import { toast } from "sonner"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(username, password)
      toast.success(`Chào mừng, ${user.full_name || user.username}!`)

      if (user.role === "admin") {
        navigate("/dashboard")
      } else if (user.role === "accountant") {
        navigate("/accountant")
      } else {
        navigate("/resident/feed")
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Đăng nhập thất bại."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-4">
      {/* Background decoration */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Logo + Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Moon className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">BlueMoon</h1>
          <p className="text-center text-sm text-muted-foreground">Hệ thống quản lý chung cư thông minh</p>
        </div>

        <Card className="relative overflow-hidden border-0 shadow-2xl shadow-primary/10">

          <CardHeader className="pb-6 pt-6 text-center">
            <CardTitle className="text-lg font-bold">Đăng nhập hệ thống</CardTitle>
            <CardDescription>Nhập tài khoản và mật khẩu để tiếp tục</CardDescription>
          </CardHeader>

          <CardContent className="pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tên đăng nhập</Label>
                <Input
                  placeholder="Tên đăng nhập"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-xl bg-muted/50 py-5 text-base transition-all focus:bg-background focus:ring-2 focus:ring-primary/20"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mật khẩu</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl bg-muted/50 py-5 text-base transition-all focus:bg-background focus:ring-2 focus:ring-primary/20"
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                className="mt-2 h-12 w-full rounded-xl text-base font-bold tracking-wide shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang xử lý...
                  </span>
                ) : "Đăng nhập"}
              </Button>
            </form>

            {/* Hint */}
            <div className="mt-5 rounded-xl border bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Seed Account:
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono font-bold text-foreground">admin</span> / <span className="font-mono font-bold text-foreground">admin123</span> → Admin
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono font-bold text-foreground">ketoan</span> / <span className="font-mono font-bold text-foreground">ketoan123</span> → Kế toán
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono font-bold text-foreground">resident1</span> / <span className="font-mono font-bold text-foreground">resident123</span> → Cư dân
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono font-bold text-foreground">resident2</span> / <span className="font-mono font-bold text-foreground">resident123</span> → Cư dân
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}