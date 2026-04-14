import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Ticket, FileText, Bell, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';

export default function ResidentLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('role');
    navigate('/login');
  };

  const navItems = [
    { name: 'Feed', path: '/resident/feed', icon: Bell },
    { name: 'Tickets', path: '/resident/tickets', icon: Ticket },
    { name: 'Fees', path: '/resident/fees', icon: FileText },
  ];

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-background shadow-[0_0_40px_rgba(0,0,0,0.1)] relative border-x border-muted">
      
      {/* Top App Bar */}
      <header className="h-14 border-b flex items-center justify-between px-4 sticky top-0 bg-card/90 backdrop-blur z-20 shrink-0">
        <div className="font-bold text-lg text-primary tracking-tight">BlueMoon Resident</div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
           <LogOut className="h-5 w-5 text-muted-foreground hover:text-red-500 transition-colors" />
        </Button>
      </header>
      
      {/* Content Area */}
      <main className="flex-1 overflow-y-auto bg-muted/10 pb-20 p-5">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="h-[68px] fixed sm:absolute bottom-0 w-full bg-card/95 backdrop-blur border-t flex items-center justify-around z-20 px-2 max-w-md shrink-0">
        {navItems.map((item) => {
           const isActive = location.pathname.startsWith(item.path);
           return (
             <Link key={item.path} to={item.path} className={cn("flex flex-col items-center justify-center w-full h-full gap-1.5 transition-all", isActive ? "text-primary -translate-y-1" : "text-muted-foreground hover:text-foreground")}>
               <item.icon className="h-[22px] w-[22px]" />
               <span className="text-[11px] font-medium tracking-wide">{item.name}</span>
             </Link>
           );
        })}
      </nav>
    </div>
  );
}
