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
  MessageCircle,
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

// Itens do extrator com design circular moderno
const extractorItems = [
  { 
    title: 'Instagram', 
    url: '/instagram', 
    icon: Instagram, 
    ringColor: 'ring-pink-500',
    iconColor: 'text-pink-500',
    hoverRing: 'group-hover/link:ring-pink-400',
    activeRing: 'ring-2',
    glowColor: 'group-hover/link:shadow-[0_0_12px_rgba(236,72,153,0.4)]'
  },
  { 
    title: 'LinkedIn', 
    url: '/linkedin', 
    icon: Linkedin, 
    ringColor: 'ring-blue-500',
    iconColor: 'text-blue-500',
    hoverRing: 'group-hover/link:ring-blue-400',
    activeRing: 'ring-2',
    glowColor: 'group-hover/link:shadow-[0_0_12px_rgba(59,130,246,0.4)]'
  },
  { 
    title: 'Google Places', 
    url: '/places', 
    icon: MapPin, 
    ringColor: 'ring-cyan-500',
    iconColor: 'text-cyan-500',
    hoverRing: 'group-hover/link:ring-cyan-400',
    activeRing: 'ring-2',
    glowColor: 'group-hover/link:shadow-[0_0_12px_rgba(6,182,212,0.4)]'
  },
  { 
    title: 'WhatsApp', 
    url: '/grupos', 
    icon: WhatsAppIcon, 
    ringColor: 'ring-green-500',
    iconColor: 'text-green-500',
    hoverRing: 'group-hover/link:ring-green-400',
    activeRing: 'ring-2',
    glowColor: 'group-hover/link:shadow-[0_0_12px_rgba(34,197,94,0.4)]'
  },
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
      className="border-r border-border/30 bg-background/95 backdrop-blur-sm"
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className="px-3 py-4 border-b border-border/30">
        <Link to="/" className="flex items-center justify-center">
          <img 
            src={logo} 
            alt="Logo" 
            className={cn(
              "object-contain transition-all duration-300 ease-out", 
              collapsed ? "w-8 h-8" : "w-24 h-7"
            )}
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-4 px-2">
        {/* Menu Principal */}
        <SidebarGroup className="mb-4">
          <SidebarGroupLabel className={cn(
            "text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 mb-2",
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
                        "group/link flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200 ease-out w-full",
                        collapsed && "justify-center px-0",
                        isActive(item.url) 
                          ? "bg-muted text-foreground" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <item.icon 
                        className="w-4 h-4 shrink-0 transition-transform duration-200 ease-out group-hover/link:scale-110" 
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

        {/* Extratores - Design Circular */}
        {hasExtrator && (
          <SidebarGroup className="mb-4">
            <SidebarGroupLabel className={cn(
              "text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 mb-2",
              collapsed && "sr-only"
            )}>
              Extratores
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className={cn("space-y-2", collapsed && "flex flex-col items-center")}>
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
                          "group/link flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-300 ease-out w-full",
                          collapsed && "justify-center px-0"
                        )}
                      >
                        <div className={cn(
                          "relative p-2.5 rounded-full ring-1 transition-all duration-300 ease-out",
                          item.ringColor,
                          item.hoverRing,
                          item.glowColor,
                          isActive(item.url) && cn(item.activeRing, "shadow-lg")
                        )}>
                          <item.icon 
                            className={cn(
                              "w-4 h-4 shrink-0 transition-all duration-300 ease-out",
                              item.iconColor
                            )} 
                            strokeWidth={1.5} 
                          />
                        </div>
                        {!collapsed && (
                          <span className={cn(
                            "text-sm font-medium transition-colors duration-200",
                            isActive(item.url) ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {item.title}
                          </span>
                        )}
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
                    "group/link flex items-center gap-3 rounded-xl transition-all duration-200 ease-out",
                    collapsed 
                      ? "justify-center p-3 w-10 h-10" 
                      : "px-3 py-3 w-full",
                    isActive(item.url) 
                      ? "bg-highlight/15 text-highlight border border-highlight/30" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "shrink-0 transition-transform duration-200 ease-out group-hover/link:scale-110",
                      collapsed ? "w-5 h-5" : "w-5 h-5"
                    )} 
                    strokeWidth={2} 
                  />
                  {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
