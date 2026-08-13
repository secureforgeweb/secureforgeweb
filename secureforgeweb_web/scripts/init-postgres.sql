-- SecureForge Web — criação de role + base PostgreSQL (instalação local / EDB)
-- Execute como superutilizador:  psql -U postgres -f scripts/init-postgres.sql
--
-- IMPORTANTE: user, senha e nome da base abaixo DEVEM coincidir com a DATABASE_URL
-- do ficheiro .env (ver .env.example). Se alterar a URL, edite este script primeiro.
--
-- Exemplo alinhado ao .env.example:
--   DATABASE_URL=postgresql://secureforgeweb_user:secureforgeweb_pass@localhost:5432/secureforgeweb

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'secureforgeweb_user') THEN
    CREATE USER secureforgeweb_user WITH PASSWORD 'secureforgeweb_pass';
  END IF;
END
$$;

SELECT 'CREATE DATABASE secureforgeweb OWNER secureforgeweb_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'secureforgeweb')\gexec

GRANT ALL PRIVILEGES ON DATABASE secureforgeweb TO secureforgeweb_user;
