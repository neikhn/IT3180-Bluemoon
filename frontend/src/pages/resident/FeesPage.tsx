import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { CreditCard, Banknote, History } from "lucide-react"

export default function FeesPage() {
  const mockFees = [
    {
      id: "F-042026",
      type: "Management Fee",
      amount: "525,000",
      status: "unpaid",
      month: "04/2026",
      due: "15/04/2026",
    },
    {
      id: "F-042026-V",
      type: "Parking Fee (Car)",
      amount: "1,200,000",
      status: "unpaid",
      month: "04/2026",
      due: "15/04/2026",
    },
    {
      id: "F-032026",
      type: "Management Fee",
      amount: "525,000",
      status: "paid",
      month: "03/2026",
      due: "15/03/2026",
    },
  ]

  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Billing & Fees</h2>
        <Button variant="ghost" size="icon" className="rounded-full">
          <History className="h-5 w-5" />
        </Button>
      </div>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl">
        <div className="absolute -top-6 -right-6 opacity-10">
          <Banknote className="h-32 w-32" />
        </div>
        <CardHeader className="relative z-10 pb-1">
          <CardDescription className="text-xs font-medium tracking-wide text-primary-foreground/80 uppercase">
            Total Due Balance
          </CardDescription>
          <CardTitle className="mt-1 text-4xl font-extrabold tracking-tighter">
            1,725,000{" "}
            <span className="text-lg font-normal opacity-80">VND</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 pt-4">
          <Button
            variant="secondary"
            className="h-12 w-full rounded-xl text-sm font-bold shadow-md transition-transform hover:scale-[1.02]"
          >
            <CreditCard className="mr-2 h-4 w-4" /> Pay with MoMo
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3 pt-2">
        <h3 className="pl-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Recent Invoices
        </h3>
        <div className="flex flex-col gap-3">
          {mockFees.map((f) => (
            <Card
              key={f.id}
              className="cursor-pointer border shadow-none transition-colors hover:bg-muted/40"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm leading-tight font-bold text-foreground/90">
                    {f.type}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Ref: {f.id} • Due {f.due}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="mb-1 text-[15px] font-bold">{f.amount} đ</div>
                  <Badge
                    variant={f.status === "paid" ? "outline" : "destructive"}
                    className="px-1.5 py-0 text-[9px] leading-relaxed tracking-widest uppercase"
                  >
                    {f.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function FileTextIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  )
}
