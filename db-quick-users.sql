-- Crear tabla quick_users en Postgres (Neon/Supabase/Vercel Postgres)
CREATE TABLE IF NOT EXISTS quick_users (
  id BIGSERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  floor TEXT,
  apartment TEXT,
  locality TEXT NOT NULL,
  province TEXT NOT NULL,
  cp TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Importar usuarios desde CSV normalizado (ejecutar en psql local)
-- Ajustar ruta del archivo segun tu entorno.
-- El CSV esperado es quick_users_normalizado_geo_bom.csv con separador ';'
--
-- \copy quick_users(display_name,email,phone,street,number,floor,apartment,locality,province,cp,notes,is_active)
-- FROM 'C:/Dev/Trabajo/OR x OCA/quick_users_normalizado_geo_bom.csv'
-- WITH (FORMAT csv, HEADER true, DELIMITER ';', ENCODING 'UTF8');
