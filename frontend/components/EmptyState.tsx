import { Card, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { ForwardRefExoticComponent, SVGProps } from 'react'

interface EmptyStateProps {
  icon: ForwardRefExoticComponent<SVGProps<SVGSVGElement>>
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className = "" 
}: EmptyStateProps) {
  return (
    <Card className={`bg-slate-800/30 border-slate-700/30 rounded-2xl border-dashed ${className}`}>
      <CardContent className="p-6 text-center">
        <div className="mx-auto w-12 h-12 bg-slate-700/30 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-200 mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          {description}
        </p>
        {action && (
          <Button
            onClick={action.onClick}
            variant="outline"
            size="sm"
            className="border-slate-600 hover:border-slate-500"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}