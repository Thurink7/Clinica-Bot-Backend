# Clinica Agenda - Backend (API Node.js / Express)

API RESTful backend responsável pelo gerenciamento de agendamentos, rotinas de envio de notificações via WhatsApp (Meta API / Twilio), integração com Firebase Admin SDK e suporte para persistência/migração em MongoDB.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js** (v18+)
- **Express.js** (Framework Web)
- **Firebase Admin SDK** (Firestore)
- **MongoDB Native Driver** (Com suporte a migração / dual-write)
- **JWT (JSON Web Token)** & **bcryptjs** (Autenticação)
- **node-cron** (Agendamento de lembretes automáticos)

---

## 📋 Pré-requisitos

- Node.js instalados (versão 18 ou superior).
- Conta no Firebase com acesso às Credenciais de Serviço (Service Account).
- Instância do MongoDB (opcional se utilizar apenas Firestore).
- Conta na Meta Cloud API ou Twilio para disparos de WhatsApp (opcional em ambiente local).

---

## 🚀 Como Executar

### 1. Instalar as dependências

No diretório `backend`:

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz da pasta `backend` com base no arquivo `.env.example`:

```bash
cp .env.example .env
```

Ajuste as variáveis principais no `.env`:
- `PORT`: Porta de execução (padrão: `3001`).
- `JWT_SECRET`: Chave secreta para autenticação JWT do painel administrativo.
- `GOOGLE_APPLICATION_CREDENTIALS`: Caminho para o arquivo JSON do Firebase Admin SDK (ou use `FIREBASE_SERVICE_ACCOUNT_JSON`).
- `MONGO_URI` / `MONGO_DB_NAME`: String de conexão do MongoDB (se aplicável).
- `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`: Credenciais da Meta API do WhatsApp.

### 3. Executar o Servidor

- **Modo Desenvolvimento (com auto-reload):**
  ```bash
  npm run dev
  ```
- **Modo Produção:**
  ```bash
  npm start
  ```
- **Rodar Testes:**
  ```bash
  npm test
  ```

---

## 📜 Scripts Disponíveis

- `npm run dev`: Inicia o servidor em modo de desenvolvimento monitorando alterações (`node --watch`).
- `npm start`: Inicia a aplicação em produção.
- `npm test`: Executa a suíte de testes unitários/integrados.
- `npm run migrate:mongo`: Script auxiliar para migração de dados do Firestore para o MongoDB.

---

## 🔒 Autenticação e Segurança

- Endpoints protegidos utilizam tokens JWT enviados no header `Authorization: Bearer <TOKEN>`.
- Suporte a Bootstrap do primeiro usuário administrador através das variáveis `ADMIN_BOOTSTRAP_EMAIL` e `ADMIN_BOOTSTRAP_PASSWORD`.
