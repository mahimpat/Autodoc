'use client'

import { useWorkspace } from '@/lib/workspace-context'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  CloudArrowUpIcon,
  FolderIcon,
  UsersIcon,
  LockClosedIcon,
  ShareIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface UploadContextIndicatorProps {
  onUpload?: (files: FileList) => void
  uploadCount?: number
  isUploading?: boolean
}

export function UploadContextIndicator({ 
  onUpload, 
  uploadCount = 0, 
  isUploading = false 
}: UploadContextIndicatorProps) {
  const { currentOrganization, currentWorkspace } = useWorkspace()

  const getUploadContext = () => {
    if (currentOrganization && currentWorkspace) {
      return {
        type: 'workspace' as const,
        name: currentWorkspace.name,
        organization: currentOrganization.name,
        icon: <FolderIcon className="h-4 w-4 text-blue-600" />,
        visibility: 'shared',
        description: 'Files will be shared with your team'
      }
    } else if (currentOrganization) {
      return {
        type: 'organization' as const,
        name: currentOrganization.name,
        organization: currentOrganization.name,
        icon: <UsersIcon className="h-4 w-4 text-green-600" />,
        visibility: 'shared',
        description: 'Files will be shared with organization members'
      }
    } else {
      return {
        type: 'personal' as const,
        name: 'Personal Workspace',
        organization: null,
        icon: <LockClosedIcon className="h-4 w-4 text-gray-600" />,
        visibility: 'private',
        description: 'Files will be private to you'
      }
    }
  }

  const context = getUploadContext()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0 && onUpload) {
      onUpload(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0 && onUpload) {
      onUpload(files)
    }
  }

  return (
    <div className="space-y-4">
      {/* Context Indicator */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {context.icon}
            </div>
            <div>
              <div className="font-medium text-gray-900 flex items-center space-x-2">
                <span>Uploading to: {context.name}</span>
                <Badge 
                  className={
                    context.visibility === 'shared' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }
                >
                  <div className="flex items-center space-x-1">
                    {context.visibility === 'shared' ? (
                      <ShareIcon className="h-3 w-3" />
                    ) : (
                      <LockClosedIcon className="h-3 w-3" />
                    )}
                    <span>{context.visibility}</span>
                  </div>
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                {context.description}
              </div>
            </div>
          </div>
          
          {uploadCount > 0 && (
            <Badge className="bg-blue-100 text-blue-800">
              {uploadCount} files uploaded
            </Badge>
          )}
        </div>

        {context.type === 'personal' && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-800">Personal Mode</div>
                <div className="text-yellow-700">
                  Your uploads are private. Switch to an organization to collaborate with your team.
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Upload Area */}
      <Card 
        className={`p-8 border-2 border-dashed transition-colors ${
          isUploading 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {isUploading ? (
            <div className="space-y-3">
              <div className="animate-spin mx-auto h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <div className="text-sm text-blue-600 font-medium">Uploading files...</div>
            </div>
          ) : (
            <div className="space-y-3">
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Drop files here or click to upload
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Support for PDF, Word, text files and more
                </div>
              </div>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.md"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Choose Files
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* Upload Instructions */}
      {context.type === 'workspace' && (
        <div className="text-sm text-gray-600 space-y-1">
          <div className="font-medium">Team Upload Guidelines:</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Uploaded files will be accessible by all {context.organization} members</li>
            <li>Files are automatically processed and made available for document generation</li>
            <li>Most recent uploads take priority in content generation</li>
            <li>Remove sensitive information before uploading</li>
          </ul>
        </div>
      )}
    </div>
  )
}