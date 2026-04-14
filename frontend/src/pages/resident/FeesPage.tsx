import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { CreditCard, Banknote, History } from "lucide-react";

export default function FeesPage() {
  const mockFees = [
    { id: "F-042026", type: "Management Fee", amount: "525,000", status: "unpaid", month: "04/2026", due: "15/04/2026" },
    { id: "F-042026-V", type: "Parking Fee (Car)", amount: "1,200,000", status: "unpaid", month: "04/2026", due: "15/04/2026" },
    { id: "F-032026", type: "Management Fee", amount: "525,000", status: "paid", month: "03/2026", due: "15/03/2026" }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="flex justify-between items-center">
         <h2 className="text-xl font-bold tracking-tight">Billing & Fees</h2>
         <Button variant="ghost" size="icon" className="rounded-full"><History className="h-5 w-5"/></Button>
       </div>
       
       <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl border-0 overflow-hidden relative">
         <div className="absolute -right-6 -top-6 opacity-10">
           <Banknote className="w-32 h-32" />
         </div>
         <CardHeader className="pb-1 relative z-10">
           <CardDescription className="text-primary-foreground/80 font-medium tracking-wide uppercase text-xs">Total Due Balance</CardDescription>
           <CardTitle className="text-4xl font-extrabold tracking-tighter mt-1">1,725,000 <span className="text-lg font-normal opacity-80">VND</span></CardTitle>
         </CardHeader>
         <CardContent className="relative z-10 pt-4">
           <Button variant="secondary" className="w-full rounded-xl h-12 text-sm font-bold shadow-md hover:scale-[1.02] transition-transform">
              <CreditCard className="w-4 h-4 mr-2"/> Pay with MoMo
           </Button>
         </CardContent>
       </Card>

       <div className="space-y-3 pt-2">
         <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest pl-1">Recent Invoices</h3>
         <div className="flex flex-col gap-3">
           {mockFees.map(f => (
             <Card key={f.id} className="shadow-none border cursor-pointer hover:bg-muted/40 transition-colors">
                <CardContent className="p-4 flex gap-4 items-center">
                   <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                     <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                   </div>
                   <div className="flex-1">
                     <div className="font-bold text-sm leading-tight text-foreground/90">{f.type}</div>
                     <div className="text-[11px] text-muted-foreground mt-0.5">Ref: {f.id} • Due {f.due}</div>
                   </div>
                   <div className="text-right shrink-0">
                     <div className="font-bold text-[15px] mb-1">{f.amount} đ</div>
                     <Badge variant={f.status === 'paid' ? 'outline' : 'destructive'} className="text-[9px] px-1.5 py-0 uppercase tracking-widest leading-relaxed">
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
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  )
}
