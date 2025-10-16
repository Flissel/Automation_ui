import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/layout/Navigation";
import Dashboard from "./pages/Dashboard";
import MultiDesktopStreams from "./pages/MultiDesktopStreams";
import VirtualDesktops from "./pages/VirtualDesktops";
import Workflow from "./pages/Workflow";
import ManualTriggerTest from "./pages/ManualTriggerTest";
import Auth from "./pages/Auth";
import DesktopClientSetup from "./pages/DesktopClientSetup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navigation />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/multi-desktop" element={<MultiDesktopStreams />} />
            <Route path="/virtual-desktops" element={<VirtualDesktops />} />
            <Route path="/workflow" element={<Workflow />} />
            <Route path="/manual-trigger-test" element={<ManualTriggerTest />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/desktop-setup" element={<DesktopClientSetup />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
