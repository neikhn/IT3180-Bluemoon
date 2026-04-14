import { useState, useEffect } from "react";
import { api } from "../lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, UserCog, History } from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";

export default function ResidentsPage() {
  const [residents, setResidents] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<any>(null);

  // Form states
  const [newRes, setNewRes] = useState({
    full_name: "",
    date_of_birth: "",
    identity_card: "",
    phone_number: "",
    email: "",
    apartment_id: "",
    relationship: "tenant"
  });

  async function fetchData() {
    try {
      const [resRes, aptRes] = await Promise.all([
        api.get('/residents'),
        api.get('/apartments')
      ]);
      setResidents(resRes.data);
      setApartments(aptRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/residents', {
        ...newRes,
        date_of_birth: new Date(newRes.date_of_birth).toISOString()
      });
      setIsRegisterOpen(false);
      setNewRes({ full_name: "", date_of_birth: "", identity_card: "", phone_number: "", email: "", apartment_id: "", relationship: "tenant" });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Lỗi đăng ký cư dân");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/residents/${editingResident._id}`, {
        full_name: editingResident.full_name,
        phone_number: editingResident.phone_number,
        email: editingResident.email,
        temporary_residence_status: editingResident.temporary_residence_status
      });
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
       alert(err.response?.data?.detail || "Lỗi cập nhật");
    }
  };

  const getApartmentForResident = (resId: string) => {
    const matched = apartments.find(apt => 
      apt.current_residents?.some((cr: any) => cr.resident_id === resId)
    );
    return matched ? matched.apartment_number : "Unknown";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Residents Directory</h2>
          <p className="text-muted-foreground">Manage resident records and cross-reference apartments.</p>
        </div>
        <Button onClick={() => setIsRegisterOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Register Resident
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Residents</CardTitle>
          <CardDescription>Full demographics database with in-memory apartment relational mapping.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card/80">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Identity Card</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading Data...</TableCell></TableRow>
                ) : residents.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">No residents found.</TableCell></TableRow>
                ) : (
                  residents.map((r: any) => (
                    <TableRow key={r._id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-semibold text-primary">{r.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">P.{getApartmentForResident(r._id)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.phone_number}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.email}</TableCell>
                      <TableCell className="font-mono text-sm">{r.identity_card}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{r.temporary_residence_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => { setEditingResident(r); setIsEditOpen(true); }}>
                           <UserCog className="w-4 h-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Register Resident Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleRegister}>
            <DialogHeader><DialogTitle>Register New Resident</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Họ và tên</Label>
                    <Input required value={newRes.full_name} onChange={e => setNewRes({...newRes, full_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Ngày sinh</Label>
                    <Input required type="date" value={newRes.date_of_birth} onChange={e => setNewRes({...newRes, date_of_birth: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">CCCD (12 số)</Label>
                    <Input required pattern="^[0-9]{12}$" value={newRes.identity_card} onChange={e => setNewRes({...newRes, identity_card: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Số điện thoại</Label>
                    <Input required pattern="^0[0-9]{9}$" value={newRes.phone_number} onChange={e => setNewRes({...newRes, phone_number: e.target.value})} />
                  </div>
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold uppercase text-muted-foreground">Email</Label>
                 <Input type="email" value={newRes.email} onChange={e => setNewRes({...newRes, email: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Căn hộ</Label>
                    <Select value={newRes.apartment_id} onValueChange={v => setNewRes({...newRes, apartment_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                      <SelectContent>
                        {apartments.map(apt => (
                          <SelectItem key={apt._id} value={apt._id}>{apt.block}-{apt.apartment_number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Quan hệ</Label>
                    <Select value={newRes.relationship} onValueChange={v => setNewRes({...newRes, relationship: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Chủ hộ</SelectItem>
                        <SelectItem value="family">Người thân</SelectItem>
                        <SelectItem value="tenant">Người thuê</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
               </div>
            </div>
            <DialogFooter>
               <Button type="submit" className="w-full">Register Resident</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Resident Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px]">
          {editingResident && (
            <form onSubmit={handleUpdate}>
              <DialogHeader><DialogTitle>Update Resident Info</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Họ và tên</Label>
                  <Input value={editingResident.full_name} onChange={e => setEditingResident({...editingResident, full_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Số điện thoại</Label>
                    <Input value={editingResident.phone_number} onChange={e => setEditingResident({...editingResident, phone_number: e.target.value})} />
                  </div>
                   <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Trạng thái cư trú</Label>
                    <Select value={editingResident.temporary_residence_status} onValueChange={v => setEditingResident({...editingResident, temporary_residence_status: v})}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="registered">Đã khai báo</SelectItem>
                         <SelectItem value="temporary">Tạm trú</SelectItem>
                         <SelectItem value="moved_out">Đã chuyển đi</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Email</Label>
                  <Input type="email" value={editingResident.email} onChange={e => setEditingResident({...editingResident, email: e.target.value})} />
                </div>
                
                <div className="pt-4 border-t">
                   <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                     <History className="w-3 h-3" /> Change History
                   </h4>
                   <ScrollArea className="h-[120px] rounded-md border p-2 bg-muted/30">
                      {editingResident.change_history?.map((h: any, i: number) => (
                        <div key={i} className="text-[11px] mb-2 border-b pb-1 last:border-0 border-dashed">
                           <span className="text-primary font-bold mr-2">[{new Date(h.changed_at).toLocaleDateString()}]</span>
                           {h.changes_summary}
                        </div>
                      ))}
                   </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">Update Record</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
