-- SecureForge Web — script de inicialização do PostgreSQL
-- Execute como superusuário (postgres)

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
