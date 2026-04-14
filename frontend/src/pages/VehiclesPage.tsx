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
import { ScrollArea } from "../components/ui/scroll-area";
import { CarFront, Plus, Pencil, Trash2, History } from "lucide-react";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<any>(null);

  const [newVehicle, setNewVehicle] = useState({
    apartment_id: "", resident_id: "", license_plate: "", vehicle_type: "motorbike", vehicle_name: ""
  });

  const fetchData = async () => {
    try {
      const [vehRes, resRes, aptRes] = await Promise.all([
        api.get('/vehicles'), api.get('/residents'), api.get('/apartments')
      ]);
      setVehicles(vehRes.data); setResidents(resRes.data); setApartments(aptRes.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', newVehicle);
      setIsRegisterOpen(false);
      setNewVehicle({ apartment_id: "", resident_id: "", license_plate: "", vehicle_type: "motorbike", vehicle_name: "" });
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Lỗi đăng ký xe."); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/vehicles/${editingVehicle._id}`, {
        license_plate: editingVehicle.license_plate,
        vehicle_type: editingVehicle.vehicle_type,
        vehicle_name: editingVehicle.vehicle_name,
        status: editingVehicle.status
      });
      setIsEditOpen(false); fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Lỗi cập nhật xe."); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/vehicles/${deletingVehicle._id}`);
      setIsDeleteOpen(false); setDeletingVehicle(null); fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || "Lỗi xóa xe."); }
  };

  const getOwnerName = (id: string) => residents.find(r => r._id === id)?.full_name || "Unknown";
  const getApartmentName = (id: string) => { const apt = apartments.find(a => a._id === id); return apt ? `${apt.block}-${apt.apartment_number}` : "Unknown"; };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vehicles Management</h2>
          <p className="text-muted-foreground">List of registered vehicles cross-referenced with apartments.</p>
        </div>
        <Button onClick={() => setIsRegisterOpen(true)} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Register Vehicle</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Registered Vehicles</CardTitle><CardDescription>In-memory mapping of vehicle ownership.</CardDescription></CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card/80">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading Data...</TableCell></TableRow>
                ) : vehicles.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">No vehicles found.</TableCell></TableRow>
                ) : (
                  vehicles.map((v: any) => (
                    <TableRow key={v._id} className="hover:bg-muted/50">
                      <TableCell className="font-bold tracking-widest text-primary">{v.license_plate}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.vehicle_name || "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{getApartmentName(v.apartment_id)}</Badge></TableCell>
                      <TableCell className="font-medium">{getOwnerName(v.resident_id)}</TableCell>
                      <TableCell className="capitalize">{v.vehicle_type}</TableCell>
                      <TableCell><Badge variant={v.status === 'active' ? "default" : "destructive"}>{v.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingVehicle({...v}); setIsEditOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { setDeletingVehicle(v); setIsDeleteOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
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

      {/* Register Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleRegister}>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><CarFront className="w-5 h-5 text-primary" /> Register New Vehicle</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Biển số</Label><Input required value={newVehicle.license_plate} onChange={e => setNewVehicle({...newVehicle, license_plate: e.target.value})} placeholder="30A-123.45" /></div>
              <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Tên xe (Hãng + Model + Năm)</Label><Input required value={newVehicle.vehicle_name} onChange={e => setNewVehicle({...newVehicle, vehicle_name: e.target.value})} placeholder="Honda Wave RSX 2020" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Loại xe</Label>
                  <Select value={newVehicle.vehicle_type} onValueChange={v => setNewVehicle({...newVehicle, vehicle_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="motorbike">Xe máy</SelectItem><SelectItem value="car">Ô tô</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Căn hộ</Label>
                  <Select value={newVehicle.apartment_id} onValueChange={v => setNewVehicle({...newVehicle, apartment_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                    <SelectContent>{apartments.map(apt => (<SelectItem key={apt._id} value={apt._id}>{apt.block}-{apt.apartment_number}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Chủ xe (Cư dân)</Label>
                <Select value={newVehicle.resident_id} onValueChange={v => setNewVehicle({...newVehicle, resident_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Chọn cư dân..." /></SelectTrigger>
                  <SelectContent>{residents.map(res => (<SelectItem key={res._id} value={res._id}>{res.full_name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button type="submit" className="w-full">Register Vehicle</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {editingVehicle && (
            <form onSubmit={handleEdit}>
              <DialogHeader><DialogTitle>Edit Vehicle {editingVehicle.license_plate}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Biển số</Label><Input value={editingVehicle.license_plate} onChange={e => setEditingVehicle({...editingVehicle, license_plate: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Tên xe</Label><Input value={editingVehicle.vehicle_name || ""} onChange={e => setEditingVehicle({...editingVehicle, vehicle_name: e.target.value})} placeholder="Honda Rebel 500 2025" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Loại xe</Label>
                    <Select value={editingVehicle.vehicle_type} onValueChange={v => setEditingVehicle({...editingVehicle, vehicle_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="motorbike">Xe máy</SelectItem><SelectItem value="car">Ô tô</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Trạng thái</Label>
                    <Select value={editingVehicle.status} onValueChange={v => setEditingVehicle({...editingVehicle, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                {editingVehicle.change_history?.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1"><History className="w-3 h-3" /> Change History</h4>
                    <ScrollArea className="h-[100px] rounded-md border p-2 bg-muted/30">
                      {editingVehicle.change_history.map((h: any, i: number) => (
                        <div key={i} className="text-[11px] mb-2 border-b pb-1 last:border-0 border-dashed">
                          <span className="text-primary font-bold mr-2">[{new Date(h.changed_at).toLocaleString('vi-VN')}]</span>{h.changes_summary}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
              <DialogFooter><Button type="submit" className="w-full">Update Vehicle</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-red-500">⚠️ Xác nhận Xóa Xe</DialogTitle></DialogHeader>
          <p className="text-sm py-4">Bạn có chắc chắn muốn xóa xe biển số <strong className="text-primary tracking-widest">{deletingVehicle?.license_plate}</strong>?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
