import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          {/* Top Bar */}
          <header className="h-14 border-b border-border/30 bg-background/80 backdrop-blur-sm flex items-center justify-end px-6 gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  >
                    {theme === 'dark' ? (
                      <Moon className="w-[18px] h-[18px]" />
                    ) : (
                      <Sun className="w-[18px] h-[18px]" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sair</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar 
                    className="h-8 w-8 cursor-pointer ring-2 ring-border/30 hover:ring-primary/50 transition-all"
                    onClick={() => navigate('/configuracoes')}
                  >
                    <AvatarImage src={user?.avatar_url || undefined} alt={user?.nome || 'Usuário'} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{user?.nome || 'Perfil'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </header>
          
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
