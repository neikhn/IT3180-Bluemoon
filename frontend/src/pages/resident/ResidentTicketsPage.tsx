import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { MessageSquarePlus } from "lucide-react";

export default function ResidentTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  
  // Submit new ticket
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  
  const MOCK_RES_ID = "66141c2d0f0f37dcc2660001"; // arbitrary
  const MOCK_APT_ID = "66141c2d0f0f37dcc2660000";

  const fetchTickets = () => {
    // In prod, this should append ?resident_id=XXX
    api.get('/tickets').then(res => setTickets(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    try {
      await api.post('/tickets', {
        resident_id: MOCK_RES_ID,
        apartment_id: MOCK_APT_ID,
        category: "maintenance",
        title: title,
        description: desc
      });
      setOpenNew(false);
      fetchTickets();
      setTitle(""); setDesc("");
    } catch(e) { console.error(e) }
  };

  const handleReply = async () => {
     if(!replyText) return;
     try {
       await api.post(`/tickets/${selectedTicket._id}/reply`, {
         sender_role: "resident",
         sender_id: MOCK_RES_ID,
         message: replyText
       });
       setReplyText("");
       // re-hydrate
       const res = await api.get('/tickets');
       setTickets(res.data);
       setSelectedTicket(res.data.find((t: any) => t._id === selectedTicket._id));
     } catch(e) { console.log(e) }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
       <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-bold tracking-tight">Help Center</h2>
         <Button size="sm" onClick={() => setOpenNew(true)} className="rounded-full shadow-md"><MessageSquarePlus className="w-4 h-4 mr-1.5"/> Report Issue</Button>
       </div>

       {loading ? <div className="text-center py-10 text-muted-foreground text-sm">Pinging server...</div> : null}
       {tickets.map((t: any) => (
         <Card key={t._id} className="shadow-sm mb-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedTicket(t)}>
           <CardContent className="p-4 flex flex-col gap-2">
             <div className="flex justify-between items-start">
               <span className="font-semibold text-sm line-clamp-1 pr-2">{t.title}</span>
               <Badge variant={t.status === 'open' ? 'secondary' : 'outline'} className="text-[10px] shrink-0 uppercase tracking-wider">{t.status}</Badge>
             </div>
             <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.description}</span>
           </CardContent>
         </Card>
       ))}

       {/* Create Dialog */}
       <Dialog open={openNew} onOpenChange={setOpenNew}>
         <DialogContent className="sm:max-w-md w-[92vw] rounded-2xl mx-auto p-5">
           <DialogHeader><DialogTitle className="text-lg">Report an Issue</DialogTitle></DialogHeader>
           <form onSubmit={handleCreate} className="space-y-4 pt-2">
             <div className="space-y-2">
               <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Title</Label>
               <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Broken pipe in bathroom" className="bg-muted/50"/>
             </div>
             <div className="space-y-2">
               <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Details</Label>
               <textarea required className="w-full min-h-[120px] border px-3 py-2 rounded-md text-sm bg-muted/50" placeholder="Please describe the issue in detail..." value={desc} onChange={(e) => setDesc(e.target.value)}></textarea>
             </div>
             <Button type="submit" className="w-full font-bold h-11">Submit Ticket</Button>
           </form>
         </DialogContent>
       </Dialog>

       {/* View Dialog */}
       <Dialog open={!!selectedTicket} onOpenChange={(o) => (!o && setSelectedTicket(null))}>
         <DialogContent className="sm:max-w-md w-[92vw] h-[85vh] flex flex-col rounded-2xl mx-auto p-4">
           <DialogHeader><DialogTitle className="text-sm font-mono border-b pb-3 text-center text-muted-foreground">Ticket #{selectedTicket?.ticket_code}</DialogTitle></DialogHeader>
           <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 pt-2 px-1">
              <div className="bg-primary/10 p-4 rounded-xl text-sm border-l-4 border-primary">
                 <span className="font-bold text-base leading-snug">{selectedTicket?.title}</span>
                 <p className="mt-2 text-foreground/80 leading-relaxed">{selectedTicket?.description}</p>
              </div>
              {selectedTicket?.responses?.map((r: any, idx: number) => (
                  <div key={idx} className={`px-4 py-2.5 rounded-2xl text-sm w-fit max-w-[85%] shadow-sm ${r.sender_role === 'resident' ? 'bg-primary text-primary-foreground ml-auto rounded-tr-sm' : 'bg-card border mr-auto rounded-tl-sm'}`}>
                    {r.message}
                  </div>
              ))}
           </div>
           {selectedTicket?.status !== 'closed' && (
             <div className="pt-3 border-t flex gap-2 shrink-0">
               <Input className="rounded-full bg-muted/50 focus-visible:ring-1" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Message..." onKeyDown={(e) => e.key === 'Enter' && handleReply()}/>
               <Button onClick={handleReply} disabled={!replyText} className="rounded-full shadow-sm px-6">Send</Button>
             </div>
           )}
         </DialogContent>
       </Dialog>
    </div>
  )
}
