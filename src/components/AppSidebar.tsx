import { useLocation, Link } from 'react-router-dom';
import {
  LayoutGrid,
  Clock,
  Link2,
  Send,
  Users2,
  ListChecks,
  Columns3,
  Flame,
  Instagram,
  Linkedin,
  MapPin,
  Settings,
  FileCode2,
  ChevronLeft,
  ChevronRight,
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
  { title: 'Dashboard', url: '/', icon: LayoutGrid },
  { title: 'Histórico', url: '/historico', icon: Clock },
  { title: 'Conexões', url: '/conexoes', icon: Link2 },
  { title: 'Disparos', url: '/disparos', icon: Send },
  { title: 'Disparos em Grupo', url: '/disparos-grupo', icon: Users2 },
  { title: 'Listas', url: '/listas', icon: ListChecks },
  { title: 'CRM', url: '/crm', icon: Columns3 },
  { title: 'Maturador', url: '/maturador', icon: Flame },
];

const extractorItems = [
  { title: 'Instagram', url: '/instagram', icon: Instagram, color: 'text-pink-400', bgColor: 'bg-pink-400/10' },
  { title: 'LinkedIn', url: '/linkedin', icon: Linkedin, color: 'text-[#0A66C2]', bgColor: 'bg-[#0A66C2]/10' },
  { title: 'Google Places', url: '/places', icon: MapPin, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
  { title: 'WhatsApp', url: '/grupos', icon: WhatsAppIcon, color: 'text-[#25D366]', bgColor: 'bg-[#25D366]/10' },
];

const systemItems = [
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, setOpen } = useSidebar();
  const { user } = useAuth();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      className="dark border-r border-white/[0.06] bg-[#0a0a0f]"
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className="p-4 border-b border-white/[0.06]">
        <Link to="/" className="flex items-center justify-center transition-all duration-300 hover:opacity-90">
          <img 
            src={logo} 
            alt="Logo" 
            className={cn(
              "object-contain transition-all duration-300", 
              collapsed ? "w-8 h-8" : "w-28 h-8"
            )}
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-3 px-2">
        {/* Menu Principal */}
        <SidebarGroup className="py-0 mb-2">
          <SidebarGroupLabel className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30 px-3 mb-1.5",
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
                      "group transition-all duration-200 h-9 rounded-lg mx-0.5",
                      isActive(item.url) 
                        ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10" 
                        : "hover:bg-white/[0.04] text-white/50 hover:text-white/80"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-2.5 px-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200",
                        isActive(item.url) 
                          ? "bg-primary/20" 
                          : "bg-white/[0.03] group-hover:bg-white/[0.06]"
                      )}>
                        <item.icon 
                          className={cn(
                            "w-4 h-4 transition-all duration-200",
                            isActive(item.url) ? "text-primary" : "text-white/40 group-hover:text-white/70"
                          )} 
                          strokeWidth={1.5} 
                        />
                      </div>
                      <span className={cn(
                        "text-[13px] font-medium transition-colors",
                        isActive(item.url) ? "text-primary" : "text-white/60 group-hover:text-white/90"
                      )}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Extratores */}
        <SidebarGroup className="py-0 mb-2">
          <SidebarGroupLabel className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30 px-3 mb-1.5",
            collapsed && "sr-only"
          )}>
            Extratores
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {extractorItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      "group transition-all duration-200 h-9 rounded-lg mx-0.5",
                      isActive(item.url) 
                        ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10" 
                        : "hover:bg-white/[0.04] text-white/50 hover:text-white/80"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-2.5 px-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200",
                        isActive(item.url) 
                          ? "bg-primary/20" 
                          : item.bgColor
                      )}>
                        <item.icon 
                          className={cn(
                            "w-4 h-4 transition-all duration-200",
                            isActive(item.url) ? "text-primary" : item.color
                          )} 
                          strokeWidth={1.5} 
                        />
                      </div>
                      <span className={cn(
                        "text-[13px] font-medium transition-colors",
                        isActive(item.url) ? "text-primary" : "text-white/60 group-hover:text-white/90"
                      )}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sistema */}
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30 px-3 mb-1.5",
            collapsed && "sr-only"
          )}>
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      "group transition-all duration-200 h-9 rounded-lg mx-0.5",
                      isActive(item.url) 
                        ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm shadow-primary/10" 
                        : "hover:bg-white/[0.04] text-white/50 hover:text-white/80"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-2.5 px-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200",
                        isActive(item.url) 
                          ? "bg-primary/20" 
                          : "bg-white/[0.03] group-hover:bg-white/[0.06]"
                      )}>
                        <item.icon 
                          className={cn(
                            "w-4 h-4 transition-all duration-200",
                            isActive(item.url) ? "text-primary" : "text-white/40 group-hover:text-white/70"
                          )} 
                          strokeWidth={1.5} 
                        />
                      </div>
                      <span className={cn(
                        "text-[13px] font-medium transition-colors",
                        isActive(item.url) ? "text-primary" : "text-white/60 group-hover:text-white/90"
                      )}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-white/[0.06]">
        {/* User Card */}
        {!collapsed && (
          <div className="mx-0.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs font-semibold">
                  {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white/80 truncate">{user?.nome || 'Usuário'}</p>
                <p className="text-[10px] text-white/30 truncate">{user?.Email || 'email@exemplo.com'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button 
          onClick={() => setOpen(collapsed)}
          className="mt-1.5 w-full h-7 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
