'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { 
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  SparklesIcon,
  TagIcon,
  GlobeAltIcon,
  LockClosedIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { API_BASE } from '../../../lib/api'
import Header from '../../../components/Header'

interface TemplateVariable {
  id?: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'url' | 'email'
  required: boolean
  default_value?: string
  options?: { [key: string]: any }
  placeholder?: string
  description?: string
  help_text?: string
  order_index: number
}

interface TemplateSection {
  title: string
  hint?: string
}

interface TemplateData {
  mode: string
  metadata?: {
    required?: string[]
    optional?: string[]
  }
  sections: TemplateSection[]
}

interface Category {
  id: string
  name: string
  description: string
  icon: string
  color: string
}


export default function CreateTemplatePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    tags: [] as string[],
    visibility: 'private' as 'private' | 'organization' | 'public' | 'marketplace'
  })
  
  const [templateData, setTemplateData] = useState<TemplateData>({
    mode: 'Custom Template',
    sections: [
      { title: 'Introduction', hint: 'Provide an overview and context for this document' }
    ]
  })
  
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

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

  const handleTagAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tagInput.trim()]
        }))
      }
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addSection = () => {
    setTemplateData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        { title: 'New Section', hint: 'Describe what should be covered in this section' }
      ]
    }))
  }

  const updateSection = (index: number, field: 'title' | 'hint', value: string) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section
      )
    }))
  }

  const removeSection = (index: number) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }))
  }

  const addVariable = () => {
    const newVariable: TemplateVariable = {
      name: `variable_${variables.length + 1}`,
      type: 'string',
      required: false,
      placeholder: '',
      description: '',
      order_index: variables.length
    }
    setVariables([...variables, newVariable])
  }

  const updateVariable = (index: number, field: keyof TemplateVariable, value: any) => {
    setVariables(prev => 
      prev.map((variable, i) =>
        i === index ? { ...variable, [field]: value } : variable
      )
    )
  }

  const removeVariable = (index: number) => {
    setVariables(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id || null,
        tags: formData.tags,
        visibility: formData.visibility,
        template_data: templateData,
        variables: variables
      }

      const response = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const template = await response.json()
        // Add a query parameter to indicate we should show smart templates
        router.push(`/studio?smart_templates=true`)
      } else {
        const error = await response.json()
        console.error('Failed to create template:', error)
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('Error creating template:', error)
      // TODO: Show error message to user
    } finally {
      setIsLoading(false)
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return <GlobeAltIcon className="w-4 h-4" />
      case 'organization': return <UsersIcon className="w-4 h-4" />
      case 'marketplace': return <SparklesIcon className="w-4 h-4" />
      default: return <LockClosedIcon className="w-4 h-4" />
    }
  }

  if (previewMode) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Preview Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setPreviewMode(false)}
                  className="gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Editor
                </Button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Template Preview
                </h1>
              </div>
            </div>

            {/* Template Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{formData.name || 'Untitled Template'}</CardTitle>
                    <CardDescription className="mt-2">
                      {formData.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-2">
                    {getVisibilityIcon(formData.visibility)}
                    {formData.visibility}
                  </Badge>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-6">
                  {/* Variables Section */}
                  {variables.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Template Variables</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {variables.map((variable, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{variable.name}</span>
                              <Badge variant="outline" size="sm">{variable.type}</Badge>
                              {variable.required && (
                                <Badge variant="destructive" size="sm">Required</Badge>
                              )}
                            </div>
                            {variable.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {variable.description}
                              </p>
                            )}
                            <Input
                              placeholder={variable.placeholder || `Enter ${variable.name}`}
                              disabled
                              className="opacity-60"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sections Preview */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Document Structure</h3>
                    <div className="space-y-4">
                      {templateData.sections.map((section, index) => (
                        <Card key={index} variant="outline">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {index + 1}. {section.title}
                            </CardTitle>
                            {section.hint && (
                              <CardDescription className="text-sm">
                                {section.hint}
                              </CardDescription>
                            )}
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/templates">
                <Button variant="outline" className="gap-2">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Templates
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Create Template
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Build a reusable document template for your team
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setPreviewMode(true)}
                className="gap-2"
              >
                <EyeIcon className="w-4 h-4" />
                Preview
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !formData.name}
                className="gap-2"
              >
                <DocumentTextIcon className="w-4 h-4" />
                {isLoading ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Define the template name, description and categorization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Template Name</label>
                      <Input
                        placeholder="e.g., API Documentation Template"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        rows={3}
                        placeholder="Describe what this template is used for..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        value={formData.category_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.icon} {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Visibility</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'private', label: 'Private', desc: 'Only you can see this' },
                          { value: 'organization', label: 'Team', desc: 'Your team can use this' },
                          { value: 'public', label: 'Public', desc: 'Anyone can discover this' },
                          { value: 'marketplace', label: 'Marketplace', desc: 'Featured in marketplace' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, visibility: option.value as any }))}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              formData.visibility === option.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {getVisibilityIcon(option.value)}
                              <span className="font-medium text-sm">{option.label}</span>
                            </div>
                            <p className="text-xs text-gray-500">{option.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Tags</label>
                      <div className="space-y-2">
                        <Input
                          placeholder="Add tags (press Enter)"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagAdd}
                        />
                        {formData.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(tag)}
                                  className="hover:text-red-500"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Template Variables */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Template Variables</CardTitle>
                        <CardDescription>
                          Define dynamic inputs for your template
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addVariable}
                        className="gap-2"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Add Variable
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {variables.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <TagIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No variables defined</p>
                        <p className="text-sm">Variables make your templates dynamic and reusable</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {variables.map((variable, index) => (
                          <Card key={index} variant="outline">
                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Variable Name</label>
                                  <Input
                                    value={variable.name}
                                    onChange={(e) => updateVariable(index, 'name', e.target.value)}
                                    placeholder="e.g., project_name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Type</label>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                                    value={variable.type}
                                    onChange={(e) => updateVariable(index, 'type', e.target.value)}
                                  >
                                    <option value="string">Text</option>
                                    <option value="textarea">Long Text</option>
                                    <option value="number">Number</option>
                                    <option value="email">Email</option>
                                    <option value="url">URL</option>
                                    <option value="boolean">Checkbox</option>
                                    <option value="select">Dropdown</option>
                                  </select>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Placeholder</label>
                                  <Input
                                    value={variable.placeholder || ''}
                                    onChange={(e) => updateVariable(index, 'placeholder', e.target.value)}
                                    placeholder="Enter placeholder text"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Default Value</label>
                                  <Input
                                    value={variable.default_value || ''}
                                    onChange={(e) => updateVariable(index, 'default_value', e.target.value)}
                                    placeholder="Default value (optional)"
                                  />
                                </div>
                              </div>

                              <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <Input
                                  value={variable.description || ''}
                                  onChange={(e) => updateVariable(index, 'description', e.target.value)}
                                  placeholder="Describe what this variable is used for"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={variable.required}
                                    onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm font-medium">Required</span>
                                </label>
                                
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeVariable(index)}
                                  className="text-red-600 hover:text-red-700 gap-1"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                  Remove
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Template Structure */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Document Structure</CardTitle>
                        <CardDescription>
                          Define the sections and content flow
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSection}
                        className="gap-2"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Add Section
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {templateData.sections.map((section, index) => (
                        <Card key={index} variant="outline">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 font-medium">
                                  Section {index + 1}
                                </span>
                                {templateData.sections.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeSection(index)}
                                    className="text-red-600 hover:text-red-700 gap-1"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium mb-1">Section Title</label>
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateSection(index, 'title', e.target.value)}
                                  placeholder="e.g., Introduction"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium mb-1">Content Hint</label>
                                <textarea
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                                  rows={2}
                                  value={section.hint || ''}
                                  onChange={(e) => updateSection(index, 'hint', e.target.value)}
                                  placeholder="Describe what content should be included in this section..."
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
          </div>
        </div>
      </div>
    </>
  )
}