import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Users, Building2, Ticket, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../lib/axios";

export default function DashboardPage() {
  const [status, setStatus] = useState("Checking...");
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({ apartments: 0, residents: 0, tickets: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/apartments'),
      api.get('/residents'),
      api.get('/tickets')
    ]).then(([resApt, resRes, resTick]) => {
      setStatus("Online");
      setIsOnline(true);
      setStats({
        apartments: resApt.data.length,
        residents: resRes.data.length,
        tickets: resTick.data.filter((t: any) => t.status === 'open').length
      });
    }).catch(() => {
      setStatus("Offline");
      setIsOnline(false);
    });
  }, []);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
        <p className="text-muted-foreground">General statistics for BlueMoon Apartment.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Apartments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apartments}</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Residents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.residents}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tickets}</div>
          </CardContent>
        </Card>

        <Card className={`hover:shadow-md transition-shadow border-${isOnline ? 'green' : 'red'}-500/20`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {isOnline ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOnline ? 'text-green-500' : 'text-red-500'}`}>{status}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
