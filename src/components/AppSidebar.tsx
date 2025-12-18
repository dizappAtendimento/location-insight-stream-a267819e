import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Instagram,
  Linkedin,
  MapPin,
  History,
  Settings,
  Send,
  Smartphone,
  Users,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useAuth } from '@/contexts/AuthContext';
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
  { title: 'Conexões', url: '/conexoes', icon: Smartphone },
  { title: 'Disparos', url: '/disparos', icon: Send },
  { title: 'Disparos em Grupo', url: '/disparos-grupo', icon: Users },
];

const extractorItems = [
  { title: 'Instagram', url: '/instagram', icon: Instagram, color: 'text-pink-400' },
  { title: 'LinkedIn', url: '/linkedin', icon: Linkedin, color: 'text-[#0A66C2]' },
  { title: 'Google Places', url: '/places', icon: MapPin, color: 'text-emerald-400' },
  { title: 'WhatsApp', url: '/grupos', icon: WhatsAppIcon, color: 'text-[#25D366]' },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, setOpen } = useSidebar();
  const { user } = useAuth();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      className="dark border-r border-white/5 bg-gradient-to-b from-[hsl(225,28%,7%)] to-[hsl(225,25%,6%)]"
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className="p-5 border-b border-border/20">
        <Link to="/" className="flex items-center justify-center transition-all duration-300 hover:opacity-90">
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

      <SidebarContent className="py-4 px-2">
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 px-3 mb-2",
            collapsed && "sr-only"
          )}>
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      "group transition-all duration-200 h-10 rounded-lg mx-1",
                      isActive(item.url) 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-3 px-3">
                      <item.icon 
                        className={cn(
                          "w-[18px] h-[18px] transition-all duration-200",
                          isActive(item.url) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )} 
                        strokeWidth={2} 
                      />
                      <span className={cn(
                        "text-sm font-medium transition-colors",
                        isActive(item.url) && "text-primary"
                      )}>
                        {item.title}
                      </span>
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
                    className={cn(
                      "group transition-all duration-200 h-10 rounded-lg mx-1",
                      isActive(item.url) 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-3 px-3">
                      <item.icon 
                        className={cn(
                          "w-[18px] h-[18px] transition-all duration-200",
                          isActive(item.url) ? "text-primary" : item.color
                        )} 
                        strokeWidth={2} 
                      />
                      <span className={cn(
                        "text-sm font-medium transition-colors",
                        isActive(item.url) && "text-primary"
                      )}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Configurações */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/configuracoes')}
                  tooltip="Configurações"
                  className={cn(
                    "group transition-all duration-200 h-10 rounded-lg mx-1",
                    isActive('/configuracoes') 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Link to="/configuracoes" className="flex items-center gap-3 px-3">
                    <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
                    <span className="text-sm font-medium">Configurações</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/20">
        {/* User Name Card */}
        {!collapsed && (
          <div className="mx-1 p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-xs font-semibold">
                  {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">{user?.nome || 'Usuário'}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}