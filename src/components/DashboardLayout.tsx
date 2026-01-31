import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import logo from '@/assets/logo.png';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function MobileHeader() {
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:hidden">
      <button
        onClick={toggleSidebar}
        className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1 flex justify-center">
        <img src={logo} alt="Logo" className="h-6 object-contain" />
      </div>
      <div className="w-9" /> {/* Spacer for balance */}
    </header>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          <MobileHeader />
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
