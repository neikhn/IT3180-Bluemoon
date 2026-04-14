import { useState, useEffect } from "react";
import { api } from "../lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
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
    }
    fetchData();
  }, []);

  const getOwnerName = (id: string) => residents.find(r => r._id === id)?.full_name || "Unknown";
  const getApartmentName = (id: string) => {
    const apt = apartments.find(a => a._id === id);
    return apt ? `${apt.block}-${apt.apartment_number}` : "Unknown";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Vehicles Management</h2>
        <p className="text-muted-foreground">List of registered vehicles cross-referenced with apartments.</p>
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
    </div>
  );
}
