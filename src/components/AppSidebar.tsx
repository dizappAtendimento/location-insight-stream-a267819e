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

// Itens sempre visíveis
const baseMenuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutGrid },
];

// Itens do disparador
const disparadorMenuItems = [
  { title: 'Histórico', url: '/historico', icon: Clock },
  { title: 'Conexões', url: '/conexoes', icon: Link2 },
  { title: 'Disparos', url: '/disparos', icon: Send },
  { title: 'Grupo', url: '/disparos-grupo', icon: Users2 },
  { title: 'Listas', url: '/listas', icon: ListChecks },
  { title: 'CRM', url: '/crm', icon: Columns3 },
  { title: 'Maturador', url: '/maturador', icon: Flame },
];

// Itens do extrator
const extractorItems = [
  { title: 'Instagram', url: '/instagram', icon: Instagram, colorClass: 'text-instagram' },
  { title: 'LinkedIn', url: '/linkedin', icon: Linkedin, colorClass: 'text-linkedin' },
  { title: 'Google Places', url: '/places', icon: MapPin, colorClass: 'text-places' },
  { title: 'WhatsApp', url: '/grupos', icon: WhatsAppIcon, colorClass: 'text-whatsapp' },
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

  // Filtrar menu baseado nos produtos ativos
  const hasDisparador = user?.statusDisparador === true;
  const hasExtrator = user?.statusExtrator === true;
  
  // Montar menuItems dinamicamente
  const menuItems = [
    ...baseMenuItems,
    ...(hasDisparador ? disparadorMenuItems : []),
  ];

  return (
    <Sidebar
      className="border-r border-[#1a1d2e] bg-[#0d0f17]"
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className="px-3 py-4 border-b border-slate-800/50">
        <Link to="/" className="flex items-center justify-center">
          <img 
            src={logo} 
            alt="Logo" 
            className={cn(
              "object-contain transition-all duration-200", 
              collapsed ? "w-8 h-8" : "w-24 h-7"
            )}
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex-1 flex flex-col justify-center py-4 px-2">
        {/* Menu Principal */}
        <SidebarGroup className="mb-4">
          <SidebarGroupLabel className={cn(
            "text-[10px] font-medium uppercase tracking-wider text-slate-500 px-2 mb-2",
            collapsed && "sr-only"
          )}>
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="p-0 h-auto"
                  >
                    <Link 
                      to={item.url} 
                      className={cn(
                        "group/link flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-300 ease-out w-full",
                        collapsed && "justify-center px-0",
                        isActive(item.url) 
                          ? "bg-slate-800/80 text-white shadow-lg shadow-slate-900/50" 
                          : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                      )}
                    >
                      <item.icon 
                        className="w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover/link:scale-110" 
                        strokeWidth={1.5} 
                      />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Extratores - só mostra se tem acesso ao extrator */}
        {hasExtrator && (
          <SidebarGroup className="mb-4">
            <SidebarGroupLabel className={cn(
              "text-[10px] font-medium uppercase tracking-wider text-slate-500 px-2 mb-2",
              collapsed && "sr-only"
            )}>
              Extratores
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {extractorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="p-0 h-auto"
                    >
                      <Link 
                        to={item.url} 
                        className={cn(
                          "group/link flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-300 ease-out w-full",
                          collapsed && "justify-center px-0",
                          isActive(item.url) 
                            ? "bg-slate-800/80 text-white shadow-lg shadow-slate-900/50" 
                            : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                        )}
                      >
                        <item.icon 
                          className={cn(
                            "w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover/link:scale-110",
                            item.colorClass
                          )} 
                          strokeWidth={1.5} 
                        />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>

      {/* Sistema - fixo no rodapé */}
      <SidebarFooter className="px-2 py-4 flex items-center justify-center">
        <SidebarMenu>
          {systemItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
                className="p-0 h-auto"
              >
                <Link 
                  to={item.url} 
                  className={cn(
                    "group/link flex items-center gap-3 rounded-xl transition-all duration-300 ease-out",
                    collapsed 
                      ? "justify-center p-3 w-10 h-10" 
                      : "px-3 py-3 w-full",
                    isActive(item.url) 
                      ? "bg-primary/20 text-primary shadow-lg shadow-primary/20 border border-primary/30" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "shrink-0 transition-transform duration-300 ease-out group-hover/link:scale-110",
                      collapsed ? "w-5 h-5" : "w-5 h-5"
                    )} 
                    strokeWidth={2} 
                  />
                  {!collapsed && <span className="text-sm font-semibold">{item.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
