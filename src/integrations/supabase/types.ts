export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      SAAS_Chat_Labels: {
        Row: {
          chatName: string | null
          created_at: string
          id: number
          idConexao: number
          idUsuario: string
          instanceName: string
          labelColor: string | null
          labelId: string
          labelName: string | null
          remoteJid: string
          updated_at: string
        }
        Insert: {
          chatName?: string | null
          created_at?: string
          id?: number
          idConexao: number
          idUsuario: string
          instanceName: string
          labelColor?: string | null
          labelId: string
          labelName?: string | null
          remoteJid: string
          updated_at?: string
        }
        Update: {
          chatName?: string | null
          created_at?: string
          id?: number
          idConexao?: number
          idUsuario?: string
          instanceName?: string
          labelColor?: string | null
          labelId?: string
          labelName?: string | null
          remoteJid?: string
          updated_at?: string
        }
        Relationships: []
      }
      SAAS_Conexões: {
        Row: {
          Apikey: string | null
          created_at: string
          crmAtivo: boolean | null
          FotoPerfil: string | null
          id: number
          idUsuario: string | null
          instanceName: string | null
          NomeConexao: string | null
          Telefone: string | null
        }
        Insert: {
          Apikey?: string | null
          created_at?: string
          crmAtivo?: boolean | null
          FotoPerfil?: string | null
          id?: number
          idUsuario?: string | null
          instanceName?: string | null
          NomeConexao?: string | null
          Telefone?: string | null
        }
        Update: {
          Apikey?: string | null
          created_at?: string
          crmAtivo?: boolean | null
          FotoPerfil?: string | null
          id?: number
          idUsuario?: string | null
          instanceName?: string | null
          NomeConexao?: string | null
          Telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SAAS_Conexões_idUsuario_fkey"
            columns: ["idUsuario"]
            isOneToOne: false
            referencedRelation: "SAAS_Usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Conexões_idUsuario_fkey"
            columns: ["idUsuario"]
            isOneToOne: false
            referencedRelation: "vw_Usuarios_Com_Plano"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_configuracoes: {
        Row: {
          categoria: string | null
          chave: string
          created_at: string
          descricao: string | null
          id: number
          tipo: string | null
          updated_at: string
          valor: string | null
        }
        Insert: {
          categoria?: string | null
          chave: string
          created_at?: string
          descricao?: string | null
          id?: number
          tipo?: string | null
          updated_at?: string
          valor?: string | null
        }
        Update: {
          categoria?: string | null
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: number
          tipo?: string | null
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      SAAS_Contatos: {
        Row: {
          atributos: Json
          created_at: string
          id: number
          idLista: number
          idUsuario: string
          nome: string | null
          telefone: string | null
        }
        Insert: {
          atributos?: Json
          created_at?: string
          id?: number
          idLista: number
          idUsuario: string
          nome?: string | null
          telefone?: string | null
        }
        Update: {
          atributos?: Json
          created_at?: string
          id?: number
          idLista?: number
          idUsuario?: string
          nome?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SAAS_Contatos_idLista_fkey"
            columns: ["idLista"]
            isOneToOne: false
            referencedRelation: "SAAS_Listas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Contatos_idUsuario_fkey"
            columns: ["idUsuario"]
            isOneToOne: false
            referencedRelation: "SAAS_Usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Contatos_idUsuario_fkey"
            columns: ["idUsuario"]
            isOneToOne: false
            referencedRelation: "vw_Usuarios_Com_Plano"
            referencedColumns: ["id"]
          },
        ]
      }
      SAAS_CRM_Colunas: {
        Row: {
          cor: string
          created_at: string
          id: number
          idUsuario: string
          nome: string
          ordem: number
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: number
          idUsuario: string
          nome: string
          ordem?: number
        }
        Update: {
          cor?: string
          created_at?: string
          id?: number
          idUsuario?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      SAAS_CRM_Leads: {
        Row: {
          created_at: string
          id: number
          idColuna: number
          idLista: number | null
          idUsuario: string
          instanceName: string | null
          mensagem: string | null
          nome: string | null
          nomeLista: string | null
          telefone: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          idColuna: number
          idLista?: number | null
          idUsuario: string
          instanceName?: string | null
          mensagem?: string | null
          nome?: string | null
          nomeLista?: string | null
          telefone?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          idColuna?: number
          idLista?: number | null
          idUsuario?: string
          instanceName?: string | null
          mensagem?: string | null
          nome?: string | null
          nomeLista?: string | null
          telefone?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "SAAS_CRM_Leads_idColuna_fkey"
            columns: ["idColuna"]
            isOneToOne: false
            referencedRelation: "SAAS_CRM_Colunas"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_cupons: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          desconto: number
          descricao: string | null
          id: number
          planos_ids: number[] | null
          quantidade_usada: number
          quantidade_uso: number | null
          tipo_desconto: string
          updated_at: string
          uso_unico: boolean
          validade: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          desconto?: number
          descricao?: string | null
          id?: never
          planos_ids?: number[] | null
          quantidade_usada?: number
          quantidade_uso?: number | null
          tipo_desconto?: string
          updated_at?: string
          uso_unico?: boolean
          validade?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          desconto?: number
          descricao?: string | null
          id?: never
          planos_ids?: number[] | null
          quantidade_usada?: number
          quantidade_uso?: number | null
          tipo_desconto?: string
          updated_at?: string
          uso_unico?: boolean
          validade?: string | null
        }
        Relationships: []
      }
      saas_cupons_uso: {
        Row: {
          created_at: string
          cupom_id: number
          id: number
          pagamento_id: number | null
          user_id: string
          valor_desconto: number
        }
        Insert: {
          created_at?: string
          cupom_id: number
          id?: never
          pagamento_id?: number | null
          user_id: string
          valor_desconto: number
        }
        Update: {
          created_at?: string
          cupom_id?: number
          id?: never
          pagamento_id?: number | null
          user_id?: string
          valor_desconto?: number
        }
        Relationships: [
          {
            foreignKeyName: "saas_cupons_uso_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "saas_cupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_cupons_uso_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "saas_pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      SAAS_Detalhes_Disparos: {
        Row: {
          dataEnvio: string | null
          FakeCall: boolean | null
          id: number
          idConexao: number | null
          idContato: number | null
          idDisparo: number | null
          idGrupo: number | null
          KeyRedis: string | null
          Mensagem: string | null
          mensagemErro: string | null
          Payload: Json | null
          respostaHttp: Json | null
          Status: string | null
          statusHttp: string | null
        }
        Insert: {
          dataEnvio?: string | null
          FakeCall?: boolean | null
          id?: number
          idConexao?: number | null
          idContato?: number | null
          idDisparo?: number | null
          idGrupo?: number | null
          KeyRedis?: string | null
          Mensagem?: string | null
          mensagemErro?: string | null
          Payload?: Json | null
          respostaHttp?: Json | null
          Status?: string | null
          statusHttp?: string | null
        }
        Update: {
          dataEnvio?: string | null
          FakeCall?: boolean | null
          id?: number
          idConexao?: number | null
          idContato?: number | null
          idDisparo?: number | null
          idGrupo?: number | null
          KeyRedis?: string | null
          Mensagem?: string | null
          mensagemErro?: string | null
          Payload?: Json | null
          respostaHttp?: Json | null
          Status?: string | null
          statusHttp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SAAS_Detalhes_Disparos_idConexao_fkey"
            columns: ["idConexao"]
            isOneToOne: false
            referencedRelation: "SAAS_Conexões"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Detalhes_Disparos_idContato_fkey"
            columns: ["idContato"]
            isOneToOne: false
            referencedRelation: "SAAS_Contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Detalhes_Disparos_idDisparo_fkey"
            columns: ["idDisparo"]
            isOneToOne: false
            referencedRelation: "SAAS_Disparos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Detalhes_Disparos_idGrupo_fkey"
            columns: ["idGrupo"]
            isOneToOne: false
            referencedRelation: "SAAS_Grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      SAAS_Disparos: {
        Row: {
          created_at: string
          DataAgendamento: string | null
          DiasSelecionados: number[] | null
          EndTime: string | null
          id: number
          idConexoes: number[] | null
          idExecution: string | null
          idListas: number[] | null
          intervaloMax: number | null
          intervaloMin: number | null
          Mensagens: Json[] | null
          MensagensDisparadas: number | null
          PausaAposMensagens: number | null
          PausaMinutos: number | null
          StartTime: string | null
          StatusDisparo: string | null
          TipoDisparo: string | null
          TotalDisparos: number | null
          userId: string | null
        }
        Insert: {
          created_at?: string
          DataAgendamento?: string | null
          DiasSelecionados?: number[] | null
          EndTime?: string | null
          id?: number
          idConexoes?: number[] | null
          idExecution?: string | null
          idListas?: number[] | null
          intervaloMax?: number | null
          intervaloMin?: number | null
          Mensagens?: Json[] | null
          MensagensDisparadas?: number | null
          PausaAposMensagens?: number | null
          PausaMinutos?: number | null
          StartTime?: string | null
          StatusDisparo?: string | null
          TipoDisparo?: string | null
          TotalDisparos?: number | null
          userId?: string | null
        }
        Update: {
          created_at?: string
          DataAgendamento?: string | null
          DiasSelecionados?: number[] | null
          EndTime?: string | null
          id?: number
          idConexoes?: number[] | null
          idExecution?: string | null
          idListas?: number[] | null
          intervaloMax?: number | null
          intervaloMin?: number | null
          Mensagens?: Json[] | null
          MensagensDisparadas?: number | null
          PausaAposMensagens?: number | null
          PausaMinutos?: number | null
          StartTime?: string | null
          StatusDisparo?: string | null
          TipoDisparo?: string | null
          TotalDisparos?: number | null
          userId?: string | null
        }
        Relationships: []
      }
      SAAS_Grupos: {
        Row: {
          atributos: Json
          created_at: string
          id: number
          idConexao: number
          idLista: number
          idUsuario: string
          nome: string | null
          participantes: number | null
          WhatsAppId: string | null
        }
        Insert: {
          atributos?: Json
          created_at?: string
          id?: number
          idConexao: number
          idLista: number
          idUsuario: string
          nome?: string | null
          participantes?: number | null
          WhatsAppId?: string | null
        }
        Update: {
          atributos?: Json
          created_at?: string
          id?: number
          idConexao?: number
          idLista?: number
          idUsuario?: string
          nome?: string | null
          participantes?: number | null
          WhatsAppId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SAAS_Grupos_idConexao_fkey"
            columns: ["idConexao"]
            isOneToOne: false
            referencedRelation: "SAAS_Conexões"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Grupos_idLista_fkey"
            columns: ["idLista"]
            isOneToOne: false
            referencedRelation: "SAAS_Listas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Grupos_idUsuario_fkey"
            columns: ["idUsuario"]
            isOneToOne: false
            referencedRelation: "SAAS_Usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Grupos_idUsuario_fkey"
            columns: ["idUsuario"]
            isOneToOne: false
            referencedRelation: "vw_Usuarios_Com_Plano"
            referencedColumns: ["id"]
          },
        ]
      }
      SAAS_Listas: {
        Row: {
          campos: Json | null
          created_at: string
          descricao: string | null
          id: number
          idConexao: number | null
          idUsuario: string
          nome: string
          tipo: string | null
        }
        Insert: {
          campos?: Json | null
          created_at?: string
          descricao?: string | null
          id?: number
          idConexao?: number | null
          idUsuario: string
          nome: string
          tipo?: string | null
        }
        Update: {
          campos?: Json | null
          created_at?: string
          descricao?: string | null
          id?: number
          idConexao?: number | null
          idUsuario?: string
          nome?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SAAS_Listas_idConexao_fkey"
            columns: ["idConexao"]
            isOneToOne: false
            referencedRelation: "SAAS_Conexões"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Listas_idUsuario_fkey"
            columns: ["idUsuario"]
            isOneToOne: false
            referencedRelation: "SAAS_Usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Listas_idUsuario_fkey"
            columns: ["idUsuario"]
            isOneToOne: false
            referencedRelation: "vw_Usuarios_Com_Plano"
            referencedColumns: ["id"]
          },
        ]
      }
      SAAS_Maturador: {
        Row: {
          created_at: string
          id: number
          idConexao1: number
          idConexao2: number
          instanceName1: string
          instanceName2: string
          intervaloMax: number
          intervaloMin: number
          mensagemErro: string | null
          mensagens: Json | null
          mensagensEnviadas: number
          mensagensPersonalizadas: string[] | null
          proximoEnvio: string | null
          status: string
          telefone1: string | null
          telefone2: string | null
          totalMensagens: number
          ultimaMensagem: string | null
          updated_at: string
          userId: string
        }
        Insert: {
          created_at?: string
          id?: number
          idConexao1: number
          idConexao2: number
          instanceName1: string
          instanceName2: string
          intervaloMax?: number
          intervaloMin?: number
          mensagemErro?: string | null
          mensagens?: Json | null
          mensagensEnviadas?: number
          mensagensPersonalizadas?: string[] | null
          proximoEnvio?: string | null
          status?: string
          telefone1?: string | null
          telefone2?: string | null
          totalMensagens?: number
          ultimaMensagem?: string | null
          updated_at?: string
          userId: string
        }
        Update: {
          created_at?: string
          id?: number
          idConexao1?: number
          idConexao2?: number
          instanceName1?: string
          instanceName2?: string
          intervaloMax?: number
          intervaloMin?: number
          mensagemErro?: string | null
          mensagens?: Json | null
          mensagensEnviadas?: number
          mensagensPersonalizadas?: string[] | null
          proximoEnvio?: string | null
          status?: string
          telefone1?: string | null
          telefone2?: string | null
          totalMensagens?: number
          ultimaMensagem?: string | null
          updated_at?: string
          userId?: string
        }
        Relationships: []
      }
      saas_pagamentos: {
        Row: {
          created_at: string
          desconto_aplicado: number | null
          descricao: string | null
          gateway: string | null
          gateway_customer_id: string | null
          gateway_payment_id: string | null
          id: number
          pago_em: string | null
          plano_id: number | null
          status: string | null
          tipo: string | null
          user_id: string
          valor: number
          valor_original: number | null
        }
        Insert: {
          created_at?: string
          desconto_aplicado?: number | null
          descricao?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_payment_id?: string | null
          id?: number
          pago_em?: string | null
          plano_id?: number | null
          status?: string | null
          tipo?: string | null
          user_id: string
          valor: number
          valor_original?: number | null
        }
        Update: {
          created_at?: string
          desconto_aplicado?: number | null
          descricao?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_payment_id?: string | null
          id?: number
          pago_em?: string | null
          plano_id?: number | null
          status?: string | null
          tipo?: string | null
          user_id?: string
          valor?: number
          valor_original?: number | null
        }
        Relationships: []
      }
      SAAS_Planos: {
        Row: {
          beneficios_extras: string[] | null
          cor: string | null
          created_at: string
          destaque: boolean | null
          diasValidade: number | null
          id: number
          nome: string | null
          ordem: number | null
          preco: number | null
          qntConexoes: number | null
          qntContatos: number | null
          qntDisparos: number | null
          qntExtracoes: number | null
          qntInstagram: number | null
          qntLinkedin: number | null
          qntListas: number | null
          qntPlaces: number | null
          tipo: string | null
          visivel_contratacao: boolean | null
        }
        Insert: {
          beneficios_extras?: string[] | null
          cor?: string | null
          created_at?: string
          destaque?: boolean | null
          diasValidade?: number | null
          id?: number
          nome?: string | null
          ordem?: number | null
          preco?: number | null
          qntConexoes?: number | null
          qntContatos?: number | null
          qntDisparos?: number | null
          qntExtracoes?: number | null
          qntInstagram?: number | null
          qntLinkedin?: number | null
          qntListas?: number | null
          qntPlaces?: number | null
          tipo?: string | null
          visivel_contratacao?: boolean | null
        }
        Update: {
          beneficios_extras?: string[] | null
          cor?: string | null
          created_at?: string
          destaque?: boolean | null
          diasValidade?: number | null
          id?: number
          nome?: string | null
          ordem?: number | null
          preco?: number | null
          qntConexoes?: number | null
          qntContatos?: number | null
          qntDisparos?: number | null
          qntExtracoes?: number | null
          qntInstagram?: number | null
          qntLinkedin?: number | null
          qntListas?: number | null
          qntPlaces?: number | null
          tipo?: string | null
          visivel_contratacao?: boolean | null
        }
        Relationships: []
      }
      SAAS_Usuarios: {
        Row: {
          apikey_gpt: string | null
          avatar_url: string | null
          banido: boolean | null
          created_at: string
          dataValidade: string | null
          dataValidade_extrator: string | null
          desconto_renovacao: number | null
          Email: string | null
          id: string
          nome: string | null
          plano: number | null
          plano_extrator: number | null
          senha: string | null
          status: boolean | null
          "Status Ex": boolean | null
          telefone: string | null
        }
        Insert: {
          apikey_gpt?: string | null
          avatar_url?: string | null
          banido?: boolean | null
          created_at?: string
          dataValidade?: string | null
          dataValidade_extrator?: string | null
          desconto_renovacao?: number | null
          Email?: string | null
          id?: string
          nome?: string | null
          plano?: number | null
          plano_extrator?: number | null
          senha?: string | null
          status?: boolean | null
          "Status Ex"?: boolean | null
          telefone?: string | null
        }
        Update: {
          apikey_gpt?: string | null
          avatar_url?: string | null
          banido?: boolean | null
          created_at?: string
          dataValidade?: string | null
          dataValidade_extrator?: string | null
          desconto_renovacao?: number | null
          Email?: string | null
          id?: string
          nome?: string | null
          plano?: number | null
          plano_extrator?: number | null
          senha?: string | null
          status?: boolean | null
          "Status Ex"?: boolean | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SAAS_Usuarios_plano_extrator_fkey"
            columns: ["plano_extrator"]
            isOneToOne: false
            referencedRelation: "SAAS_Planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Usuarios_plano_extrator_fkey"
            columns: ["plano_extrator"]
            isOneToOne: false
            referencedRelation: "vw_Planos_Usuarios_Count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Usuarios_plano_fkey"
            columns: ["plano"]
            isOneToOne: false
            referencedRelation: "SAAS_Planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Usuarios_plano_fkey"
            columns: ["plano"]
            isOneToOne: false
            referencedRelation: "vw_Planos_Usuarios_Count"
            referencedColumns: ["id"]
          },
        ]
      }
      search_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          location: string | null
          max_results: number | null
          progress: Json | null
          query: string
          results: Json | null
          session_id: string
          status: string
          total_found: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          location?: string | null
          max_results?: number | null
          progress?: Json | null
          query: string
          results?: Json | null
          session_id: string
          status?: string
          total_found?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          location?: string | null
          max_results?: number | null
          progress?: Json | null
          query?: string
          results?: Json | null
          session_id?: string
          status?: string
          total_found?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_Detalhes_Completo: {
        Row: {
          ApikeyConexao: string | null
          dataEnvio: string | null
          FakeCall: boolean | null
          id: number | null
          idConexao: number | null
          idContato: number | null
          idDisparo: number | null
          idGrupo: number | null
          InstanceName: string | null
          KeyRedis: string | null
          Mensagem: string | null
          mensagemErro: string | null
          NomeConexao: string | null
          NomeGrupo: string | null
          Payload: Json | null
          respostaHttp: Json | null
          Status: string | null
          StatusDisparo: string | null
          statusHttp: string | null
          TelefoneContato: string | null
          TipoDisparo: string | null
          UserId: string | null
          WhatsAppIdGrupo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SAAS_Detalhes_Disparos_idConexao_fkey"
            columns: ["idConexao"]
            isOneToOne: false
            referencedRelation: "SAAS_Conexões"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Detalhes_Disparos_idContato_fkey"
            columns: ["idContato"]
            isOneToOne: false
            referencedRelation: "SAAS_Contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Detalhes_Disparos_idDisparo_fkey"
            columns: ["idDisparo"]
            isOneToOne: false
            referencedRelation: "SAAS_Disparos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Detalhes_Disparos_idGrupo_fkey"
            columns: ["idGrupo"]
            isOneToOne: false
            referencedRelation: "SAAS_Grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_Planos_Usuarios_Count: {
        Row: {
          created_at: string | null
          id: number | null
          nome: string | null
          preco: number | null
          qntConexoes: number | null
          qntContatos: number | null
          qntDisparos: number | null
          qntListas: number | null
          total_usuarios: number | null
        }
        Relationships: []
      }
      vw_Usuarios_Com_Plano: {
        Row: {
          apikey_gpt: string | null
          created_at: string | null
          dataValidade: string | null
          Email: string | null
          id: string | null
          nome: string | null
          plano_created_at: string | null
          plano_id: number | null
          plano_nome: string | null
          plano_preco: number | null
          plano_qntConexoes: number | null
          plano_qntContatos: number | null
          plano_qntDisparos: number | null
          plano_qntListas: number | null
          senha: string | null
          status: boolean | null
          telefone: string | null
          total_conexoes: number | null
          total_contatos: number | null
          total_disparos: number | null
          total_listas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "SAAS_Usuarios_plano_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "SAAS_Planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SAAS_Usuarios_plano_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "vw_Planos_Usuarios_Count"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_connections_disparo: {
        Args: { p_conn_ids: number[]; p_disparo_id: number; p_user_id: string }
        Returns: undefined
      }
      algorithm_sign: {
        Args: { algorithm: string; secret: string; signables: string }
        Returns: string
      }
      cleanup_old_search_jobs: { Args: never; Returns: undefined }
      create_disparo: { Args: { p_payload: Json }; Returns: number }
      create_disparo_grupo: { Args: { p_payload: Json }; Returns: number }
      delete_disparo:
        | { Args: { p_disparo_id: number }; Returns: undefined }
        | {
            Args: { p_disparo_id: number; p_user_id: string }
            Returns: undefined
          }
      f_next_valid_time: {
        Args: { p_days: number[]; p_end: string; p_start: string; p_ts: string }
        Returns: string
      }
      f_render_message: {
        Args: {
          p_attrs: Json
          p_nome: string
          p_send_ts: string
          p_template: string
        }
        Returns: string
      }
      f_saudacao: { Args: { p_ts: string }; Returns: string }
      get_contatos_by_lista: {
        Args: { p_id_lista: number }
        Returns: {
          atributos: Json
          created_at: string
          id: number
          idLista: number
          idUsuario: string
          nome: string | null
          telefone: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "SAAS_Contatos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_disparo_owner: { Args: { p_disparo_id: number }; Returns: string }
      get_grupos_by_lista: {
        Args: { p_id_lista: number }
        Returns: {
          atributos: Json
          created_at: string
          id: number
          idConexao: number
          idLista: number
          idUsuario: string
          nome: string | null
          participantes: number | null
          WhatsAppId: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "SAAS_Grupos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      p_expire_users_daily: { Args: never; Returns: undefined }
      pause_disparo:
        | { Args: { p_disparo_id: number }; Returns: undefined }
        | {
            Args: { p_disparo_id: number; p_user_id: string }
            Returns: undefined
          }
      resume_disparo:
        | { Args: { p_disparo_id: number }; Returns: undefined }
        | {
            Args: { p_disparo_id: number; p_user_id: string }
            Returns: undefined
          }
      sign: {
        Args: { algorithm?: string; payload: Json; secret: string }
        Returns: string
      }
      swap_connection:
        | {
            Args: { p_blocked_conn_id: number; p_disparo_id: number }
            Returns: undefined
          }
        | {
            Args: {
              p_blocked_conn_id: number
              p_disparo_id: number
              p_user_id: string
            }
            Returns: undefined
          }
      try_cast_double: { Args: { inp: string }; Returns: number }
      url_decode: { Args: { data: string }; Returns: string }
      url_encode: { Args: { data: string }; Returns: string }
      verify: {
        Args: { algorithm?: string; secret: string; token: string }
        Returns: {
          header: Json
          payload: Json
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
