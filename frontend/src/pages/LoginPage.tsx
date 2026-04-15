import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { Building2 } from "lucide-react"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.toLowerCase() === "admin") {
      localStorage.setItem("role", "admin")
      navigate("/dashboard")
    } else {
      localStorage.setItem("role", "resident")
      localStorage.setItem("resident_id", "mocked_resident_id")
      navigate("/resident/feed")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm border-primary/20 shadow-xl">
        <CardHeader className="space-y-3 border-b pb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">
            BlueMoon
          </CardTitle>
          <CardDescription>
            Hệ thống quản lý chung cư thông minh
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên đăng nhập</Label>
              <Input
                placeholder="Nhập 'admin' hoặc 'resident'"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-muted/50"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label>Mật khẩu</Label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu (tùy chọn)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/50"
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="mt-2 h-11 w-full font-bold tracking-wide"
            >
              Đăng nhập
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Dùng <span className="font-mono font-bold">admin</span> để vào trang quản trị
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
