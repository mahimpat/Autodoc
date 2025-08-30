'use client'

import { useWorkspace } from '@/lib/workspace-context'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  SparklesIcon,
  DocumentTextIcon,
  UsersIcon,
  LockClosedIcon,
  ShareIcon,
  InformationCircleIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline'

interface GenerationContextInfoProps {
  uploadedFilesCount?: number
  isGenerating?: boolean
}

export function GenerationContextInfo({ 
  uploadedFilesCount = 0, 
  isGenerating = false 
}: GenerationContextInfoProps) {
  const { currentOrganization, currentWorkspace } = useWorkspace()

  const getGenerationContext = () => {
    if (currentOrganization && currentWorkspace) {
      return {
        type: 'workspace' as const,
        title: `${currentWorkspace.name} Workspace`,
        subtitle: `${currentOrganization.name} • Team Content`,
        icon: <FolderOpenIcon className="h-5 w-5 text-blue-600" />,
        badge: { text: 'Team Mode', color: 'bg-blue-100 text-blue-800' },
        description: 'Using shared team content for generation',
        contentSource: 'Latest team uploads and shared documents'
      }
    } else if (currentOrganization) {
      return {
        type: 'organization' as const,
        title: currentOrganization.name,
        subtitle: 'Organization Content',
        icon: <UsersIcon className="h-5 w-5 text-green-600" />,
        badge: { text: 'Organization', color: 'bg-green-100 text-green-800' },
        description: 'Using organization-wide content for generation',
        contentSource: 'Organization uploads and documents'
      }
    } else {
      return {
        type: 'personal' as const,
        title: 'Personal Workspace',
        subtitle: 'Your Private Content',
        icon: <LockClosedIcon className="h-5 w-5 text-gray-600" />,
        badge: { text: 'Personal', color: 'bg-gray-100 text-gray-800' },
        description: 'Using your personal uploads for generation',
        contentSource: 'Your uploaded files and documents'
      }
    }
  }

  const context = getGenerationContext()

  return (
    <div className="space-y-4">
      {/* Main Context Card */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {context.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-gray-900">{context.title}</h3>
                <Badge className={context.badge.color}>
                  {context.badge.text}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {context.subtitle}
              </p>
              <p className="text-xs text-gray-500">
                {context.description}
              </p>
            </div>
          </div>
          
          {isGenerating && (
            <div className="flex items-center space-x-2 text-purple-600">
              <SparklesIcon className="h-5 w-5 animate-pulse" />
              <span className="text-sm font-medium">Generating...</span>
            </div>
          )}
        </div>
      </Card>

      {/* Content Source Info */}
      <Card className="p-4">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 mb-2">
              Content Source
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center justify-between">
                <span>{context.contentSource}</span>
                {uploadedFilesCount > 0 && (
                  <Badge className="bg-green-100 text-green-800">
                    {uploadedFilesCount} files available
                  </Badge>
                )}
              </div>
              
              {uploadedFilesCount === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="text-sm text-yellow-800">
                    No uploaded files found. Upload documents to improve generation quality.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Generation Features */}
      <Card className="p-4">
        <div className="text-sm space-y-3">
          <div className="font-medium text-gray-900 flex items-center space-x-2">
            <SparklesIcon className="h-4 w-4" />
            <span>Generation Features</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="h-4 w-4 text-blue-500" />
              <span>Content-driven generation</span>
            </div>
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-4 w-4 text-purple-500" />
              <span>Smart content prioritization</span>
            </div>
            {context.type !== 'personal' && (
              <>
                <div className="flex items-center space-x-2">
                  <ShareIcon className="h-4 w-4 text-green-500" />
                  <span>Team collaboration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <UsersIcon className="h-4 w-4 text-blue-500" />
                  <span>Shared knowledge base</span>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Workspace Benefits */}
      {context.type === 'workspace' && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm space-y-2">
            <div className="font-medium text-green-900 flex items-center space-x-2">
              <UsersIcon className="h-4 w-4" />
              <span>Team Workspace Benefits</span>
            </div>
            <ul className="text-xs text-green-800 space-y-1 ml-6">
              <li>• Access to all team members' uploads</li>
              <li>• Shared document templates and knowledge</li>
              <li>• Consistent documentation across projects</li>
              <li>• Collaborative content refinement</li>
            </ul>
          </div>
        </Card>
      )}

      {/* Personal Mode Notice */}
      {context.type === 'personal' && uploadedFilesCount === 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm space-y-2">
            <div className="font-medium text-blue-900">
              💡 Maximize Generation Quality
            </div>
            <div className="text-xs text-blue-800 space-y-1">
              <div>• Upload relevant documents before generating</div>
              <div>• Join or create an organization for team collaboration</div>
              <div>• Use specific, descriptive titles for better results</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}