import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'admin') {
      localStorage.setItem('role', 'admin');
      navigate('/dashboard');
    } else {
      localStorage.setItem('role', 'resident');
      localStorage.setItem('resident_id', 'mocked_resident_id'); 
      navigate('/resident/feed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-xl border-primary/20">
        <CardHeader className="space-y-2 text-center pb-8 border-b">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">BlueMoon</CardTitle>
          <CardDescription>Login to Digital Apartment System</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Username / Phone</Label>
              <Input 
                 placeholder="Type 'admin' or 'resident'" 
                 required 
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                 type="password" 
                 placeholder="Enter any password (Optional)" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="bg-muted/50"
              />
            </div>
            <Button type="submit" className="w-full font-bold h-11 mt-2 tracking-wide">Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
