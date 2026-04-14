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
import { CarFront, Plus } from "lucide-react";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Form state
  const [newVehicle, setNewVehicle] = useState({
    apartment_id: "",
    resident_id: "",
    license_plate: "",
    vehicle_type: "motorbike"
  });

  const fetchData = async () => {
    try {
      const [vehRes, resRes, aptRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/residents'),
        api.get('/apartments')
      ]);
      setVehicles(vehRes.data);
      setResidents(resRes.data);
      setApartments(aptRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', newVehicle);
      setIsRegisterOpen(false);
      setNewVehicle({
        apartment_id: "",
        resident_id: "",
        license_plate: "",
        vehicle_type: "motorbike"
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Lỗi đăng ký xe. Vui lòng kiểm tra định dạng biển số (VD: 30A-123.45)");
    }
  };

  const getOwnerName = (id: string) => residents.find(r => r._id === id)?.full_name || "Unknown";
  const getApartmentName = (id: string) => {
    const apt = apartments.find(a => a._id === id);
    return apt ? `${apt.block}-${apt.apartment_number}` : "Unknown";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vehicles Management</h2>
          <p className="text-muted-foreground">List of registered vehicles cross-referenced with apartments.</p>
        </div>
        <Button onClick={() => setIsRegisterOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Register Vehicle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Vehicles</CardTitle>
          <CardDescription>In-memory mapping of vehicle ownership.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card/80">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading Data...</TableCell></TableRow>
                ) : vehicles.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">No vehicles found.</TableCell></TableRow>
                ) : (
                  vehicles.map((v: any) => (
                    <TableRow key={v._id} className="hover:bg-muted/50">
                      <TableCell className="font-bold tracking-widest text-primary">{v.license_plate}</TableCell>
                      <TableCell><Badge variant="secondary">{getApartmentName(v.apartment_id)}</Badge></TableCell>
                      <TableCell className="font-medium">{getOwnerName(v.resident_id)}</TableCell>
                      <TableCell className="capitalize">{v.vehicle_type}</TableCell>
                      <TableCell>
                        <Badge variant={v.status === 'active' ? "default" : "destructive"}>{v.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Register Vehicle Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleRegister}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CarFront className="w-5 h-5 text-primary" /> Register New Vehicle
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Biển số</Label>
                <Input required value={newVehicle.license_plate} onChange={e => setNewVehicle({...newVehicle, license_plate: e.target.value})} placeholder="30A-123.45" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label className="text-xs font-bold uppercase text-muted-foreground">Loại xe</Label>
                   <Select value={newVehicle.vehicle_type} onValueChange={v => setNewVehicle({...newVehicle, vehicle_type: v})}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="motorbike">Xe máy</SelectItem>
                       <SelectItem value="car">Ô tô</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label className="text-xs font-bold uppercase text-muted-foreground">Căn hộ</Label>
                   <Select value={newVehicle.apartment_id} onValueChange={v => setNewVehicle({...newVehicle, apartment_id: v})}>
                     <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                     <SelectContent>
                       {apartments.map(apt => (
                         <SelectItem key={apt._id} value={apt._id}>{apt.block}-{apt.apartment_number}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Chủ xe (Cư dân)</Label>
                <Select value={newVehicle.resident_id} onValueChange={v => setNewVehicle({...newVehicle, resident_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Chọn cư dân..." /></SelectTrigger>
                  <SelectContent>
                    {residents.map(res => (
                      <SelectItem key={res._id} value={res._id}>{res.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Register Vehicle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
