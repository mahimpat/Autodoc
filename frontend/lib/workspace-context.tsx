'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Organization {
  id: number
  name: string
  slug: string
  description?: string
  is_active: boolean
  member_count: number
  workspace_count: number
  created_at: string
  user_role: 'owner' | 'admin' | 'member' | 'viewer'
}

interface Workspace {
  id: number
  name: string
  description?: string
  organization_id: number
  is_public: boolean
  is_active: boolean
  created_at: string
  created_by_id: number
}

interface WorkspaceContextType {
  organizations: Organization[]
  currentOrganization: Organization | null
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchOrganizations: () => Promise<void>
  setCurrentOrganization: (org: Organization | null) => void
  setCurrentWorkspace: (workspace: Workspace | null) => void
  createOrganization: (name: string, description?: string) => Promise<Organization | null>
  inviteMember: (orgId: number, email: string, role: string) => Promise<boolean>
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizations = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('http://localhost:8000/organizations/', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const orgs = await response.json()
        setOrganizations(orgs)
        
        // Auto-select first organization if none selected
        if (orgs.length > 0 && !currentOrganization) {
          setCurrentOrganization(orgs[0])
        }
      } else {
        throw new Error('Failed to fetch organizations')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWorkspaces = async (orgId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/organizations/${orgId}/workspaces`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const workspaceList = await response.json()
        setWorkspaces(workspaceList)
        
        // Auto-select first workspace if none selected
        if (workspaceList.length > 0 && !currentWorkspace) {
          setCurrentWorkspace(workspaceList[0])
        }
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err)
    }
  }

  const createOrganization = async (name: string, description?: string): Promise<Organization | null> => {
    setError(null)
    
    try {
      const response = await fetch('http://localhost:8000/organizations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ name, description })
      })
      
      if (response.ok) {
        const newOrg = await response.json()
        await fetchOrganizations() // Refresh list
        return newOrg
      } else {
        throw new Error('Failed to create organization')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    }
  }

  const inviteMember = async (orgId: number, email: string, role: string): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:8000/organizations/${orgId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, role })
      })
      
      return response.ok
    } catch (err) {
      console.error('Failed to invite member:', err)
      return false
    }
  }

  // Load organizations on mount
  useEffect(() => {
    fetchOrganizations()
  }, [])

  // Load workspaces when organization changes
  useEffect(() => {
    if (currentOrganization) {
      fetchWorkspaces(currentOrganization.id)
    } else {
      setWorkspaces([])
      setCurrentWorkspace(null)
    }
  }, [currentOrganization])

  const value: WorkspaceContextType = {
    organizations,
    currentOrganization,
    currentWorkspace,
    workspaces,
    isLoading,
    error,
    fetchOrganizations,
    setCurrentOrganization,
    setCurrentWorkspace,
    createOrganization,
    inviteMember
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}