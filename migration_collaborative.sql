-- Migration to add collaborative features to existing database
-- Run this after the new models are deployed

-- Create new collaborative tables first
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    max_members INTEGER DEFAULT 50,
    max_storage_gb INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    organization_id INTEGER REFERENCES organizations(id),
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_organization (
    user_id INTEGER REFERENCES users(id),
    organization_id INTEGER REFERENCES organizations(id),
    role VARCHAR DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS organization_invitations (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    email VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'member',
    token VARCHAR UNIQUE NOT NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    invited_by_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    workspace_id INTEGER REFERENCES workspaces(id),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR NOT NULL,
    entity_type VARCHAR,
    entity_id INTEGER,
    description TEXT,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now add foreign key columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_organization_id INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_public_in_workspace BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE snippets ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE snippets ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT TRUE;

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_current_org FOREIGN KEY (current_organization_id) REFERENCES organizations(id);
ALTER TABLE documents ADD CONSTRAINT fk_documents_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE snippets ADD CONSTRAINT fk_snippets_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_org ON workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_org_user ON user_organization(user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_org ON user_organization(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_workspace ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_users_current_org ON users(current_organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_snippets_workspace ON snippets(workspace_id);