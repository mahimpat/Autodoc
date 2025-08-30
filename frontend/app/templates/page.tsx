'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  TagIcon, 
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  StarIcon,
  UsersIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { API_BASE } from '../../lib/api'
import Header from '../../components/Header'

interface Template {
  id: string
  name: string
  description: string
  category_id?: string
  tags: string[]
  visibility: 'private' | 'organization' | 'public' | 'marketplace'
  is_featured: boolean
  total_uses: number
  avg_rating: number
  created_at: string
  author_id: number
}

interface Category {
  id: string
  name: string
  description: string
  icon: string
  color: string
  template_count: number
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'public' | 'featured'>('all')

  useEffect(() => {
    loadCategories()
    loadTemplates()
  }, [selectedCategory, searchQuery, filterType])

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/templates/categories`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      
      if (searchQuery) params.append('query', searchQuery)
      if (selectedCategory) params.append('category_id', selectedCategory)
      
      // Set visibility based on filter type
      if (filterType === 'mine') {
        params.append('visibility', 'private')
      } else if (filterType === 'public') {
        params.append('visibility', 'public')
      } else if (filterType === 'featured') {
        params.append('is_featured', 'true')
      }

      const response = await fetch(`${API_BASE}/templates/search?${params}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getVisibilityBadge = (visibility: string) => {
    const variants = {
      private: { variant: 'secondary' as const, text: 'Private', icon: '🔒' },
      organization: { variant: 'warning' as const, text: 'Team', icon: '👥' },
      public: { variant: 'success' as const, text: 'Public', icon: '🌍' },
      marketplace: { variant: 'primary' as const, text: 'Marketplace', icon: '🏪' }
    }
    
    const config = variants[visibility as keyof typeof variants] || variants.private
    return (
      <Badge variant={config.variant} size="sm">
        {config.icon} {config.text}
      </Badge>
    )
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i}>
            {i < Math.floor(rating) ? (
              <StarIconSolid className="w-3 h-3 text-yellow-400" />
            ) : (
              <StarIcon className="w-3 h-3 text-gray-300" />
            )}
          </div>
        ))}
        <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Smart Templates
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Create, discover, and share document templates with the community
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/templates/create">
              <Button size="lg" className="gap-2">
                <PlusIcon className="w-5 h-5" />
                Create Template
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-2">
                {[
                  { key: 'all', label: 'All Templates', icon: DocumentTextIcon },
                  { key: 'mine', label: 'My Templates', icon: UsersIcon },
                  { key: 'public', label: 'Public', icon: EyeIcon },
                  { key: 'featured', label: 'Featured', icon: StarIcon }
                ].map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={filterType === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType(key as any)}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TagIcon className="w-5 h-5" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      !selectedCategory ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>All Categories</span>
                      <span className="text-xs text-gray-500">
                        {templates.length}
                      </span>
                    </div>
                  </button>
                  
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedCategory === category.id ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {category.template_count}
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {category.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Templates Grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No templates found
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || selectedCategory
                      ? 'Try adjusting your search or filters'
                      : 'Get started by creating your first template'}
                  </p>
                  <Link href="/templates/create">
                    <Button>
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {template.name}
                          </CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {template.description}
                          </CardDescription>
                        </div>
                        <div className="ml-2">
                          {getVisibilityBadge(template.visibility)}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {/* Tags */}
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {template.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" size="sm">
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="outline" size="sm">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Rating and Usage */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div>
                          {template.avg_rating > 0 && renderStars(template.avg_rating)}
                        </div>
                        <div>
                          {template.total_uses} uses
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link href={`/templates/${template.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <EyeIcon className="w-4 h-4" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/templates/${template.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <PencilSquareIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  )
}