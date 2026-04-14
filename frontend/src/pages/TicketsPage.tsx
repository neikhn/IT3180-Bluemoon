import { useState, useEffect } from "react";
import { api } from "../lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { CheckCircle2, Clock, Inbox, ShieldCheck } from "lucide-react";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const ADMIN_ID = "60f7a9b0c9e77c5c8e3b2e1a";

  const fetchData = async () => {
    try {
      const [tickRes, resRes] = await Promise.all([api.get('/tickets'), api.get('/residents')]);
      setTickets(tickRes.data); setResidents(resRes.data);
      if (selectedTicket) setSelectedTicket(tickRes.data.find((t: any) => t._id === selectedTicket._id));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReply = async () => {
    if (!replyText) return;
    try {
      await api.post(`/tickets/${selectedTicket._id}/reply`, { sender_role: "admin", sender_id: ADMIN_ID, message: replyText });
      setReplyText(""); fetchData();
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try { await api.patch(`/tickets/${id}/status`, { status: newStatus }); fetchData(); } catch (e) { console.error(e); }
  };

  const handleApprove = async (ticketId: string) => {
    try {
      await api.post(`/tickets/${ticketId}/approve`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Lỗi duyệt ticket."); }
  };

  const getAuthorName = (id: string) => residents.find(r => r._id === id)?.full_name || "Unknown Resident";

  // Parse vehicle data for display
  const parseVehicleData = (description: string) => {
    try { return JSON.parse(description); } catch { return null; }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Support Tickets</h2>
        <p className="text-muted-foreground">Manage resident support issues and complaints.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Ticket Log</CardTitle><CardDescription>Support requests tracked with author resolution.</CardDescription></CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-[30%]">Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading Data...</TableCell></TableRow>
                ) : tickets.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No tickets found.</TableCell></TableRow>
                ) : (
                  tickets.map((t: any) => (
                    <TableRow key={t._id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm text-primary">{t.ticket_code}</TableCell>
                      <TableCell>
                        <Badge variant={t.category === "vehicle_registration" ? "default" : "secondary"} className="capitalize">
                          {t.category === "vehicle_registration" ? "Đăng ký xe" : t.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[200px]">{t.title}</TableCell>
                      <TableCell>{getAuthorName(t.resident_id)}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'open' ? "destructive" : t.status === 'processing' ? "secondary" : "default"} className="flex gap-1 w-fit">
                          {t.status === 'open' && <Inbox className="w-3 h-3" />}
                          {t.status === 'processing' && <Clock className="w-3 h-3" />}
                          {t.status === 'closed' && <CheckCircle2 className="w-3 h-3" />}
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedTicket(t)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog View Ticket Details */}
      <Dialog open={!!selectedTicket} onOpenChange={(o) => (!o && setSelectedTicket(null))}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col overflow-hidden p-0">
          <div className="p-6 pb-2">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>Ticket {selectedTicket?.ticket_code}</DialogTitle>
              <div className="flex gap-2">
                {selectedTicket?.category === "vehicle_registration" && selectedTicket?.status !== 'closed' && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(selectedTicket._id)}>
                    <ShieldCheck className="w-4 h-4 mr-1" /> Approve
                  </Button>
                )}
                {selectedTicket?.status !== 'closed' && (
                  <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => updateStatus(selectedTicket._id, 'closed')}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Close
                  </Button>
                )}
              </div>
            </DialogHeader>
          </div>
          
          <div className="flex flex-col gap-4 overflow-y-auto flex-1 px-6 pb-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{selectedTicket?.category}</Badge>
                <span className="text-xs text-muted-foreground">by {selectedTicket && getAuthorName(selectedTicket.resident_id)}</span>
              </div>
              <h3 className="font-bold text-lg">{selectedTicket?.title}</h3>
              
              {/* If vehicle_registration, show parsed vehicle data nicely */}
              {selectedTicket?.category === "vehicle_registration" && (() => {
                const vd = parseVehicleData(selectedTicket.description);
                if (!vd) return <p className="text-sm text-foreground bg-muted p-4 mt-3 rounded-lg border">{selectedTicket.description}</p>;
                return (
                  <div className="bg-muted p-4 mt-3 rounded-lg border space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Biển số:</span><span className="font-mono font-bold tracking-widest">{vd.license_plate}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tên xe:</span><span className="font-medium">{vd.vehicle_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Loại xe:</span><Badge variant="secondary" className="capitalize">{vd.vehicle_type}</Badge></div>
                  </div>
                );
              })()}
              
              {selectedTicket?.category !== "vehicle_registration" && (
                <p className="text-sm text-foreground bg-muted p-4 mt-3 rounded-lg border leading-relaxed">{selectedTicket?.description}</p>
              )}
            </div>
            
            <div className="space-y-4 mt-6">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">Responses History</h4>
              <div className="flex flex-col gap-3">
                {selectedTicket?.responses?.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
                {selectedTicket?.responses?.map((r: any, idx: number) => (
                  <div key={idx} className={`p-3 rounded-lg text-sm w-fit max-w-[85%] ${r.sender_role === 'admin' ? 'bg-primary text-primary-foreground ml-auto rounded-tr-none' : 'bg-muted border mr-auto rounded-tl-none'}`}>
                    <div className="font-bold text-[10px] mb-1 opacity-70 uppercase tracking-wider">{r.sender_role}</div>
                    {r.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {selectedTicket?.status !== 'closed' ? (
            <div className="p-4 border-t flex gap-2 shrink-0 bg-muted/20">
              <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type a response to the resident..." onKeyDown={(e) => e.key === 'Enter' && handleReply()} />
              <Button onClick={handleReply} disabled={!replyText}>Send Reply</Button>
            </div>
          ) : (
            <div className="p-4 border-t text-center text-sm text-muted-foreground bg-green-50/50">✅ This ticket has been marked as resolved.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
