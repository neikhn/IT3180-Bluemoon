import { useState, useEffect } from "react";
import { api } from "../lib/axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus } from "lucide-react";

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [aptVehicles, setAptVehicles] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [newApt, setNewApt] = useState({
    apartment_number: "",
    block: "",
    floor: 0,
    area_sqm: 0,
    apartment_type: "standard",
    status: "available"
  });

  const fetchApts = async () => {
    try {
      const res = await api.get('/apartments');
      setApartments(res.data);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError("Kết nối Backend thất bại (Máy chủ tắt hoặc lỗi mạng).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApts();
  }, []);

  const handleAptClick = async (apt: any) => {
    setSelectedApt(apt);
    try {
      const res = await api.get('/vehicles');
      setAptVehicles(res.data.filter((v: any) => v.apartment_id === apt._id));
    } catch(e) {
      console.log(e);
    }
  };

  const handleCreateApt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/apartments', newApt);
      setIsCreateOpen(false);
      setNewApt({
        apartment_number: "",
        block: "",
        floor: 0,
        area_sqm: 0,
        apartment_type: "standard",
        status: "available"
      });
      fetchApts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Lỗi khi tạo căn hộ");
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

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>Click on a row to expand details about residents and vehicles.</CardDescription>
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
                  <TableHead className="text-right">Residents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">Loading Data...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-red-500 font-medium">⚠️ {error}</TableCell>
                  </TableRow>
                ) : apartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">No apartments found.</TableCell>
                  </TableRow>
                ) : (
                  apartments.map((apt: any) => (
                    <TableRow key={apt._id} className="cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleAptClick(apt)}>
                      <TableCell className="font-medium text-primary">{apt.apartment_number}</TableCell>
                      <TableCell>{apt.block}</TableCell>
                      <TableCell>Floor {apt.floor}</TableCell>
                      <TableCell className="capitalize">{apt.apartment_type}</TableCell>
                      <TableCell>{apt.area_sqm} m²</TableCell>
                      <TableCell>
                        <Badge variant={apt.status === "available" ? "secondary" : "default"}>
                          {apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{apt.current_residents?.length || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Apartment Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateApt}>
            <DialogHeader>
              <DialogTitle>Add New Apartment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apt_num" className="text-right text-xs uppercase font-bold text-muted-foreground">Phòng</Label>
                <Input id="apt_num" required className="col-span-3" value={newApt.apartment_number} onChange={e => setNewApt({...newApt, apartment_number: e.target.value})} placeholder="301" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="block" className="text-right text-xs uppercase font-bold text-muted-foreground">Block</Label>
                <Input id="block" required className="col-span-3" value={newApt.block} onChange={e => setNewApt({...newApt, block: e.target.value})} placeholder="A" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="floor" className="text-right text-xs uppercase font-bold text-muted-foreground">Tầng</Label>
                <Input id="floor" type="number" required className="col-span-3" value={newApt.floor} onChange={e => setNewApt({...newApt, floor: parseInt(e.target.value)})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="area" className="text-right text-xs uppercase font-bold text-muted-foreground">Diện tích</Label>
                <Input id="area" type="number" required className="col-span-3" value={newApt.area_sqm} onChange={e => setNewApt({...newApt, area_sqm: parseFloat(e.target.value)})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs uppercase font-bold text-muted-foreground">Loại</Label>
                <div className="col-span-3">
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
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Create Apartment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedApt} onOpenChange={(o) => !o && setSelectedApt(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Phòng {selectedApt?.apartment_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg">
               <div><span className="font-medium">Vị trí:</span> Tầng {selectedApt?.floor} - Block {selectedApt?.block}</div>
               <div><span className="font-medium">Diện tích:</span> {selectedApt?.area_sqm} m2</div>
               <div><span className="font-medium">Nội thất:</span> {selectedApt?.interior_notes || 'Trống'}</div>
               <div><span className="font-medium">Trạng thái:</span> <span className="capitalize">{selectedApt?.status}</span></div>
            </div>

            <div className="space-y-2">
               <h4 className="font-bold text-sm">Danh sách cư dân:</h4>
               {selectedApt?.current_residents?.length === 0 ? <span className="text-sm text-muted-foreground">Chưa có ai ở</span> : (
                 <div className="divide-y border rounded-md">
                   {selectedApt?.current_residents?.map((r: any, idx: number) => (
                     <div key={idx} className="p-3 text-sm flex justify-between">
                       <span className="font-medium">{r.full_name}</span>
                       <Badge variant="outline" className="capitalize">{r.relationship}</Badge>
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
                        {v.license_plate} - {v.vehicle_type}
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
