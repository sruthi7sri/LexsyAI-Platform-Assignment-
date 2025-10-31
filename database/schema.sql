-- database/schema.sql

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  original_text TEXT NOT NULL,
  ai_analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflows (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  template_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  data JSONB,
  status VARCHAR(50) DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  workflow_id INTEGER REFERENCES workflows(id),
  amount DECIMAL(10, 2) NOT NULL,
  stripe_payment_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);