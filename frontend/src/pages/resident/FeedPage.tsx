import { useState, useEffect } from "react";
import { api } from "../../lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function FeedPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Giả lập load feed
    api.get('/notifications').then(res => {
      setNotifs(res.data);
    }).catch(e => console.error(e)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
       <h2 className="text-2xl font-bold tracking-tight mb-2">My Feed</h2>
       {loading ? <div className="text-center py-10 text-muted-foreground">Pinging server...</div> : null}
       
       {notifs.map((n: any) => (
         <Card key={n._id} className="shadow-sm border-l-[3px] border-l-primary cursor-pointer hover:bg-muted/30">
            <CardHeader className="pb-2">
               <div className="flex justify-between items-start">
                  <Badge variant="outline" className="mb-2 text-[10px] font-mono tracking-widest bg-muted uppercase">{n.scope_type}</Badge>
                  <span className="text-xs text-muted-foreground italic">Brand new</span>
               </div>
               <CardTitle className="text-[17px] leading-snug">{n.title}</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-sm text-foreground/80 line-clamp-3 overflow-hidden text-ellipsis leading-relaxed" dangerouslySetInnerHTML={{ __html: n.content }} />
            </CardContent>
         </Card>
       ))}

       {!loading && notifs.length === 0 && (
         <div className="text-center py-20 text-muted-foreground flex flex-col items-center">
            <div className="text-4xl mb-4">📭</div>
            <p>No new announcements.</p>
         </div>
       )}
    </div>
  )
}
