import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Critical path - load immediately
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";

// Lazy load all other pages for faster initial load
const Index = lazy(() => import("./pages/Index"));
const InstagramExtractor = lazy(() => import("./pages/InstagramExtractor"));
const LinkedInExtractor = lazy(() => import("./pages/LinkedInExtractor"));
const WhatsAppGroupsExtractor = lazy(() => import("./pages/WhatsAppGroupsExtractor"));
const CNPJExtractor = lazy(() => import("./pages/CNPJExtractor"));
const DisparosPage = lazy(() => import("./pages/DisparosPage"));
const DisparosGrupoPage = lazy(() => import("./pages/DisparosGrupoPage"));
const DisparoDetalhesPage = lazy(() => import("./pages/DisparoDetalhesPage"));
const HistoricoPage = lazy(() => import("./pages/HistoricoPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ConexoesPage = lazy(() => import("./pages/ConexoesPage"));
const ListasPage = lazy(() => import("./pages/ListasPage"));
const ListaDetalhesPage = lazy(() => import("./pages/ListaDetalhesPage"));
const ApiDocsPage = lazy(() => import("./pages/ApiDocsPage"));
const CrmPage = lazy(() => import("./pages/CrmPage"));
const MaturadorPage = lazy(() => import("./pages/MaturadorPage"));
const WhatsAppConfigPage = lazy(() => import("./pages/WhatsAppConfigPage"));
const ContratarPage = lazy(() => import("./pages/ContratarPage"));
const PerfilPage = lazy(() => import("./pages/PerfilPage"));
const VideosPage = lazy(() => import("./pages/VideosPage"));

// Optimized QueryClient with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/contratar" element={<ProtectedRoute requirePlan={false}><ContratarPage /></ProtectedRoute>} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/conexoes" element={<ProtectedRoute><ConexoesPage /></ProtectedRoute>} />
                <Route path="/disparos" element={<ProtectedRoute><DisparosPage /></ProtectedRoute>} />
                <Route path="/disparos/:id" element={<ProtectedRoute><DisparoDetalhesPage /></ProtectedRoute>} />
                <Route path="/disparos-grupo" element={<ProtectedRoute><DisparosGrupoPage /></ProtectedRoute>} />
                <Route path="/listas" element={<ProtectedRoute><ListasPage /></ProtectedRoute>} />
                <Route path="/listas/:id" element={<ProtectedRoute><ListaDetalhesPage /></ProtectedRoute>} />
                <Route path="/historico" element={<ProtectedRoute><HistoricoPage /></ProtectedRoute>} />
                <Route path="/places" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/instagram" element={<ProtectedRoute><InstagramExtractor /></ProtectedRoute>} />
                <Route path="/linkedin" element={<ProtectedRoute><LinkedInExtractor /></ProtectedRoute>} />
                <Route path="/grupos" element={<ProtectedRoute><WhatsAppGroupsExtractor /></ProtectedRoute>} />
                <Route path="/cnpj" element={<ProtectedRoute><CNPJExtractor /></ProtectedRoute>} />
                <Route path="/whatsapp-config" element={<ProtectedRoute><WhatsAppConfigPage /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><PerfilPage /></ProtectedRoute>} />
                <Route path="/api-docs" element={<ProtectedRoute><ApiDocsPage /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CrmPage /></ProtectedRoute>} />
                <Route path="/maturador" element={<ProtectedRoute><MaturadorPage /></ProtectedRoute>} />
                <Route path="/videos" element={<ProtectedRoute><VideosPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
