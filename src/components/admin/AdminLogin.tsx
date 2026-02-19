import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { setAdminToken, isAdminAuthed, getApiBaseUrl } from "@/components/admin/adminAuth";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const apiBase = getApiBaseUrl();

  useEffect(() => {
    if (isAdminAuthed()) {
      navigate("/database");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let message = "Failed to login";
        if (contentType.includes("application/json")) {
          const body = await res.json().catch(() => null);
          message = body?.detail || body?.message || message;
        } else {
          const text = await res.text().catch(() => "");
          if (text) message = text;
        }
        throw new Error(message);
      }

      const data = await res.json();
      if (!data?.token) throw new Error("No session created");

      setAdminToken(data.token);
      navigate("/database");
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumBackground>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 border-border/50 bg-background/50 backdrop-blur-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <p className="text-muted-foreground text-sm mt-2">Secure access for authorized users</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-background/50"
                placeholder="pritom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>

            <Button type="submit" className="w-full btn-primary" disabled={loading}>
              {loading ? "Authenticating..." : "Login"}
            </Button>
          </form>
        </div>
      </div>
    </PremiumBackground>
  );
};

export default AdminLogin;
