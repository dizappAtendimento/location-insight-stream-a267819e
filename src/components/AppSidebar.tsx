import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Instagram,
  Linkedin,
  MapPin,
  History,
  Settings,
  LogOut,
  Headphones,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  { title: 'Instagram', url: '/instagram', icon: Instagram, color: 'text-pink-400' },
  { title: 'LinkedIn', url: '/linkedin', icon: Linkedin, color: 'text-[#0A66C2]' },
  { title: 'Google Places', url: '/places', icon: MapPin, color: 'text-emerald-400' },
  { title: 'WhatsApp', url: '/grupos', icon: WhatsAppIcon, color: 'text-[#25D366]' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, setOpen } = useSidebar();
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

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
              
              {/* Theme Toggle - below WhatsApp */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'} 
                  className="h-10 rounded-lg mx-1 transition-all duration-200 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                  onClick={toggleTheme}
                >
                  <div className="flex items-center gap-3 px-3">
                    {theme === 'dark' ? (
                      <Moon className="w-[18px] h-[18px]" strokeWidth={2} />
                    ) : (
                      <Sun className="w-[18px] h-[18px]" strokeWidth={2} />
                    )}
                    <span className="text-sm font-medium">
                      {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/20 space-y-3">
        {/* Atendimento Card */}
        {!collapsed && (
          <div className="mx-1 p-3 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 mb-1">
              <Avatar className="w-7 h-7">
                <AvatarImage src={user?.avatar_url || undefined} alt={user?.nome || 'Usuário'} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold text-foreground">Atendimento</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 pl-[38px]">atendimento@dizapp.com.br</p>
          </div>
        )}

        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              isActive={isActive('/configuracoes')}
              tooltip="Configurações" 
              className={cn(
                "h-9 rounded-lg mx-1 transition-all duration-200",
                isActive('/configuracoes') 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <Link to="/configuracoes" className="flex items-center gap-2.5 px-3">
                <Settings className="w-4 h-4" strokeWidth={2} />
                <span className="text-[13px] font-medium">Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip="Sair" 
              className="h-9 rounded-lg mx-1 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
              onClick={handleLogout}
            >
              <div className="flex items-center gap-2.5 px-3">
                <LogOut className="w-4 h-4" strokeWidth={2} />
                <span className="text-[13px] font-medium">Sair</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}