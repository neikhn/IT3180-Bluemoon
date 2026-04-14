import { useState, useEffect } from "react";
import { api } from "../lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Plus, Eye, Pencil, Trash2, Info, History } from "lucide-react";

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [aptVehicles, setAptVehicles] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingApt, setDeletingApt] = useState<any>(null);
  const [deleteError, setDeleteError] = useState("");

  const [newApt, setNewApt] = useState({ apartment_number: "", block: "", floor: 0, area_sqm: 0, apartment_type: "standard", status: "available" });

  const fetchApts = async () => {
    try {
      const res = await api.get('/apartments');
      setApartments(res.data);
      setError(null);
    } catch (e: any) {
      setError("Kết nối Backend thất bại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApts(); }, []);

  const handleView = async (apt: any) => {
    setSelectedApt(apt);
    try {
      const res = await api.get('/vehicles');
      setAptVehicles(res.data.filter((v: any) => v.apartment_id === apt._id));
    } catch(e) { console.log(e); }
  };

  const handleCreateApt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/apartments', newApt);
      setIsCreateOpen(false);
      setNewApt({ apartment_number: "", block: "", floor: 0, area_sqm: 0, apartment_type: "standard", status: "available" });
      fetchApts();
    } catch (err: any) { alert(err.response?.data?.detail || "Lỗi khi tạo căn hộ"); }
  };

  const handleEditApt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/apartments/${editingApt._id}`, {
        area_sqm: editingApt.area_sqm,
        apartment_type: editingApt.apartment_type,
        interior_notes: editingApt.interior_notes,
        status: editingApt.status
      });
      setIsEditOpen(false);
      fetchApts();
    } catch (err: any) { alert(err.response?.data?.detail || "Lỗi cập nhật"); }
  };

  const handleDeleteApt = async () => {
    setDeleteError("");
    try {
      await api.delete(`/apartments/${deletingApt._id}`);
      setIsDeleteOpen(false);
      setDeletingApt(null);
      fetchApts();
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || "Không thể xóa căn hộ.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Apartments Management</h2>
          <p className="text-muted-foreground">Manage block apartments and view their status.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Apartment
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <span>Chỉ có thể xóa căn hộ khi phòng không còn cư dân sinh sống và không còn xe đăng ký. Hãy chuyển hết cư dân và hủy đăng ký xe trước khi xóa.</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>Use action buttons to view, edit, or delete apartments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">No.</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Residents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center">Loading Data...</TableCell></TableRow>
                ) : error ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-red-500 font-medium">⚠️ {error}</TableCell></TableRow>
                ) : apartments.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center">No apartments found.</TableCell></TableRow>
                ) : (
                  apartments.map((apt: any) => (
                    <TableRow key={apt._id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-primary">{apt.apartment_number}</TableCell>
                      <TableCell>{apt.block}</TableCell>
                      <TableCell>Floor {apt.floor}</TableCell>
                      <TableCell className="capitalize">{apt.apartment_type}</TableCell>
                      <TableCell>{apt.area_sqm} m²</TableCell>
                      <TableCell>
                        <Badge variant={apt.status === "available" ? "secondary" : apt.status === "occupied" ? "default" : "outline"}>{apt.status}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{apt.current_residents?.filter((r:any) => r.status === 'living').length || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleView(apt)} title="View details"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingApt({...apt}); setIsEditOpen(true); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setDeletingApt(apt); setDeleteError(""); setIsDeleteOpen(true); }} title="Delete" className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateApt}>
            <DialogHeader><DialogTitle>Add New Apartment</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Phòng</Label><Input required value={newApt.apartment_number} onChange={e => setNewApt({...newApt, apartment_number: e.target.value})} placeholder="301" /></div>
                <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Block</Label><Input required value={newApt.block} onChange={e => setNewApt({...newApt, block: e.target.value})} placeholder="A" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Tầng</Label><Input type="number" required value={newApt.floor} onChange={e => setNewApt({...newApt, floor: parseInt(e.target.value)})} /></div>
                <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Diện tích</Label><Input type="number" required value={newApt.area_sqm} onChange={e => setNewApt({...newApt, area_sqm: parseFloat(e.target.value)})} /></div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Loại</Label>
                <Select value={newApt.apartment_type} onValueChange={v => setNewApt({...newApt, apartment_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="duplex">Duplex</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button type="submit" className="w-full">Create Apartment</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px]">
          {editingApt && (
            <form onSubmit={handleEditApt}>
              <DialogHeader><DialogTitle>Edit Apartment {editingApt.apartment_number}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Diện tích</Label><Input type="number" value={editingApt.area_sqm} onChange={e => setEditingApt({...editingApt, area_sqm: parseFloat(e.target.value)})} /></div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Loại</Label>
                    <Select value={editingApt.apartment_type} onValueChange={v => setEditingApt({...editingApt, apartment_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="studio">Studio</SelectItem><SelectItem value="duplex">Duplex</SelectItem><SelectItem value="penthouse">Penthouse</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Trạng thái</Label>
                  <Select value={editingApt.status} onValueChange={v => setEditingApt({...editingApt, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="occupied">Occupied</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Ghi chú nội thất</Label><Input value={editingApt.interior_notes || ""} onChange={e => setEditingApt({...editingApt, interior_notes: e.target.value})} /></div>
                
                {editingApt.change_history?.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1"><History className="w-3 h-3" /> Change History</h4>
                    <ScrollArea className="h-[100px] rounded-md border p-2 bg-muted/30">
                      {editingApt.change_history.map((h: any, i: number) => (
                        <div key={i} className="text-[11px] mb-2 border-b pb-1 last:border-0 border-dashed">
                          <span className="text-primary font-bold mr-2">[{new Date(h.changed_at).toLocaleString('vi-VN')}]</span>
                          {h.changes_summary}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
              <DialogFooter><Button type="submit" className="w-full">Update Apartment</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-red-500">⚠️ Xác nhận Xóa</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm">Bạn có chắc chắn muốn xóa phòng <strong className="text-primary">{deletingApt?.apartment_number}</strong> (Block {deletingApt?.block})?</p>
            <p className="text-xs text-muted-foreground">Hành động này không thể hoàn tác. Phòng phải rỗng (không cư dân, không xe) mới xóa được.</p>
            {deleteError && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-md border border-red-200 dark:border-red-800">{deleteError}</div>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDeleteApt}>Xóa vĩnh viễn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!selectedApt} onOpenChange={(o) => !o && setSelectedApt(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Phòng {selectedApt?.apartment_number}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg">
              <div><span className="font-medium">Vị trí:</span> Tầng {selectedApt?.floor} - Block {selectedApt?.block}</div>
              <div><span className="font-medium">Diện tích:</span> {selectedApt?.area_sqm} m²</div>
              <div><span className="font-medium">Nội thất:</span> {selectedApt?.interior_notes || 'Trống'}</div>
              <div><span className="font-medium">Trạng thái:</span> <span className="capitalize">{selectedApt?.status}</span></div>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-sm">Danh sách cư dân:</h4>
              {selectedApt?.current_residents?.filter((r:any) => r.status === 'living').length === 0 ? <span className="text-sm text-muted-foreground">Chưa có ai ở</span> : (
                <div className="divide-y border rounded-md">
                  {selectedApt?.current_residents?.filter((r:any) => r.status === 'living').map((r: any, idx: number) => (
                    <div key={idx} className="p-3 text-sm flex justify-between">
                      <span className="font-medium">{r.full_name}</span>
                      <Badge variant={r.relationship === 'owner' ? 'default' : 'outline'} className="capitalize">{r.relationship}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-sm">Danh sách xe:</h4>
              {aptVehicles.length === 0 ? <span className="text-sm text-muted-foreground">Phòng này không có xe.</span> : (
                <div className="flex gap-2 flex-wrap">
                  {aptVehicles.map((v: any, idx: number) => (
                    <Badge key={idx} variant="secondary" className="px-3 py-1 font-mono tracking-widest text-sm">
                      {v.license_plate} - {v.vehicle_name || v.vehicle_type}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
