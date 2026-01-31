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
  Building2,
  Headphones,
  CreditCard,
  Sun,
  Moon,
  Bell,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  { title: 'CNPJ', url: '/cnpj', icon: Building2, colorClass: 'text-amber-500' },
  { title: 'Suporte', url: 'https://api.whatsapp.com/send/?phone=5561992557146&text&type=phone_number&app_absent=0', icon: Headphones, colorClass: 'text-emerald-400', external: true },
  { title: 'Planos', url: '/configuracoes?tab=planos', icon: CreditCard, colorClass: 'text-amber-400' },
];



export function AppSidebar() {
  const location = useLocation();
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
    toast.success(isDark ? 'Modo claro ativado' : 'Modo escuro ativado');
  };

  const handleNotifications = () => {
    toast.info('Você não tem novas notificações');
  };

  // Close sidebar on mobile when navigating
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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

      <SidebarContent className="py-4 px-2">
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
                      onClick={handleNavClick}
                      className={cn(
                        "group/link flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-300 ease-out w-full",
                        collapsed && !isMobile && "justify-center px-0",
                        isActive(item.url) 
                          ? "bg-slate-800/80 text-white shadow-lg shadow-slate-900/50" 
                          : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                      )}
                    >
                      <item.icon 
                        className="w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover/link:scale-110" 
                        strokeWidth={1.5} 
                      />
                      {(!collapsed || isMobile) && <span className="text-sm">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Extratores - visível para todos */}
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
                    isActive={'external' in item ? false : isActive(item.url)}
                    tooltip={item.title}
                    className="p-0 h-auto"
                  >
                    {'external' in item ? (
                      <a 
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleNavClick}
                        className={cn(
                          "group/link flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-300 ease-out w-full",
                          collapsed && !isMobile && "justify-center px-0",
                          "text-slate-400 hover:text-white hover:bg-slate-800/40"
                        )}
                      >
                        <item.icon 
                          className={cn(
                            "w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover/link:scale-110",
                            item.colorClass
                          )} 
                          strokeWidth={1.5} 
                        />
                        {(!collapsed || isMobile) && <span className="text-sm">{item.title}</span>}
                      </a>
                    ) : (
                      <Link 
                        to={item.url}
                        onClick={handleNavClick}
                        className={cn(
                          "group/link flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-300 ease-out w-full",
                          collapsed && !isMobile && "justify-center px-0",
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
                        {(!collapsed || isMobile) && <span className="text-sm">{item.title}</span>}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* Foto e nome do usuário - fixo no rodapé */}
      <SidebarFooter className="px-2 py-4 border-t border-slate-800/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all duration-200 w-full",
                collapsed && "justify-center"
              )}
            >
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user?.nome || 'Usuário'}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 ring-2 ring-slate-700">
                  {(user?.nome || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <span className="text-sm font-medium truncate">{user?.nome || 'Usuário'}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="start" 
            className="w-56 bg-[#1a1d2e] border-slate-700"
          >
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-white font-medium">{user?.nome || 'Usuário'}</span>
              <span className="text-xs text-slate-400 font-normal">{user?.Email || ''}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              onClick={toggleTheme}
              className="text-slate-300 hover:text-white focus:text-white focus:bg-slate-700/50 cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {isDark ? 'Modo Claro' : 'Modo Escuro'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleNotifications}
              className="text-slate-300 hover:text-white focus:text-white focus:bg-slate-700/50 cursor-pointer"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-slate-300 hover:text-white focus:text-white focus:bg-slate-700/50 cursor-pointer">
              <Link to="/perfil">
                <User className="w-4 h-4 mr-2" />
                Meu Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-slate-300 hover:text-white focus:text-white focus:bg-slate-700/50 cursor-pointer">
              <Link to="/configuracoes">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              onClick={logout}
              className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-slate-700/50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
