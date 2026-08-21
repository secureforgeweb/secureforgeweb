-- SecureForge Web — criação de role + base PostgreSQL
-- Caminho da playlist (vídeo 04): PostgreSQL local via instalador EDB
-- Execute:  psql -U postgres -f scripts/init-postgres.sql
--
-- IMPORTANTE: user, senha e nome da base abaixo DEVEM coincidir com a DATABASE_URL
-- do arquivo .env (ver .env.example). Se alterar a URL, edite este script primeiro.
--
-- Canônico (alinhado ao .env.example e ao docker-compose.yml):
--   DATABASE_URL=postgresql://secureforgeweb_user:secureforgeweb_pass@localhost:5432/secureforgeweb
-- O nome da base é "secureforgeweb" (não "secureforge_dev").
-- Se no EDB usar o superusuário postgres, alinhe user/senha aqui e no .env.

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
