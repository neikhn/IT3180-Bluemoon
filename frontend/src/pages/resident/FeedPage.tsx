import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

export default function FeedPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // In real app, these come from Auth context
  const MOCK_RES_ID = "66141c2d0f0f37dcc2660001"; 
  const MOCK_APT_ID = "66141c2d0f0f37dcc2660000";

  const fetchFeed = async () => {
    try {
      // US-14: Fetch only relevant notifications for this apartment
      const res = await api.get(`/notifications/my-feed?apartment_id=${MOCK_APT_ID}`);
      setNotifs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read?resident_id=${MOCK_RES_ID}`);
      // Optimistic update or just re-fetch
      fetchFeed();
    } catch (e) {
      console.error(e);
    }
  };

  const isRead = (n: any) => n.read_by?.includes(MOCK_RES_ID);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
       <h2 className="text-2xl font-bold tracking-tight mb-2">My Feed</h2>
       {loading ? <div className="text-center py-10 text-muted-foreground text-sm uppercase tracking-widest animate-pulse">Synchronizing...</div> : null}
       
       {notifs.map((n: any) => (
         <Card 
           key={n._id} 
           onClick={() => handleRead(n._id)}
           className={`shadow-sm border-l-[4px] transition-all cursor-pointer ${isRead(n) ? 'border-l-muted opacity-80' : 'border-l-primary scale-[1.01] shadow-md'}`}
         >
            <CardHeader className="pb-2">
               <div className="flex justify-between items-start">
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="text-[10px] font-mono tracking-widest bg-muted uppercase">{n.scope_type}</Badge>
                    {isRead(n) ? (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium"><CheckCircle2 className="w-3 h-3"/> Read</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-primary font-bold animate-bounce"><Circle className="w-2 h-2 fill-primary"/> New</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{new Date(n.created_at).toLocaleDateString()}</span>
               </div>
               <CardTitle className={`text-[17px] leading-snug mt-1 ${!isRead(n) && 'font-bold'}`}>{n.title}</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-sm text-foreground/80 line-clamp-2 overflow-hidden text-ellipsis leading-relaxed" dangerouslySetInnerHTML={{ __html: n.content }} />
            </CardContent>
         </Card>
       ))}

       {!loading && notifs.length === 0 && (
         <div className="text-center py-20 text-muted-foreground flex flex-col items-center">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-sm font-medium">Bạn đã cập nhật hết mọi tin tức!</p>
         </div>
       )}
    </div>
  )
}
