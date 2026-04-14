import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Building2, Users, Ticket, Bell, Car } from 'lucide-react';
import { cn } from '../lib/utils';

const menuItems = [
  { title: 'Dashboard', icon: Home, path: '/dashboard', exact: true },
  { title: 'Apartments', icon: Building2, path: '/dashboard/apartments' },
  { title: 'Residents', icon: Users, path: '/dashboard/residents' },
  { title: 'Vehicles', icon: Car, path: '/dashboard/vehicles' },
  { title: 'Tickets', icon: Ticket, path: '/dashboard/tickets' },
  { title: 'Notifications', icon: Bell, path: '/dashboard/notifications' },
];

export default function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-background font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b bg-card">
          <span className="font-bold text-xl text-primary tracking-tight">BlueMoon Admin Portal</span>
        </div>
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const active = (item as any).exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 border-b flex items-center px-8 bg-card/95 backdrop-blur z-10 sticky top-0">
          <div className="flex-1" />
          <div className="flex items-center">
            <button 
                onClick={() => { localStorage.removeItem('role'); window.location.href = '/login'; }}
                className="text-sm font-medium text-red-500 hover:text-red-600 transition"
            >
                Log Out
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/10 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
