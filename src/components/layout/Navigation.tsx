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
  X,
  LayoutDashboard,
  MonitorPlay,
  Boxes,
  Settings
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
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Multi Desktop", path: "/multi-desktop", icon: <Grid className="w-4 h-4" /> },
    { name: "Virtual Desktops", path: "/virtual-desktops", icon: <Boxes className="w-4 h-4" /> },
    { name: "Workflow", path: "/workflow", icon: <Workflow className="w-4 h-4" /> },
    { name: "Client Setup", path: "/desktop-setup", icon: <Settings className="w-4 h-4" /> },
  ];

  // Don't show navigation on auth page when not authenticated
  if (location.pathname === "/auth" && !user) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6 max-w-[1600px] mx-auto">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4 cursor-pointer" onClick={() => navigate("/")}>
          <div className="bg-primary/10 p-2 rounded-lg">
            <Monitor className="w-6 h-6 text-primary" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Trusted Login System
            </h1>
            <p className="text-xs text-muted-foreground">Desktop Automation Platform</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={location.pathname === item.path ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate(item.path)}
              className="flex items-center space-x-2 transition-all hover:scale-105"
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
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="transition-all hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          )}
          
          {/* Mobile Menu Toggle - Always show */}
          {!user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/auth")}
              className="hidden sm:flex"
            >
              Sign In
            </Button>
          )}

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
      {isMenuOpen && (
        <div className="md:hidden border-t bg-card/95 backdrop-blur animate-in slide-in-from-top-2">
          <div className="px-6 py-4 space-y-2">
            {navItems.map((item, index) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  navigate(item.path);
                  setIsMenuOpen(false);
                }}
                className="w-full justify-start flex items-center space-x-3 transition-all hover:translate-x-1"
                style={{ animationDelay: `${index * 50}ms` }}
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