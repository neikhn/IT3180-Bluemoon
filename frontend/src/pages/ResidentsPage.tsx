import { useState, useEffect } from "react";
import { api } from "../lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function ResidentsPage() {
  const [residents, setResidents] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchData();
  }, []);

  const getApartmentForResident = (resId: string) => {
    const matched = apartments.find(apt => 
      apt.current_residents.some((cr: any) => cr.resident_id === resId)
    );
    return matched ? matched.apartment_number : "Unknown";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Residents Directory</h2>
        <p className="text-muted-foreground">Manage resident records and cross-reference apartments.</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading Data...</TableCell></TableRow>
                ) : residents.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No residents found.</TableCell></TableRow>
                ) : (
                  residents.map((r: any) => (
                    <TableRow key={r._id} className="hover:bg-muted/50">
                      <TableCell className="font-semibold text-primary">{r.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getApartmentForResident(r._id)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.phone_number}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.email}</TableCell>
                      <TableCell className="font-mono text-sm">{r.identity_card}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{r.temporary_residence_status}</Badge>
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
