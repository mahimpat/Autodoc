'use client'

import { useState } from 'react'
import { Search, Plus, Bell, Settings } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Badge } from './ui/Badge'

interface StudioHeaderProps {
  title: string
  subtitle?: string
  onSearch?: (query: string) => void
  showNotifications?: boolean
  notificationCount?: number
}

export function StudioHeader({ 
  title, 
  subtitle, 
  onSearch, 
  showNotifications = true,
  notificationCount = 0 
}: StudioHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  return (
    <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-slate-100 mb-1">
              {title}
            </h1>
            {subtitle && (
              <p className="text-slate-400 text-sm">
                {subtitle}
              </p>
            )}
          </div>

          {/* Search and Actions */}
          <div className="flex items-center space-x-4 ml-6">
            {/* Search */}
            {onSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 w-64 bg-slate-800/50 border-slate-700/50 focus:border-slate-600"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 hover:border-slate-500 bg-slate-800/50"
              >
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>

              {showNotifications && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                >
                  <Bell className="w-4 h-4" />
                  {notificationCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}