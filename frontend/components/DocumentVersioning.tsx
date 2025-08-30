'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  ClockIcon,
  CodeBracketIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftIcon,
  TagIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface DocumentVersion {
  id: number
  version_number: string
  branch_name: string
  title: string
  content: string
  change_summary: string | null
  word_count: number
  character_count: number
  readability_score: number | null
  is_published: boolean
  is_draft: boolean
  approval_status: 'draft' | 'pending' | 'approved' | 'rejected'
  created_at: string
  created_by_id: number
  parent_version_id: number | null
}

interface VersionDiff {
  diff: string
  changes: any[]
  stats: {
    old_version: string
    new_version: string
    old_word_count: number
    new_word_count: number
    word_count_change: number
  }
}

interface DocumentVersioningProps {
  documentId: number
  onVersionSelect?: (version: DocumentVersion) => void
}

export function DocumentVersioning({ documentId, onVersionSelect }: DocumentVersioningProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)
  const [compareVersion, setCompareVersion] = useState<DocumentVersion | null>(null)
  const [diff, setDiff] = useState<VersionDiff | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDiff, setShowDiff] = useState(false)

  const fetchVersions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const versionData = await response.json()
        setVersions(versionData)
        if (versionData.length > 0 && !selectedVersion) {
          setSelectedVersion(versionData[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDiff = async (versionId: number, compareToId?: number) => {
    try {
      const url = compareToId 
        ? `/api/documents/${documentId}/versions/${versionId}/diff?compare_to=${compareToId}`
        : `/api/documents/${documentId}/versions/${versionId}/diff`
      
      const response = await fetch(url, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const diffData = await response.json()
        setDiff(diffData)
        setShowDiff(true)
      }
    } catch (error) {
      console.error('Failed to fetch diff:', error)
    }
  }

  const approveVersion = async (versionId: number) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/approve`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        await fetchVersions() // Refresh
      }
    } catch (error) {
      console.error('Failed to approve version:', error)
    }
  }

  const publishVersion = async (versionId: number) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/publish`, {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        await fetchVersions() // Refresh
      }
    } catch (error) {
      console.error('Failed to publish version:', error)
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [documentId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getReadabilityLevel = (score: number | null) => {
    if (!score) return { level: 'Unknown', color: 'text-gray-500' }
    if (score >= 90) return { level: 'Very Easy', color: 'text-green-600' }
    if (score >= 80) return { level: 'Easy', color: 'text-green-500' }
    if (score >= 70) return { level: 'Fairly Easy', color: 'text-yellow-600' }
    if (score >= 60) return { level: 'Standard', color: 'text-yellow-500' }
    if (score >= 50) return { level: 'Fairly Difficult', color: 'text-orange-500' }
    if (score >= 30) return { level: 'Difficult', color: 'text-red-500' }
    return { level: 'Very Difficult', color: 'text-red-600' }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-16 h-8 bg-gray-200 rounded"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-6 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Version List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Version History
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiff(!showDiff)}
              disabled={!selectedVersion || !compareVersion}
            >
              <CodeBracketIcon className="h-4 w-4 mr-1" />
              {showDiff ? 'Hide Diff' : 'Show Diff'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedVersion?.id === version.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                setSelectedVersion(version)
                if (onVersionSelect) onVersionSelect(version)
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      v{version.version_number}
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-800">
                      {version.branch_name}
                    </Badge>
                    <Badge className={getStatusColor(version.approval_status)}>
                      {version.approval_status}
                    </Badge>
                    {version.is_published && (
                      <Badge className="bg-green-100 text-green-800">
                        Published
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-1">{version.title}</h3>
                  
                  {version.change_summary && (
                    <p className="text-sm text-gray-600 mb-2">{version.change_summary}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{version.word_count} words</span>
                    <span>{version.character_count} characters</span>
                    {version.readability_score && (
                      <span className={getReadabilityLevel(version.readability_score).color}>
                        {getReadabilityLevel(version.readability_score).level}
                      </span>
                    )}
                    <span>{new Date(version.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCompareVersion(version)
                    }}
                    className={compareVersion?.id === version.id ? 'bg-yellow-50' : ''}
                  >
                    Compare
                  </Button>
                  
                  {version.approval_status === 'draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        approveVersion(version.id)
                      }}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {version.approval_status === 'approved' && !version.is_published && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        publishVersion(version.id)
                      }}
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Diff Viewer */}
      {showDiff && diff && selectedVersion && compareVersion && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center mb-2">
              <CodeBracketIcon className="h-5 w-5 mr-2" />
              Changes: v{diff.stats.old_version} → v{diff.stats.new_version}
            </h3>
            <div className="flex space-x-6 text-sm text-gray-600">
              <span>Words: {diff.stats.old_word_count} → {diff.stats.new_word_count}</span>
              <span className={diff.stats.word_count_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                {diff.stats.word_count_change >= 0 ? '+' : ''}{diff.stats.word_count_change}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap">
              {diff.changes.map((change, index) => (
                <div key={index} className="mb-2">
                  {change.lines?.map((line: any, lineIndex: number) => (
                    <div
                      key={lineIndex}
                      className={`${
                        line.type === 'added' ? 'bg-green-100 text-green-800' :
                        line.type === 'removed' ? 'bg-red-100 text-red-800' :
                        'text-gray-700'
                      } px-2 py-1`}
                    >
                      <span className="text-gray-400 mr-2">
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                      </span>
                      {line.content}
                    </div>
                  ))}
                </div>
              ))}
            </pre>
          </div>
        </Card>
      )}

      {/* Version Analytics */}
      {selectedVersion && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Version Analytics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {selectedVersion.word_count}
              </div>
              <div className="text-sm text-blue-700">Words</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {selectedVersion.readability_score?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-green-700">Readability</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-900">
                {selectedVersion.character_count}
              </div>
              <div className="text-sm text-purple-700">Characters</div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-900">
                v{selectedVersion.version_number}
              </div>
              <div className="text-sm text-yellow-700">Version</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}