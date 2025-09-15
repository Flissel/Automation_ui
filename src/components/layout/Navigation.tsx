import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Monitor, 
  Workflow, 
  LogOut,
  Grid,
  Menu,
  X
} from "lucide-react";
import { User } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";

const Navigation = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: <Monitor className="w-4 h-4" /> },
    { name: "Live Desktop", path: "/live-desktop", icon: <Monitor className="w-4 h-4" /> },
    { name: "Multi Desktop", path: "/multi-desktop", icon: <Grid className="w-4 h-4" /> },
    { name: "Workflow", path: "/workflow", icon: <Workflow className="w-4 h-4" /> },
  ];

  // Don't show navigation on auth page when not authenticated
  if (location.pathname === "/auth" && !user) {
    return null;
  }

  return (
    <nav className="border-b bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Monitor className="w-8 h-8 text-primary" />
          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold">TRAE Unity AI</h1>
            <p className="text-xs text-muted-foreground">Desktop Automation Platform</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {user && navItems.map((item) => (
            <Button
              key={item.path}
              variant={location.pathname === item.path ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate(item.path)}
              className="flex items-center space-x-2"
            >
              {item.icon}
              <span>{item.name}</span>
            </Button>
          ))}
        </div>

        {/* User Menu and Mobile Toggle */}
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          )}
          
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && user && (
        <div className="md:hidden border-t bg-card">
          <div className="px-6 py-4 space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  navigate(item.path);
                  setIsMenuOpen(false);
                }}
                className="w-full justify-start flex items-center space-x-2"
              >
                {item.icon}
                <span>{item.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;