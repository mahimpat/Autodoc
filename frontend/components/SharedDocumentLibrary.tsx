'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/lib/workspace-context'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  ShareIcon,
  LockClosedIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline'

interface SharedDocument {
  id: number
  title: string
  template: string
  created_at: string
  user_id: number
  user_email?: string
  is_public_in_workspace: boolean
  is_template: boolean
  workspace_id?: number
  content?: any
}

type FilterType = 'all' | 'public' | 'templates' | 'my-documents'
type SortType = 'recent' | 'title' | 'creator'

export function SharedDocumentLibrary() {
  const { currentOrganization, currentWorkspace } = useWorkspace()
  const [documents, setDocuments] = useState<SharedDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<SharedDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('recent')

  const fetchDocuments = async () => {
    if (!currentOrganization) return

    setIsLoading(true)
    try {
      const endpoint = currentWorkspace 
        ? `/api/organizations/${currentOrganization.id}/workspaces/${currentWorkspace.id}/documents`
        : `/api/organizations/${currentOrganization.id}/documents`
      
      const response = await fetch(endpoint, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const docs = await response.json()
        setDocuments(docs)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [currentOrganization, currentWorkspace])

  useEffect(() => {
    let filtered = documents

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.template.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply type filter
    switch (filter) {
      case 'public':
        filtered = filtered.filter(doc => doc.is_public_in_workspace)
        break
      case 'templates':
        filtered = filtered.filter(doc => doc.is_template)
        break
      case 'my-documents':
        // This would need current user ID - simplified for now
        break
    }

    // Apply sorting
    switch (sort) {
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'creator':
        filtered.sort((a, b) => (a.user_email || '').localeCompare(b.user_email || ''))
        break
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }

    setFilteredDocuments(filtered)
  }, [documents, searchTerm, filter, sort])

  const toggleDocumentVisibility = async (docId: number, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/documents/${docId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ is_public_in_workspace: !isPublic })
      })
      
      if (response.ok) {
        await fetchDocuments() // Refresh
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error)
    }
  }

  const getTemplateColor = (template: string) => {
    const colors = {
      'readme': 'bg-blue-100 text-blue-800',
      'api': 'bg-green-100 text-green-800',
      'technical': 'bg-purple-100 text-purple-800',
      'legal': 'bg-red-100 text-red-800',
      'research': 'bg-yellow-100 text-yellow-800'
    }
    const key = template.toLowerCase()
    for (const [name, color] of Object.entries(colors)) {
      if (key.includes(name)) return color
    }
    return 'bg-gray-100 text-gray-800'
  }

  if (!currentOrganization) {
    return (
      <Card className="p-6 text-center">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Organization Selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select an organization to view shared documents.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Shared Documents
          </h2>
          <p className="text-sm text-gray-600">
            {currentWorkspace ? `${currentWorkspace.name} workspace` : `${currentOrganization.name} documents`}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search documents..."
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">All Documents</option>
              <option value="public">Public in Workspace</option>
              <option value="templates">Templates</option>
              <option value="my-documents">My Documents</option>
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <ClockIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="recent">Most Recent</option>
              <option value="title">Title A-Z</option>
              <option value="creator">Creator</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Document List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <div className="animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-64 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-8 w-16 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{doc.title}</h3>
                      {doc.is_template && (
                        <Badge className="bg-purple-100 text-purple-800 text-xs">Template</Badge>
                      )}
                      {doc.is_public_in_workspace ? (
                        <ShareIcon className="h-4 w-4 text-green-500" title="Public in workspace" />
                      ) : (
                        <LockClosedIcon className="h-4 w-4 text-gray-400" title="Private" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <Badge className={getTemplateColor(doc.template)}>
                        {doc.template.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-4 w-4" />
                        <span>{doc.user_email || `User ${doc.user_id}`}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/doc/${doc.id}`, '_blank')}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDocumentVisibility(doc.id, doc.is_public_in_workspace)}
                      className={doc.is_public_in_workspace ? 'text-green-600 hover:text-green-800' : 'text-gray-600 hover:text-gray-800'}
                    >
                      {doc.is_public_in_workspace ? (
                        <ShareIcon className="h-4 w-4" />
                      ) : (
                        <LockClosedIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No documents in this workspace yet'}
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}