'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { 
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ShareIcon,
  StarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  GlobeAltIcon,
  LockClosedIcon,
  UsersIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { API_BASE } from '../../../lib/api'
import Header from '../../../components/Header'

interface Template {
  id: string
  name: string
  description: string
  category_id?: string
  tags: string[]
  version: string
  author_id: number
  organization_id?: number
  template_data: {
    mode: string
    metadata?: {
      required?: string[]
      optional?: string[]
    }
    sections: Array<{
      title: string
      hint?: string
    }>
  }
  visibility: 'private' | 'organization' | 'public' | 'marketplace'
  is_verified: boolean
  is_featured: boolean
  total_uses: number
  success_rate: number
  avg_rating: number
  created_at: string
  updated_at?: string
  published_at?: string
  variables: TemplateVariable[]
}

interface TemplateVariable {
  id: string
  name: string
  type: string
  required: boolean
  default_value?: string
  options?: any
  placeholder?: string
  description?: string
  help_text?: string
  order_index: number
}


export default function TemplatePage() {
  const params = useParams()
  const router = useRouter()
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userRating, setUserRating] = useState(0)

  useEffect(() => {
    if (params.id) {
      loadTemplate(params.id as string)
    }
  }, [params.id])

  const loadTemplate = async (templateId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE}/templates/${templateId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setTemplate(data)
      } else if (response.status === 404) {
        router.push('/templates')
      }
    } catch (error) {
      console.error('Failed to load template:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!template) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE}/templates/${template.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        router.push('/templates')
      } else {
        console.error('Failed to delete template')
        // TODO: Show error message
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleUseTemplate = () => {
    if (template) {
      // Navigate to studio with this template
      router.push(`/studio?template=${template.id}`)
    }
  }

  const getVisibilityConfig = (visibility: string) => {
    const configs = {
      private: { icon: LockClosedIcon, label: 'Private', color: 'text-gray-500' },
      organization: { icon: UsersIcon, label: 'Team', color: 'text-blue-500' },
      public: { icon: GlobeAltIcon, label: 'Public', color: 'text-green-500' },
      marketplace: { icon: SparklesIcon, label: 'Marketplace', color: 'text-purple-500' }
    }
    return configs[visibility as keyof typeof configs] || configs.private
  }

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            disabled={!interactive}
            onClick={() => interactive && setUserRating(i + 1)}
            className={`${interactive ? 'hover:scale-110 cursor-pointer' : ''} transition-transform`}
          >
            {i < Math.floor(rating) ? (
              <StarIconSolid className="w-4 h-4 text-yellow-400" />
            ) : (
              <StarIcon className="w-4 h-4 text-gray-300" />
            )}
          </button>
        ))}
        {!interactive && (
          <span className="text-sm text-gray-500 ml-2">
            {rating.toFixed(1)} ({template?.total_uses || 0} uses)
          </span>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i} className="mb-6 animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!template) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Template Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              The template you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/templates">
              <Button>Back to Templates</Button>
            </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  const visibilityConfig = getVisibilityConfig(template.visibility)

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/templates">
                <Button variant="outline" className="gap-2">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Templates
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleUseTemplate}
                size="lg"
                className="gap-2"
              >
                <DocumentTextIcon className="w-5 h-5" />
                Use Template
              </Button>
              
              <Link href={`/templates/${template.id}/edit`}>
                <Button variant="outline" size="lg" className="gap-2">
                  <PencilSquareIcon className="w-4 h-4" />
                  Edit
                </Button>
              </Link>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:border-red-300 gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>

          {/* Template Header Card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-2xl">{template.name}</CardTitle>
                    <Badge variant="outline" className="gap-2">
                      <visibilityConfig.icon className="w-3 h-3" />
                      {visibilityConfig.label}
                    </Badge>
                    {template.is_featured && (
                      <Badge variant="primary" className="gap-1">
                        <StarIcon className="w-3 h-3" />
                        Featured
                      </Badge>
                    )}
                    {template.is_verified && (
                      <Badge variant="success">Verified</Badge>
                    )}
                  </div>
                  
                  <CardDescription className="text-base mb-4">
                    {template.description}
                  </CardDescription>

                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="w-4 h-4" />
                      <span>{template.total_uses} uses</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span>Success Rate: {template.success_rate}%</span>
                    </div>
                    
                    <div>
                      {renderStars(template.avg_rating)}
                    </div>
                    
                    <div>
                      Version {template.version}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Template Variables */}
          {template.variables && template.variables.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Template Variables</CardTitle>
                <CardDescription>
                  Dynamic inputs that will be requested when using this template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {template.variables
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((variable, index) => (
                    <Card key={variable.id} variant="outline">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{variable.name}</span>
                          <Badge variant="outline" size="sm">
                            {variable.type}
                          </Badge>
                          {variable.required && (
                            <Badge variant="destructive" size="sm">
                              Required
                            </Badge>
                          )}
                        </div>
                        
                        {variable.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {variable.description}
                          </p>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Placeholder: "{variable.placeholder || `Enter ${variable.name}`}"
                          {variable.default_value && (
                            <span className="block">Default: "{variable.default_value}"</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Structure */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Document Structure</CardTitle>
              <CardDescription>
                Sections that will be generated using this template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {template.template_data.sections.map((section, index) => (
                  <Card key={index} variant="outline">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{section.title}</h4>
                          {section.hint && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {section.hint}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Template Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Document Mode</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {template.template_data.mode}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Created</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {new Date(template.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                {template.updated_at && (
                  <div>
                    <h4 className="font-medium mb-2">Last Updated</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {new Date(template.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {template.published_at && (
                  <div>
                    <h4 className="font-medium mb-2">Published</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {new Date(template.published_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Template</CardTitle>
              <CardDescription>
                Are you sure you want to delete "{template.name}"? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}