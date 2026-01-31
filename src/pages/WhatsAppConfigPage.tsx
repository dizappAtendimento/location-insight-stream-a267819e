import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export default function WhatsAppConfigPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-whatsapp/10">
            <WhatsAppIcon className="w-6 h-6 text-whatsapp" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuração WhatsApp</h1>
            <p className="text-muted-foreground">Configure as opções do extrator de grupos WhatsApp</p>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Ajuste as configurações do extrator de grupos WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Em breve: configurações avançadas para extração de grupos WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
