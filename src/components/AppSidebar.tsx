import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Instagram,
  Linkedin,
  MapPin,
  History,
  Settings,
  LogOut,
  Shield,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Histórico', url: '/historico', icon: History },
];

const extractorItems = [
  { title: 'Instagram', url: '/instagram', icon: Instagram, color: 'group-hover:text-pink-400' },
  { title: 'LinkedIn', url: '/linkedin', icon: Linkedin, color: 'group-hover:text-[#0A66C2]' },
  { title: 'Google Places', url: '/places', icon: MapPin, color: 'group-hover:text-emerald-400' },
  { title: 'Grupos de WhatsApp', url: '/whatsapp-groups', icon: MessageCircle, color: 'group-hover:text-[#25D366]' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const collapsed = state === 'collapsed';
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase.functions.invoke('admin-api', {
          body: { action: 'check-admin', userId: user.id }
        });
        setIsAdmin(data?.isAdmin || false);
      } catch (err) {
        console.error('Error checking admin:', err);
      }
    };
    checkAdmin();
  }, [user?.id]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <Sidebar
      className="border-r border-border/30 bg-sidebar-background"
      collapsible="icon"
    >
      <SidebarHeader className="p-5 border-b border-border/30">
        <Link to="/" className="flex items-center justify-center transition-transform hover:scale-105">
          <img 
            src={logo} 
            alt="Logo" 
            className={cn(
              "object-contain transition-all duration-300", 
              collapsed ? "w-10 h-10" : "w-36 h-10"
            )}
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-1", collapsed && "sr-only")}>
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="group transition-all duration-200 h-9"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={cn("w-5 h-5 transition-colors", isActive(item.url) && "text-primary")} strokeWidth={3} />
                      <span className="font-semibold text-[15px]">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {extractorItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="group transition-all duration-200 h-9"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={cn("w-5 h-5 transition-colors", item.color, isActive(item.url) && "text-primary")} strokeWidth={3} />
                      <span className="font-semibold text-[15px]">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/10">
        {!collapsed && user && (
          <div className="px-2 py-2 mb-2 rounded-lg bg-gradient-to-r from-muted/40 to-transparent border-l-2 border-primary/50">
            <p className="text-sm font-medium text-foreground truncate">{user.nome || 'Usuário'}</p>
            <p className="text-[11px] text-muted-foreground/70 truncate">{user.Email}</p>
          </div>
        )}
        <SidebarMenu className="gap-0.5">
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                isActive={isActive('/admin')}
                tooltip="Admin" 
                className="h-9 rounded-md transition-all duration-200 hover:bg-muted/50"
              >
                <Link to="/admin" className="flex items-center gap-2.5">
                  <Shield className={cn("w-[18px] h-[18px] transition-colors", isActive('/admin') ? "text-primary" : "text-amber-500")} strokeWidth={1.5} />
                  <span className="text-[13px] font-medium">Painel Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              isActive={isActive('/configuracoes')}
              tooltip="Configurações" 
              className="h-9 rounded-md transition-all duration-200 hover:bg-muted/50"
            >
              <Link to="/configuracoes" className="flex items-center gap-2.5">
                <Settings className="w-[18px] h-[18px] text-muted-foreground transition-colors" strokeWidth={1.5} />
                <span className="text-[13px] font-medium">Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Sair" 
              className="h-9 rounded-md transition-all duration-200 hover:bg-muted/50"
              onClick={handleLogout}
            >
              <LogOut className="w-[18px] h-[18px] text-muted-foreground transition-colors" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
