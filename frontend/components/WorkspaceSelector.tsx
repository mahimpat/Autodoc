'use client'

import { useState } from 'react'
import { useWorkspace } from '@/lib/workspace-context'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ChevronDownIcon, PlusIcon, UsersIcon, FolderIcon } from '@heroicons/react/24/outline'

export function WorkspaceSelector() {
  const {
    organizations,
    currentOrganization,
    currentWorkspace,
    workspaces,
    isLoading,
    error,
    setCurrentOrganization,
    setCurrentWorkspace,
    createOrganization
  } = useWorkspace()
  
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgDescription, setNewOrgDescription] = useState('')

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return

    const org = await createOrganization(newOrgName, newOrgDescription)
    if (org) {
      setCurrentOrganization(org)
      setShowCreateOrg(false)
      setNewOrgName('')
      setNewOrgDescription('')
    }
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative">
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {currentOrganization ? (
                <FolderIcon className="h-5 w-5 text-blue-600" />
              ) : (
                <UsersIcon className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {currentOrganization ? currentOrganization.name : 'Personal Workspace'}
              </div>
              {currentWorkspace && (
                <div className="text-sm text-gray-600">
                  {currentWorkspace.name}
                </div>
              )}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-1"
          >
            <span>Switch</span>
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </Card>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <Card className="p-4 bg-white border shadow-lg">
            <div className="space-y-4">
              {/* Personal Workspace */}
              <div>
                <button
                  onClick={() => {
                    setCurrentOrganization(null)
                    setCurrentWorkspace(null)
                    setShowDropdown(false)
                  }}
                  className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                    !currentOrganization ? 'bg-blue-50 border-blue-200 border' : 'border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <UsersIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">Personal Workspace</div>
                      <div className="text-sm text-gray-600">Your private documents and uploads</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Organizations */}
              {organizations.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Organizations</h4>
                  <div className="space-y-1">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          setCurrentOrganization(org)
                          setShowDropdown(false)
                        }}
                        className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                          currentOrganization?.id === org.id ? 'bg-blue-50 border-blue-200 border' : 'border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <FolderIcon className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-medium text-gray-900">{org.name}</div>
                            <div className="text-sm text-gray-600">
                              {org.member_count} members • {org.workspace_count} workspaces
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Create Organization */}
              {!showCreateOrg ? (
                <Button
                  onClick={() => setShowCreateOrg(true)}
                  variant="outline"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Create Organization</span>
                </Button>
              ) : (
                <form onSubmit={handleCreateOrganization} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Acme Inc"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={newOrgDescription}
                      onChange={(e) => setNewOrgDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your organization description"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit" size="sm">Create</Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreateOrg(false)
                        setNewOrgName('')
                        setNewOrgDescription('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}