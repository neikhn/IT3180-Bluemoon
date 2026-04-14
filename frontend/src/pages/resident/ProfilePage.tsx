import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Save, Car, Users } from "lucide-react";

export default function ProfilePage() {
  const [residents, setResidents] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // For simplicity, pick the first resident as the "logged-in" user
  const [me, setMe] = useState<any>(null);
  const [myApt, setMyApt] = useState<any>(null);
  
  // Edit contact
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  
  // Vehicle registration ticket
  const [isVehicleOpen, setIsVehicleOpen] = useState(false);
  const [vehForm, setVehForm] = useState({ license_plate: "", vehicle_type: "motorbike", vehicle_name: "" });

  useEffect(() => {
    async function init() {
      try {
        const [resRes, aptRes] = await Promise.all([api.get('/residents'), api.get('/apartments')]);
        setResidents(resRes.data);
        setApartments(aptRes.data);
        if (resRes.data.length > 0) {
          const resident = resRes.data[0]; // Mock: first resident
          setMe(resident);
          setEditPhone(resident.phone_number);
          setEditEmail(resident.email || "");
          const apt = aptRes.data.find((a: any) => a.current_residents?.some((cr: any) => cr.resident_id === resident._id));
          setMyApt(apt);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    init();
  }, []);

  const handleSaveContact = async () => {
    if (!me) return;
    try {
      await api.patch(`/residents/${me._id}`, { phone_number: editPhone, email: editEmail });
      alert("Cập nhật thành công!");
      // Refresh
      const res = await api.get('/residents');
      const updated = res.data.find((r: any) => r._id === me._id);
      setMe(updated);
    } catch (err: any) { alert(err.response?.data?.detail || "Lỗi cập nhật"); }
  };

  const handleVehicleTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || !myApt) return;
    try {
      await api.post('/tickets', {
        resident_id: me._id,
        apartment_id: myApt._id,
        category: "vehicle_registration",
        title: `Đăng ký xe: ${vehForm.vehicle_name} (${vehForm.license_plate})`,
        description: JSON.stringify(vehForm)
      });
      setIsVehicleOpen(false);
      setVehForm({ license_plate: "", vehicle_type: "motorbike", vehicle_name: "" });
      alert("Đã gửi yêu cầu đăng ký xe! Admin sẽ duyệt trong thời gian sớm nhất.");
    } catch (err: any) { alert(err.response?.data?.detail || "Lỗi gửi yêu cầu"); }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;
  if (!me) return <div className="text-center py-10 text-muted-foreground">Không tìm thấy thông tin cư dân.</div>;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold tracking-tight">My Profile</h2>

      {/* Identity Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Thông tin cá nhân</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Họ tên</span><span className="font-semibold">{me.full_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">CCCD</span><span className="font-mono">{me.identity_card}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ngày sinh</span><span>{new Date(me.date_of_birth).toLocaleDateString('vi-VN')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Phòng</span><Badge variant="secondary">{myApt ? `${myApt.block}-${myApt.apartment_number}` : "—"}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Trạng thái</span><Badge variant="outline" className="capitalize">{me.temporary_residence_status}</Badge></div>
        </CardContent>
      </Card>

      {/* Contact Edit */}
      <Card className="shadow-sm border-primary/20">
        <CardHeader className="pb-3"><CardTitle className="text-base">Liên hệ</CardTitle><CardDescription>Bạn có thể tự cập nhật SĐT và Email.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Số điện thoại</Label><Input value={editPhone} onChange={e => setEditPhone(e.target.value)} pattern="^0[0-9]{9}$" /></div>
          <div className="space-y-2"><Label className="text-xs font-bold uppercase text-muted-foreground">Email</Label><Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
          <Button onClick={handleSaveContact} className="w-full"><Save className="w-4 h-4 mr-2" /> Lưu thay đổi</Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Yêu cầu dịch vụ</CardTitle><CardDescription>Các yêu cầu sẽ được gửi dưới dạng Ticket cho Admin duyệt.</CardDescription></CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" className="flex-1 h-14 flex-col gap-1" onClick={() => setIsVehicleOpen(true)}>
            <Car className="w-5 h-5" /><span className="text-[11px]">Đăng ký xe</span>
          </Button>
          <Button variant="outline" className="flex-1 h-14 flex-col gap-1" onClick={() => alert("Tính năng đang phát triển")}>
            <Users className="w-5 h-5" /><span className="text-[11px]">Thay đổi nhân khẩu</span>
          </Button>
        </CardContent>
      </Card>

      {/* Vehicle Registration Dialog */}
      <Dialog open={isVehicleOpen} onOpenChange={setIsVehicleOpen}>
        <DialogContent className="sm:max-w-md w-[92vw] rounded-2xl mx-auto p-5">
          <DialogHeader><DialogTitle className="text-lg">Đăng ký phương tiện</DialogTitle></DialogHeader>
          <form onSubmit={handleVehicleTicket} className="space-y-4 pt-2">
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Biển số xe</Label><Input required value={vehForm.license_plate} onChange={e => setVehForm({...vehForm, license_plate: e.target.value})} placeholder="30A-123.45" className="bg-muted/50" /></div>
            <div className="space-y-2"><Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Tên xe (Hãng + Model + Năm)</Label><Input required value={vehForm.vehicle_name} onChange={e => setVehForm({...vehForm, vehicle_name: e.target.value})} placeholder="Honda Wave RSX 2020" className="bg-muted/50" /></div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Loại xe</Label>
              <Select value={vehForm.vehicle_type} onValueChange={v => setVehForm({...vehForm, vehicle_type: v})}>
                <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="motorbike">Xe máy</SelectItem><SelectItem value="car">Ô tô</SelectItem></SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full font-bold h-11">Gửi yêu cầu đăng ký</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
