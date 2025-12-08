import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Instagram,
  Linkedin,
  MapPin,
  History,
  Settings,
} from 'lucide-react';
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
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

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
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="group transition-all duration-200 h-9"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4 transition-colors", isActive(item.url) && "text-primary")} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2 py-0">
          <SidebarGroupLabel className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-1", collapsed && "sr-only")}>
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
                    className="group transition-all duration-200 h-9"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4 transition-colors", item.color, isActive(item.url) && "text-primary")} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Configurações" className="transition-all duration-200">
              <Settings className="w-4 h-4" />
              <span className="font-medium">Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground/50 text-center mt-3 font-medium tracking-wide">
            v1.0.0
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
