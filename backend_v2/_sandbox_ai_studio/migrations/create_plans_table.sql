-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC,
  features JSONB,
  limits JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans if they don't exist
INSERT INTO plans (id, name, description, price_monthly, features, limits)
VALUES 
('starter', 'Emprendedor', 'Para quienes inician su marca personal.', 29.00, 
 '["1 Marca", "1 Plataforma", "Generación Básica (5 posts/mes)", "Soporte Estándar"]', 
 '{"brands": 1, "platforms": 1, "posts_per_month": 5}'
),
('growth', 'Agencia', 'Para pequeñas agencias y equipos en crecimiento.', 99.00, 
 '["Hasta 3 Marcas", "3 Plataformas", "Generación Avanzada (15 posts/mes)", "Soporte Prioritario", "Analítica Básica"]', 
 '{"brands": 3, "platforms": 3, "posts_per_month": 15}'
),
('scale', 'Enterprise', 'Para grandes volúmenes y necesidades personalizadas.', 299.00, 
 '["Marcas Ilimitadas", "Plataformas Ilimitadas", "Suite Completa de Contenido", "Gerente de Cuenta Dedicado", "Estrategia Avanzada"]', 
 '{"brands": 999, "platforms": 999, "posts_per_month": 999}'
)
ON CONFLICT (id) DO NOTHING;
