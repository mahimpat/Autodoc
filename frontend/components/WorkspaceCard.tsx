'use client'

import { Card, CardContent } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { 
  UsersIcon, 
  DocumentDuplicateIcon, 
  ClockIcon, 
  EllipsisHorizontalIcon,
  CogIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import { useWorkspace } from '../lib/workspace-context'

interface WorkspaceCardProps {
  workspace?: {
    id: number
    name: string
    description?: string
    member_count?: number
    document_count?: number
    created_at: string
    is_public: boolean
  }
  isLoading?: boolean
}

export function WorkspaceCard({ workspace, isLoading = false }: WorkspaceCardProps) {
  const { setCurrentWorkspace } = useWorkspace()

  if (isLoading) {
    return (
      <Card className="card animate-pulse">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              </div>
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            </div>
            
            <div className="flex items-center space-x-4 pt-2">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-8" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-8" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!workspace) {
    return (
      <Card className="border-dashed border-muted/50 bg-muted/20 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground mb-2">
            <DocumentDuplicateIcon className="w-8 h-8 mx-auto mb-2 opacity-60" />
            <p className="text-sm">No workspace selected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="card group animate-scale-in hover:scale-[1.02] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-card-foreground truncate mb-1">
              {workspace.name}
            </h3>
            {workspace.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {workspace.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Badge variant={workspace.is_public ? "outline" : "secondary"} className="text-xs">
              {workspace.is_public ? 'Public' : 'Private'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
            >
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <UsersIcon className="w-4 h-4" />
              <span>{workspace.member_count || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span>{workspace.document_count || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <ClockIcon className="w-4 h-4" />
              <span>{formatDate(workspace.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <CogIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ShareIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWorkspace(workspace)}
              className="group-hover:shadow-lg group-hover:shadow-primary/10"
            >
              Select
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}