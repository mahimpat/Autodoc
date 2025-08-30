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
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {context.icon}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">{context.title}</span>
            <Badge className={context.badge.color}>
              {context.badge.text}
            </Badge>
            {uploadedFilesCount > 0 && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                {uploadedFilesCount} files
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {context.subtitle}
          </p>
        </div>
      </div>
      
      {isGenerating && (
        <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
          <SparklesIcon className="h-5 w-5 animate-pulse" />
          <span className="text-sm font-medium">Generating...</span>
        </div>
      )}
    </div>
  )
}