import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const CATEGORIES = [
  { name: "Autenticação", description: "Controles de identidade, senhas e sessão", color: "#22d3ee", sortOrder: 1 },
  { name: "Autorização", description: "Controle de acesso e privilégios", color: "#a855f7", sortOrder: 2 },
  { name: "Validação de entrada", description: "Sanitização e validação server-side", color: "#f97316", sortOrder: 3 },
  { name: "Proteção de credenciais", description: "Segredos, hashes e rotação", color: "#ef4444", sortOrder: 4 },
  { name: "Headers de segurança", description: "CSP, HSTS e proteções HTTP", color: "#eab308", sortOrder: 5 },
  { name: "Exposição de endpoints", description: "Superfície de APIs e rotas", color: "#06b6d4", sortOrder: 6 },
  { name: "Mensagens de erro", description: "Tratamento seguro de erros", color: "#84cc16", sortOrder: 7 },
  { name: "Dados sensíveis", description: "Proteção em trânsito e repouso", color: "#ec4899", sortOrder: 8 },
  { name: "Superfície de ataque", description: "Exposição de serviços e dependências", color: "#64748b", sortOrder: 9 },
];

const ITEMS = [
  { code: "AUTH-01", category: "Autenticação", title: "Política de senha mínima", description: "A aplicação exige senhas com comprimento e complexidade adequados.", owaspRef: "ASVS 2.1", severity: "high", recommendation: { title: "Implementar política de senha", description: "Defina requisitos mínimos de senha na aplicação.", action: "Exigir 8+ caracteres com maiúscula, minúscula, número e especial.", reference: "OWASP ASVS 2.1" } },
  { code: "AUTH-02", category: "Autenticação", title: "Hash de senha forte", description: "Senhas são armazenadas com algoritmo de hash adequado (bcrypt, argon2).", owaspRef: "ASVS 2.4", severity: "critical", recommendation: { title: "Usar hash forte para senhas", description: "Nunca armazene senhas em texto plano.", action: "Adote bcrypt (custo 12+) ou Argon2id para hash de senhas.", reference: "OWASP Password Storage Cheat Sheet" } },
  { code: "AUTH-03", category: "Autenticação", title: "Proteção contra força bruta", description: "Login possui rate limiting ou bloqueio após tentativas falhas.", owaspRef: "ASVS 2.2", severity: "high", recommendation: { title: "Limitar tentativas de login", description: "Previna ataques de força bruta.", action: "Implemente rate limit no endpoint de login e bloqueio temporário.", reference: "OWASP ASVS 2.2" } },
  { code: "AUTH-04", category: "Autenticação", title: "Expiração de sessão", description: "Sessões expiram após período de inatividade ou tempo máximo.", owaspRef: "ASVS 3.2", severity: "medium", recommendation: { title: "Configurar expiração de sessão", description: "Reduza janela de ataque em sessões abandonadas.", action: "Defina timeout de sessão e renovação segura de tokens.", reference: "OWASP Session Management" } },
  { code: "AUTHZ-01", category: "Autorização", title: "Controle de acesso por perfil", description: "Rotas e recursos verificam papel/permissão do usuário (RBAC).", owaspRef: "ASVS 4.1", severity: "high", recommendation: { title: "Implementar RBAC", description: "Garanta que cada recurso valide autorização.", action: "Mapeie papéis e aplique verificação em todas as rotas sensíveis.", reference: "OWASP ASVS 4.1" } },
  { code: "AUTHZ-02", category: "Autorização", title: "Princípio do menor privilégio", description: "Usuários possuem apenas permissões necessárias para sua função.", owaspRef: "ASVS 4.1.3", severity: "high", recommendation: { title: "Revisar privilégios", description: "Evite permissões excessivas.", action: "Audite papéis e remova acessos desnecessários.", reference: "OWASP ASVS 4.1" } },
  { code: "AUTHZ-03", category: "Autorização", title: "Rotas administrativas protegidas", description: "Painéis e APIs administrativas exigem autenticação e papel adequado.", owaspRef: "ASVS 4.1", severity: "critical", recommendation: { title: "Proteger rotas admin", description: "Rotas administrativas são alvo frequente.", action: "Exija autenticação + autorização admin em todas as rotas /admin.", reference: "OWASP Top 10 A01" } },
  { code: "INPUT-01", category: "Validação de entrada", title: "Validação server-side", description: "Todos os inputs são validados no servidor, não apenas no cliente.", owaspRef: "ASVS 5.1", severity: "high", recommendation: { title: "Validar no servidor", description: "Validação client-side é facilmente contornada.", action: "Implemente validação com schema (Joi/Zod) em todos os endpoints.", reference: "OWASP Input Validation" } },
  { code: "INPUT-02", category: "Validação de entrada", title: "Queries SQL parametrizadas", description: "Consultas ao banco usam parâmetros, evitando SQL Injection.", owaspRef: "ASVS 5.3", severity: "critical", recommendation: { title: "Parametrizar queries", description: "SQL Injection é vulnerabilidade crítica.", action: "Use ORM ou prepared statements; nunca concatene SQL com input do usuário.", reference: "OWASP Top 10 A03" } },
  { code: "INPUT-03", category: "Validação de entrada", title: "Sanitização anti-XSS", description: "Saídas HTML são escapadas ou sanitizadas contra Cross-Site Scripting.", owaspRef: "ASVS 5.3", severity: "high", recommendation: { title: "Prevenir XSS", description: "Dados não confiáveis não devem executar script no browser.", action: "Escape output, use CSP e frameworks que sanitizam por padrão.", reference: "OWASP Top 10 A03" } },
  { code: "SECRET-01", category: "Proteção de credenciais", title: "Segredos em variáveis de ambiente", description: "Chaves API, JWT secrets e senhas de DB não estão no código-fonte.", owaspRef: "ASVS 14.2", severity: "critical", recommendation: { title: "Externalizar segredos", description: "Segredos no repositório são vazamento garantido.", action: "Use .env (não versionado) ou vault; nunca commite credenciais.", reference: "OWASP Secrets Management" } },
  { code: "SECRET-02", category: "Proteção de credenciais", title: "Ausência de credenciais no repositório", description: "Não há tokens, senhas ou chaves commitados no Git.", owaspRef: "ASVS 14.2", severity: "critical", recommendation: { title: "Auditar repositório", description: "Histórico Git pode expor segredos antigos.", action: "Execute varredura de segredos e rotacione credenciais expostas.", reference: "OWASP Secrets Management" } },
  { code: "HEADER-01", category: "Headers de segurança", title: "Content-Security-Policy", description: "Aplicação define header CSP para restringir fontes de script e conteúdo.", owaspRef: "ASVS 14.4", severity: "high", recommendation: { title: "Configurar CSP", description: "CSP mitiga XSS e injeção de conteúdo.", action: "Defina Content-Security-Policy adequada ao tipo de aplicação.", reference: "OWASP CSP Cheat Sheet" } },
  { code: "HEADER-02", category: "Headers de segurança", title: "Strict-Transport-Security", description: "Header HSTS força conexões HTTPS.", owaspRef: "ASVS 9.1", severity: "high", recommendation: { title: "Habilitar HSTS", description: "Previne downgrade para HTTP.", action: "Configure Strict-Transport-Security em produção.", reference: "OWASP Transport Layer Protection" } },
  { code: "HEADER-03", category: "Headers de segurança", title: "X-Frame-Options / frame-ancestors", description: "Proteção contra clickjacking via iframe.", owaspRef: "ASVS 14.4", severity: "medium", recommendation: { title: "Anti-clickjacking", description: "Páginas sensíveis não devem ser embutidas em iframes.", action: "Use X-Frame-Options: DENY ou CSP frame-ancestors.", reference: "OWASP Clickjacking Defense" } },
  { code: "HEADER-04", category: "Headers de segurança", title: "X-Content-Type-Options", description: "Header nosniff impede MIME type sniffing.", owaspRef: "ASVS 14.4", severity: "medium", recommendation: { title: "Configurar nosniff", description: "Evita interpretação incorreta de tipos de arquivo.", action: "Defina X-Content-Type-Options: nosniff.", reference: "OWASP Secure Headers" } },
  { code: "EXPOS-01", category: "Exposição de endpoints", title: "APIs sensíveis autenticadas", description: "Endpoints que manipulam dados exigem autenticação.", owaspRef: "ASVS 4.1", severity: "high", recommendation: { title: "Autenticar APIs", description: "APIs abertas expõem dados e operações.", action: "Revise rotas e exija token/sessão em endpoints sensíveis.", reference: "OWASP API Security Top 10" } },
  { code: "EXPOS-02", category: "Exposição de endpoints", title: "Documentação de API restrita", description: "Swagger/OpenAPI não está publicamente acessível em produção.", owaspRef: "ASVS 14.2", severity: "medium", recommendation: { title: "Restringir docs de API", description: "Documentação revela superfície de ataque.", action: "Proteja ou desabilite docs de API em ambiente de produção.", reference: "OWASP API Security" } },
  { code: "ERROR-01", category: "Mensagens de erro", title: "Sem stack trace em produção", description: "Erros em produção não expõem stack trace ou detalhes internos.", owaspRef: "ASVS 7.4", severity: "medium", recommendation: { title: "Tratar erros em produção", description: "Stack traces ajudam atacantes.", action: "Retorne mensagens genéricas ao usuário; logue detalhes no servidor.", reference: "OWASP Error Handling" } },
  { code: "ERROR-02", category: "Mensagens de erro", title: "Mensagens genéricas ao usuário", description: "Mensagens de erro não revelam estrutura interna ou dados sensíveis.", owaspRef: "ASVS 7.4", severity: "low", recommendation: { title: "Padronizar mensagens de erro", description: "Evite vazamento de informação.", action: "Use mensagens uniformes para falhas de autenticação e validação.", reference: "OWASP Error Handling" } },
  { code: "DATA-01", category: "Dados sensíveis", title: "HTTPS/TLS em trânsito", description: "Dados sensíveis trafegam exclusivamente via HTTPS.", owaspRef: "ASVS 9.1", severity: "critical", recommendation: { title: "Forçar HTTPS", description: "Dados em trânsito sem criptografia são interceptáveis.", action: "Configure TLS em todos os ambientes acessíveis externamente.", reference: "OWASP Transport Layer Protection" } },
  { code: "DATA-02", category: "Dados sensíveis", title: "Dados sensíveis fora de logs", description: "Logs não registram senhas, tokens ou PII desnecessária.", owaspRef: "ASVS 7.1", severity: "high", recommendation: { title: "Sanitizar logs", description: "Logs são frequentemente expostos ou vazados.", action: "Mascare dados sensíveis antes de registrar em logs.", reference: "OWASP Logging Cheat Sheet" } },
  { code: "SURF-01", category: "Superfície de ataque", title: "Portas e serviços desnecessários", description: "Apenas serviços necessários estão expostos publicamente.", owaspRef: "ASVS 1.1", severity: "medium", recommendation: { title: "Reduzir superfície", description: "Cada serviço exposto é vetor de ataque.", action: "Desative portas, debug endpoints e serviços não utilizados.", reference: "OWASP Attack Surface Reduction" } },
  { code: "SURF-02", category: "Superfície de ataque", title: "Dependências atualizadas", description: "Bibliotecas e frameworks estão atualizados sem CVEs críticos conhecidos.", owaspRef: "ASVS 1.14", severity: "medium", recommendation: { title: "Atualizar dependências", description: "Vulnerabilidades conhecidas em libs são exploradas ativamente.", action: "Execute auditoria (npm audit) e atualize pacotes com CVEs críticos.", reference: "OWASP Top 10 A06" } },
];

async function upsertCategory(client, cat) {
  const existing = await client.query(
    `SELECT id FROM checklist_categories WHERE name = $1`,
    [cat.name]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;
  const inserted = await client.query(
    `INSERT INTO checklist_categories (name, description, color, "sortOrder", "createdAt")
     VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
    [cat.name, cat.description, cat.color, cat.sortOrder]
  );
  return inserted.rows[0].id;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definida.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    let checklistId;
    const checklistRes = await client.query(
      `SELECT id FROM checklists WHERE version = '1.0' LIMIT 1`
    );
    if (checklistRes.rows.length > 0) {
      checklistId = checklistRes.rows[0].id;
      console.log(`Checklist v1.0 já existe (id=${checklistId})`);
    } else {
      const inserted = await client.query(
        `INSERT INTO checklists (name, version, "isActive", "createdAt")
         VALUES ('Checklist de Segurança Web', '1.0', true, NOW()) RETURNING id`
      );
      checklistId = inserted.rows[0].id;
      console.log(`Checklist v1.0 criado (id=${checklistId})`);
    }

    const categoryIds = {};
    for (const cat of CATEGORIES) {
      categoryIds[cat.name] = await upsertCategory(client, cat);
      console.log(`Categoria: ${cat.name}`);
    }

    let itemCount = 0;
    for (const [index, item] of ITEMS.entries()) {
      const categoryId = categoryIds[item.category];
      const existing = await client.query(
        `SELECT id FROM checklist_items WHERE code = $1 AND "checklistId" = $2`,
        [item.code, checklistId]
      );
      let itemId;
      if (existing.rows.length > 0) {
        itemId = existing.rows[0].id;
      } else {
        const inserted = await client.query(
          `INSERT INTO checklist_items ("checklistId", "categoryId", code, title, description, "owaspRef", "suggestedSeverity", "sortOrder", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
          [checklistId, categoryId, item.code, item.title, item.description, item.owaspRef, item.severity, index + 1]
        );
        itemId = inserted.rows[0].id;
        itemCount++;
      }

      const recExists = await client.query(
        `SELECT id FROM default_recommendations WHERE "itemId" = $1`,
        [itemId]
      );
      if (recExists.rows.length === 0) {
        await client.query(
          `INSERT INTO default_recommendations ("itemId", title, description, action, reference, "createdAt")
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [itemId, item.recommendation.title, item.recommendation.description, item.recommendation.action, item.recommendation.reference]
        );
      }
    }

    console.log(`Seed concluído: ${CATEGORIES.length} categorias, ${ITEMS.length} itens (${itemCount} novos).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
