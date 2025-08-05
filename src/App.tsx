import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { LoadingProvider } from "@/hooks/useLoading";
import { RouteLoader } from "@/components/ui/route-loader";
import { GlobalLoader } from "@/components/ui/global-loader";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Cashier from "./pages/Cashier";
import TransactionHistory from "./pages/TransactionHistory";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import BestSellingProducts from "./pages/BestSellingProducts";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Financial from "./pages/Financial";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LoadingProvider>
      <AuthProvider>
        <TooltipProvider>
          <GlobalLoader />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteLoader>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/transactions/cashier" element={<Cashier />} />
                <Route path="/transactions/history" element={<TransactionHistory />} />
                <Route path="/products" element={<Products />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/reports/daily" element={<Reports />} />
                <Route path="/reports/bestselling" element={<BestSellingProducts />} />
                <Route path="/reports/financial" element={<Financial />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouteLoader>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LoadingProvider>
  </QueryClientProvider>
);

export default App;
