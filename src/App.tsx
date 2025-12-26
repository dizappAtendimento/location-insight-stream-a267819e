import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import InstagramExtractor from "./pages/InstagramExtractor";
import LinkedInExtractor from "./pages/LinkedInExtractor";
import WhatsAppGroupsExtractor from "./pages/WhatsAppGroupsExtractor";
import DisparosPage from "./pages/DisparosPage";
import DisparosGrupoPage from "./pages/DisparosGrupoPage";
import DisparoDetalhesPage from "./pages/DisparoDetalhesPage";
import Dashboard from "./pages/Dashboard";
import HistoricoPage from "./pages/HistoricoPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import ConexoesPage from "./pages/ConexoesPage";
import ListasPage from "./pages/ListasPage";
import ListaDetalhesPage from "./pages/ListaDetalhesPage";
import ApiDocsPage from "./pages/ApiDocsPage";
import CrmPage from "./pages/CrmPage";
import MaturadorPage from "./pages/MaturadorPage";
import WhatsAppConfigPage from "./pages/WhatsAppConfigPage";
import ContratarPage from "./pages/ContratarPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
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
              <Route path="/whatsapp-config" element={<ProtectedRoute><WhatsAppConfigPage /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/api-docs" element={<ProtectedRoute><ApiDocsPage /></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute><CrmPage /></ProtectedRoute>} />
              <Route path="/maturador" element={<ProtectedRoute><MaturadorPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
