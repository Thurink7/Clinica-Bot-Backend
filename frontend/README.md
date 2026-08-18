# Clinica Admin - Frontend (Next.js)

Painel administrativo da clínica desenvolvido em Next.js para gerenciamento de agendamentos, pacientes e configurações do bot de atendimento.

---

## 🛠️ Tecnologias Utilizadas

- **Next.js 14** (App Router / Pages)
- **React 18**
- **TypeScript**
- **Tailwind CSS** & **PostCSS** (Estilização)
- **Firebase Web SDK** (Integrações client-side / tempo real)

---

## 📋 Pré-requisitos

- Node.js (v18+)
- Backend da aplicação (`backend`) em execução ou acessível via rede.

---

## 🚀 Como Executar

### 1. Instalar as dependências

No diretório `frontend`:

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz da pasta `frontend` com base no `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Configurações disponíveis no `.env.local`:
- `NEXT_PUBLIC_API_URL`: URL base do backend (ex: `http://localhost:3001`).
- `NEXT_PUBLIC_FIREBASE_*`: Credenciais web do Firebase caso utilize chamadas diretas client-side ao Firestore.

### 3. Executar a Aplicação

- **Modo Desenvolvimento:**
  ```bash
  npm run dev
  ```
  Acesse a aplicação em `http://localhost:3000`.

- **Build de Produção:**
  ```bash
  npm run build
  npm start
  ```

---

## 📜 Scripts Disponíveis

- `npm run dev`: Inicia o servidor Next.js em ambiente de desenvolvimento na porta `3000`.
- `npm run build`: Compila a aplicação para produção.
- `npm start`: Inicia o servidor HTTP otimizado com a build de produção.
