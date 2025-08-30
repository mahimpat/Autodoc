-- Migration: Enhanced Template System
-- Created: 2024-08-30
-- Description: Add comprehensive template system with community features

-- Template categories
CREATE TABLE template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    parent_id UUID REFERENCES template_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES template_categories(id),
    tags TEXT[] DEFAULT '{}',
    version VARCHAR(20) DEFAULT '1.0.0',
    author_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Template content (YAML/JSON)
    template_data JSONB NOT NULL,
    
    -- Visibility & Access
    visibility VARCHAR(20) DEFAULT 'private',
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Usage tracking
    total_uses INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0,
    avg_rating FLOAT DEFAULT 0,
    avg_completion_time INTERVAL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Search & Discovery
    search_vector tsvector,
    
    -- Constraints
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'organization', 'public', 'marketplace')),
    CONSTRAINT valid_rating CHECK (avg_rating >= 0 AND avg_rating <= 5)
);

-- Template variables (for dynamic templates)
CREATE TABLE template_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    options JSONB,
    validation_rules JSONB,
    placeholder TEXT,
    description TEXT,
    help_text TEXT,
    order_index INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(template_id, name)
);

-- Template usage tracking
CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id),
    user_id UUID REFERENCES users(id),
    document_id UUID REFERENCES documents(id),
    
    -- Usage context
    generation_time INTERVAL,
    success BOOLEAN,
    completion_rate FLOAT,
    variables_used JSONB,
    
    -- User feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template collections (curated lists)
CREATE TABLE template_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id),
    
    is_public BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE template_collection_items (
    collection_id UUID REFERENCES template_collections(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    
    PRIMARY KEY (collection_id, template_id)
);

-- Create indexes for performance
CREATE INDEX idx_templates_category ON templates(category_id);
CREATE INDEX idx_templates_author ON templates(author_id);
CREATE INDEX idx_templates_visibility ON templates(visibility);
CREATE INDEX idx_templates_rating ON templates(avg_rating DESC);
CREATE INDEX idx_templates_uses ON templates(total_uses DESC);
CREATE INDEX idx_templates_created ON templates(created_at DESC);
CREATE INDEX idx_templates_search ON templates USING GIN(search_vector);
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);

CREATE INDEX idx_template_variables_template ON template_variables(template_id);
CREATE INDEX idx_template_usage_template ON template_usage(template_id);
CREATE INDEX idx_template_usage_user ON template_usage(user_id);

-- Insert default categories
INSERT INTO template_categories (name, description, icon, color) VALUES
    ('technical', 'Technical Documentation', 'CodeBracketIcon', 'blue'),
    ('business', 'Business Documents', 'BriefcaseIcon', 'green'),
    ('legal', 'Legal Documents', 'ScaleIcon', 'purple'),
    ('marketing', 'Marketing Materials', 'MegaphoneIcon', 'pink'),
    ('academic', 'Academic & Research', 'AcademicCapIcon', 'indigo'),
    ('project', 'Project Management', 'FolderIcon', 'orange'),
    ('medical', 'Medical & Healthcare', 'HeartIcon', 'red'),
    ('finance', 'Finance & Accounting', 'BanknotesIcon', 'emerald'),
    ('personal', 'Personal Documents', 'UserIcon', 'gray'),
    ('creative', 'Creative Writing', 'SparklesIcon', 'yellow');

-- Update search vector trigger
CREATE OR REPLACE FUNCTION update_template_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
                        setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_search_vector
    BEFORE INSERT OR UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_template_search_vector();