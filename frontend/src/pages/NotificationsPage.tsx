import { useState, useEffect } from "react";
import { api } from "../lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Submit state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState("all");
  const [targetVal, setTargetVal] = useState("");
  const ADMIN_ID = "60f7a9b0c9e77c5c8e3b2e1a"; // Mock Admin ID

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/notifications', {
        title,
        content,
        scope_type: scope,
        target_value: scope !== 'all' ? targetVal : null,
        created_by: ADMIN_ID
      });
      setTitle(""); setContent(""); setTargetVal(""); setScope("all");
      fetchNotifs(); // reload history
    } catch (e) {
      console.error(e);
      alert("Failed to send notification.");
    }
  };

  return (
    <div className="animate-in fade-in duration-500 grid xl:grid-cols-2 gap-6 items-start">
      
      {/* Cột trái: Form */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Broadcast Message</h2>
          <p className="text-muted-foreground">Send an alert or news to residents across blocks.</p>
        </div>
        
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle>New Notification</CardTitle>
            <CardDescription>Compose and dispatch an official announcement directly to Resident apps.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-5">
              <div className="space-y-2">
                <Label>Announcement Title</Label>
                <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Routine Elevator Maintenance" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scope Level</Label>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger><SelectValue placeholder="To everyone" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Every Resident</SelectItem>
                      <SelectItem value="block">Specific Block</SelectItem>
                      <SelectItem value="floor">Specific Floor</SelectItem>
                      <SelectItem value="apartment">Specific Apartment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scope !== 'all' && (
                  <div className="space-y-2 animate-in slide-in-from-left-2">
                    <Label>Target Value</Label>
                    <Input required value={targetVal} onChange={(e) => setTargetVal(e.target.value)} placeholder={`E.g. ${scope === 'block' ? 'A' : '12'}`} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Message HTML Body</Label>
                <textarea 
                  required
                  className="flex min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="<p>Dear residents...</p>" 
                />
              </div>

              <Button type="submit" className="w-full font-bold">Dispatch Notification</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Cột phải: Lịch sử */}
      <div className="space-y-6">
        <div className="pt-2 xl:pt-0">
          <h2 className="text-lg font-semibold tracking-tight xl:opacity-0 invisible xl:visible h-0 xl:h-auto">.</h2>
          <p className="text-muted-foreground xl:opacity-0 invisible xl:visible h-0 xl:h-auto">.</p>
        </div>
        <Card className="flex flex-col border-muted h-[620px]">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-base">Sent History</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
             <Table>
               <TableHeader className="bg-muted/10 sticky top-0 backdrop-blur z-10 hidden">
                  <TableRow>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Reads</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                 {loading ? (
                    <TableRow><TableCell colSpan={2} className="text-center h-24">Loading history...</TableCell></TableRow>
                 ) : notifs.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">Empty History</TableCell></TableRow>
                 ) : (
                    notifs.map((n: any) => (
                      <TableRow key={n._id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-semibold text-sm mb-1 line-clamp-1">{n.title}</div>
                          <Badge variant={n.scope_type === 'all' ? "secondary" : "default"} className="text-[10px] px-1.5 py-0">
                            {n.scope_type} {n.target_value && `(${n.target_value})`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right align-top pt-4">
                          <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{n.read_by?.length || 0} views</span>
                        </TableCell>
                      </TableRow>
                    ))
                 )}
               </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
