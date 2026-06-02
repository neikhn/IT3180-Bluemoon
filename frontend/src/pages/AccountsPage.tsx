import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { api } from "../lib/axios"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Badge } from "../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import {
  UserCog, Plus, RefreshCw, ShieldOff, ShieldCheck, Eye, EyeOff,
  Copy, Check, Search, Shield, Receipt, User, Loader2, KeyRound
} from "lucide-react"
import { extractErrorMessage } from "../lib/utils"

interface AccountItem {
  id: string
  username: string
  role: string
  full_name?: string
  email?: string
  resident_id?: string
  status: string
  last_login?: string
  created_at: string
}

interface ResidentItem {
  _id: string
  full_name: string
  email?: string
  phone_number: string
  identity_card: string
}

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Shield },
  accountant: { label: "Kế toán", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Receipt },
  resident: { label: "Cư dân", color: "bg-green-100 text-green-700 border-green-200", icon: User },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? { label: role, color: "bg-muted text-muted-foreground border-border", icon: User }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return status === "active"
    ? <Badge variant="default" className="text-[10px] bg-emerald-500">Hoạt động</Badge>
    : <Badge variant="secondary" className="text-[10px]">Đã khóa</Badge>
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [residents, setResidents] = useState<ResidentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("accountant")

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState({ username: "", password: "", role: "accountant", resident_id: "", full_name: "", email: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [generatedResult, setGeneratedResult] = useState<{ username: string; password: string } | null>(null)

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<AccountItem | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetResult, setResetResult] = useState<{ password: string } | null>(null)
  const [resetCustomPassword, setResetCustomPassword] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [accRes, resRes] = await Promise.all([
        api.get("/accounts"),
        api.get("/residents"),
      ])
      setAccounts(accRes.data)
      setResidents(resRes.data)
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Không thể tải danh sách tài khoản."))
    } finally {
      setLoading(false)
    }
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => { fetchData() }, [fetchData])

  // Handle redirect from TicketsPage after approving household_change
  useEffect(() => {
    const newResidentId = searchParams.get("new_resident")
    if (newResidentId && residents.length > 0) {
      const r = residents.find(res => res._id === newResidentId)
      if (r) {
        setCreateForm(f => ({ ...f, role: "resident", resident_id: r._id, full_name: r.full_name, email: r.email || "", username: "" }))
        setCreateOpen(true)
        setActiveTab("resident")
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, residents, setSearchParams])

  const generatePassword = async () => {
    try {
      const res = await api.post("/accounts/generate-password")
      setCreateForm(f => ({ ...f, password: res.data.password }))
      setShowPassword(true)
    } catch {
      // fallback
      const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
      const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
      setCreateForm(f => ({ ...f, password: pwd }))
      setShowPassword(true)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const body: any = {
        username: createForm.username,
        role: createForm.role,
        full_name: createForm.full_name || undefined,
        email: createForm.email || undefined,
      }
      if (createForm.password) body.password = createForm.password
      if (createForm.role === "resident" && createForm.resident_id) body.resident_id = createForm.resident_id

      const res = await api.post("/accounts", body)
      const resultPwd = res.data.generated_password || createForm.password
      setGeneratedResult({ username: res.data.username, password: resultPwd })
      toast.success(`Tạo tài khoản '${res.data.username}' thành công!`)
      await fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Tạo tài khoản thất bại."))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCloseCreate = () => {
    setCreateOpen(false)
    setCreateForm({ username: "", password: "", role: "accountant", resident_id: "", full_name: "", email: "" })
    setGeneratedResult(null)
    setShowPassword(false)
  }

  const handleReset = async () => {
    if (!resetTarget) return
    setResetLoading(true)
    try {
      const body: any = {}
      if (resetCustomPassword.trim().length >= 6) {
        body.new_password = resetCustomPassword.trim()
      }
      const res = await api.post(`/accounts/${resetTarget.id}/reset-password`, body)
      setResetResult({ password: res.data.new_password })
      toast.success("Đã reset mật khẩu thành công!")
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Reset mật khẩu thất bại."))
    } finally {
      setResetLoading(false)
    }
  }

  const handleToggleStatus = async (account: AccountItem) => {
    const action = account.status === "active" ? "delete" : "restore"
    const msg = account.status === "active" ? "Vô hiệu hóa" : "Khôi phục"
    try {
      if (account.status === "active") {
        await api.delete(`/accounts/${account.id}`)
      } else {
        await api.post(`/accounts/${account.id}/restore`)
      }
      toast.success(`${msg} tài khoản '${account.username}' thành công.`)
      await fetchData()
    } catch (err: any) {
      toast.error(extractErrorMessage(err, `${msg} thất bại.`))
    }
  }

  const filterByRole = (role: string) => {
    const q = search.toLowerCase()
    return accounts.filter(a =>
      a.role === role &&
      (!q || a.username.toLowerCase().includes(q) || (a.full_name || "").toLowerCase().includes(q))
    )
  }

  const residentsWithoutAccount = residents.filter(r => !accounts.some(a => a.resident_id === r._id))

  const AccountRow = ({ account, showDelete = true }: { account: AccountItem; showDelete?: boolean }) => (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-4 gap-3 transition-all ${account.status !== "active" ? "opacity-60 bg-muted/30" : "bg-card hover:shadow-sm"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${account.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {(account.full_name || account.username).charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{account.full_name || account.username}</span>
            <RoleBadge role={account.role} />
            <StatusBadge status={account.status} />
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="font-mono text-xs text-muted-foreground">@{account.username}</span>
            {account.email && <span className="text-xs text-muted-foreground">· {account.email}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Tạo: {new Date(account.created_at).toLocaleDateString("vi-VN")}
            {account.last_login && ` · Đăng nhập: ${new Date(account.last_login).toLocaleDateString("vi-VN")}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm" variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={() => { setResetTarget(account); setResetResult(null) }}
        >
          <KeyRound className="h-3.5 w-3.5" /> Reset MK
        </Button>
        {showDelete && account.username !== "admin" && (
          <Button
            size="sm" variant="outline"
            className={`h-8 gap-1.5 text-xs ${account.status === "active" ? "text-destructive hover:bg-destructive/10" : "text-emerald-600 hover:bg-emerald-50"}`}
            onClick={() => handleToggleStatus(account)}
          >
            {account.status === "active"
              ? <><ShieldOff className="h-3.5 w-3.5" /> Khóa</>
              : <><ShieldCheck className="h-3.5 w-3.5" /> Khôi phục</>
            }
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" /> Quản lý tài khoản
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tạo, quản lý và phân quyền tài khoản hệ thống</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setCreateOpen(true); setGeneratedResult(null) }}>
            <Plus className="h-4 w-4" /> Tạo tài khoản
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tổng tài khoản", value: accounts.length, color: "text-primary" },
          { label: "Admin", value: accounts.filter(a => a.role === "admin").length, color: "text-purple-600" },
          { label: "Kế toán", value: accounts.filter(a => a.role === "accountant").length, color: "text-blue-600" },
          { label: "Cư dân", value: accounts.filter(a => a.role === "resident").length, color: "text-green-600" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên đăng nhập hoặc họ tên..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="admin" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Admin ({filterByRole("admin").length})</TabsTrigger>
          <TabsTrigger value="accountant" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Kế toán ({filterByRole("accountant").length})</TabsTrigger>
          <TabsTrigger value="resident" className="gap-1.5"><User className="h-3.5 w-3.5" /> Cư dân ({filterByRole("resident").length})</TabsTrigger>
        </TabsList>

        {(["admin", "accountant", "resident"] as const).map(role => (
          <TabsContent key={role} value={role} className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
              </div>
            ) : filterByRole(role).length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Không có tài khoản nào.</CardContent></Card>
            ) : (
              filterByRole(role).map(acc => (
                <AccountRow key={acc.id} account={acc} showDelete={role !== "admin"} />
              ))
            )}
            {role === "resident" && residentsWithoutAccount.length > 0 && (
              <Card className="border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm text-amber-700 dark:text-amber-400">
                    {residentsWithoutAccount.length} cư dân chưa có tài khoản
                  </CardTitle>
                  <CardDescription className="text-xs">Nhấn "Tạo tài khoản" và chọn cư dân tương ứng để cấp quyền truy cập.</CardDescription>
                </CardHeader>
                <CardContent className="pb-4 space-y-2">
                  {residentsWithoutAccount.map(r => (
                    <div key={r._id} className="flex items-center justify-between rounded-lg bg-background p-2.5 text-sm border">
                      <div>
                        <p className="font-medium">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">{r.phone_number} · CCCD: {r.identity_card}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => {
                          setCreateForm(f => ({ ...f, role: "resident", resident_id: r._id, full_name: r.full_name, email: r.email || "", username: "" }))
                          setCreateOpen(true)
                          setGeneratedResult(null)
                        }}>
                        <Plus className="h-3 w-3" /> Tạo TK
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Create Account Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={v => { if (!v) handleCloseCreate() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Tạo tài khoản mới</DialogTitle>
          </DialogHeader>

          {generatedResult ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center space-y-3">
                <Check className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">Tạo tài khoản thành công!</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-background p-2.5 border">
                    <span className="text-muted-foreground">Tên đăng nhập</span>
                    <span className="flex items-center font-mono font-bold">{generatedResult.username}<CopyButton text={generatedResult.username} /></span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-background p-2.5 border">
                    <span className="text-muted-foreground">Mật khẩu</span>
                    <span className="flex items-center font-mono font-bold text-primary">{generatedResult.password}<CopyButton text={generatedResult.password} /></span>
                  </div>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ Ghi lại thông tin này — mật khẩu sẽ không được hiển thị lại.</p>
              </div>
              <Button className="w-full" onClick={handleCloseCreate}>Đóng</Button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Vai trò</Label>
                <Select value={createForm.role} onValueChange={v => setCreateForm(f => ({ ...f, role: v, resident_id: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accountant">Kế toán</SelectItem>
                    <SelectItem value="resident">Cư dân</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {createForm.role === "resident" && (
                <div className="space-y-1.5">
                  <Label>Liên kết cư dân <span className="text-destructive">*</span></Label>
                  <Select value={createForm.resident_id} onValueChange={v => {
                    const r = residents.find(r => r._id === v)
                    setCreateForm(f => ({ ...f, resident_id: v, full_name: r?.full_name || f.full_name, email: r?.email || f.email }))
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn cư dân..." />
                    </SelectTrigger>
                    <SelectContent>
                      {residentsWithoutAccount.map(r => (
                        <SelectItem key={r._id} value={r._id}>{r.full_name} · {r.identity_card}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Tên đăng nhập <span className="text-destructive">*</span></Label>
                <Input required value={createForm.username} onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} placeholder="vd: ketoan02" />
              </div>

              {createForm.role !== "resident" && (
                <div className="space-y-1.5">
                  <Label>Họ tên</Label>
                  <Input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nguyễn Văn A" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Mật khẩu</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={createForm.password}
                      onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Để trống để tự sinh..."
                      className="pr-9"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={generatePassword} className="shrink-0 gap-1">
                    <RefreshCw className="h-3.5 w-3.5" /> Tự sinh
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Để trống để hệ thống tự tạo mật khẩu ngẫu nhiên an toàn.</p>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleCloseCreate}>Hủy</Button>
                <Button type="submit" disabled={createLoading} className="gap-1.5">
                  {createLoading && <Loader2 className="h-4 w-4 animate-spin" />} Tạo tài khoản
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!resetTarget} onOpenChange={v => { if (!v) { setResetTarget(null); setResetResult(null); setResetCustomPassword("") } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-500" /> Reset mật khẩu</DialogTitle>
          </DialogHeader>
          {resetResult ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-3">
                <p className="text-sm font-medium text-center text-emerald-700 dark:text-emerald-400">Mật khẩu mới của <span className="font-mono">@{resetTarget?.username}</span></p>
                <div className="flex items-center justify-between rounded-lg bg-background p-3 border font-mono font-bold text-lg">
                  <span>{resetResult.password}</span>
                  <CopyButton text={resetResult.password} />
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">⚠️ Ghi lại ngay — sẽ không hiển thị lại.</p>
              </div>
              <Button className="w-full" onClick={() => { setResetTarget(null); setResetResult(null); setResetCustomPassword("") }}>Đóng</Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Reset mật khẩu cho tài khoản <span className="font-semibold font-mono">@{resetTarget?.username}</span> ({resetTarget?.full_name}).
              </p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetCustomPassword("")}
                    className={`flex-1 rounded-lg border p-2.5 text-xs font-medium text-left transition-all ${!resetCustomPassword && resetCustomPassword === "" ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"}`}
                  >
                    🎲 Tự sinh ngẫu nhiên
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetCustomPassword(" ")}
                    className={`flex-1 rounded-lg border p-2.5 text-xs font-medium text-left transition-all ${resetCustomPassword.trim() !== "" || resetCustomPassword === " " ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40"}`}
                  >
                    ✏️ Đặt thủ công
                  </button>
                </div>
                {(resetCustomPassword === " " || resetCustomPassword.trim().length > 0) && (
                  <div className="space-y-1">
                    <Label className="text-xs">Mật khẩu mới (tối thiểu 6 ký tự)</Label>
                    <Input
                      type="text"
                      value={resetCustomPassword.trim()}
                      onChange={(e) => setResetCustomPassword(e.target.value || " ")}
                      placeholder="Nhập mật khẩu mới..."
                      className="font-mono"
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setResetTarget(null); setResetCustomPassword("") }}>Hủy</Button>
                <Button
                  onClick={handleReset}
                  disabled={resetLoading || (resetCustomPassword.trim().length > 0 && resetCustomPassword.trim().length < 6)}
                  className="gap-1.5 bg-amber-500 hover:bg-amber-600"
                >
                  {resetLoading && <Loader2 className="h-4 w-4 animate-spin" />} Xác nhận reset
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
