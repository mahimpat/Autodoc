#!/bin/bash

echo "🚀 Setting up Smart Template System - Phase 1"
echo "============================================="

# Run database migration
echo "📊 Running database migration..."
docker compose exec db psql -U autodoc -d autodoc -f /docker-entrypoint-initdb.d/add_template_system.sql

# Copy migration file to init directory (for fresh installs)
echo "📁 Copying migration to init directory..."
cp backend/migrations/add_template_system.sql scripts/init_db.sql

echo "✅ Template system database setup complete!"
echo ""
echo "📋 What was created:"
echo "   • Enhanced Template models with UUID support"
echo "   • Template categories with hierarchical structure"
echo "   • Template variables for dynamic content"
echo "   • Usage tracking and analytics"
echo "   • Search and discovery features"
echo "   • Community features (collections, ratings)"
echo ""
echo "🔗 API Endpoints available:"
echo "   • GET    /templates/categories - List all categories"
echo "   • GET    /templates/search - Advanced template search"
echo "   • GET    /templates/{id} - Get specific template"
echo "   • POST   /templates - Create new template"
echo "   • PUT    /templates/{id} - Update template"
echo "   • DELETE /templates/{id} - Delete template"
echo "   • POST   /templates/usage - Record usage analytics"
echo "   • GET    /templates/{id}/stats - Get template statistics"
echo ""
echo "🎯 Next Steps:"
echo "   1. Update frontend to use new API endpoints"
echo "   2. Create template editor interface"
echo "   3. Implement template variables system"
echo "   4. Add AI-powered template suggestions"
echo ""
echo "Ready for Phase 2! 🚀"