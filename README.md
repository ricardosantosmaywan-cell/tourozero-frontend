# Tourozero 🚧

![React](https://img.shields.io/badge/React-19.2.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.3.1-purple?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2.1-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-2.98.0-3ECF8E?style=for-the-badge&logo=supabase)
![Vitest](https://img.shields.io/badge/Vitest-4.1.5-yellow?style=for-the-badge&logo=vitest)

**Tourozero** é um SaaS moderno focado na gestão de alugueres de equipamentos e contabilidade financeira. Criado para otimizar fluxos de trabalho logísticos, inclui a gestão de inventário, controlo de clientes, geração de contratos automáticos (A4 para impressão) e painéis de contabilidade com cálculos complexos de partilha de lucros.

## 🚀 Funcionalidades Principais
- 📊 **Dashboard Dinâmico:** Visão global sobre ganhos, equipamentos ativos e métricas através de gráficos (Recharts).
- 👥 **Gestão de Clientes & CRM:** Histórico de contratos (LTV), contactos e anexos de documentos.
- 📦 **Gestão de Inventário:** Controlo de stock e visualização do estado em tempo real.
- 🗂️ **Alugueres e Contratos:** Geração automatizada de contratos e recibos em HTML/A4, com lógica robusta para prolongamento e cálculo de cauções e IVA.
- 💰 **Contabilidade:** Partilha e acerto automático de valores financeiros (Ex: 80/20 base + 50/50 transporte).

## 💻 Tecnologias
- **Frontend:** React 19, Vite, TypeScript
- **Estilização:** Tailwind CSS v4, Lucide React
- **Base de Dados & Auth:** Supabase
- **Testes Unitários:** Vitest
- **Gráficos & PDF:** Recharts, JSPDF

## 🛠️ Instalação e Execução

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/tourozero.git
   cd tourozero
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   Crie um ficheiro `.env` na raiz do projeto e preencha com as credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesso:**
   Aceda a `http://localhost:5173` no seu navegador.

## 🧪 Testes
Para correr a suite de testes unitários (Vitest) e garantir a fiabilidade da lógica:
```bash
npm run test
```

## 📂 Estrutura do Projeto

```text
tourozero/
├── public/                 # Recursos estáticos
├── src/
│   ├── __tests__/          # Suítes de testes globais
│   ├── assets/             # Ícones, imagens e SVGs
│   ├── components/         # Componentes reutilizáveis (UI, Modais, etc.)
│   ├── contexts/           # Context API (ex: PeriodContext)
│   ├── data/               # Funções de API e mocks (Supabase calls)
│   ├── lib/                # Bibliotecas utilitárias e geradores HTML/PDF
│   ├── pages/              # Páginas da Aplicação (Dashboard, Rentals, etc.)
│   ├── utils/              # Funções utilitárias puras (Cálculos Financeiros)
│   ├── App.tsx             # Rotas e layout base
│   └── main.tsx            # Ponto de entrada (Entry point)
├── .env                    # Variáveis de ambiente (não incluído no git)
├── package.json            # Dependências e scripts
└── vite.config.ts          # Configuração do Vite
```

## ☁️ Deploy em Produção
O projeto está configurado para fácil *deploy* em plataformas como a **Vercel**:
1. Conecte o repositório no painel da Vercel.
2. Defina as Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. O comando de Build será gerado automaticamente (`npm run build`) com a pasta de destino `dist`.
