# Backend principal — Java

O backend principal é a aplicação Spring Boot em `backend-java`. Ela atende na porta `3001`, que é também a URL padrão configurada no frontend (`NEXT_PUBLIC_API_URL=http://localhost:3001`).

## Banco de dados

Sem perfil adicional, a API usa Firestore, preservando os dados e credenciais já empregados pelo backend anterior. Para uma operação somente com MongoDB, defina `SPRING_PROFILES_ACTIVE=mongo`, `MONGO_URI` e `MONGO_DB_NAME`; o perfil `mongo` configura leitura e escrita exclusivamente no MongoDB, sem inicializar Firebase.

## Execução local

Defina `JWT_SECRET`, as credenciais do banco escolhido e, caso necessário, `ADMIN_BOOTSTRAP_EMAIL` e `ADMIN_BOOTSTRAP_PASSWORD`. Em seguida execute `mvn spring-boot:run` dentro desta pasta e `npm run dev` em `frontend`.

Valide a disponibilidade em `GET http://localhost:3001/health`. O frontend deve ser aberto em `http://localhost:3000`.
