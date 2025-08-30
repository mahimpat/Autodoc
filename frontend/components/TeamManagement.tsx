'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/lib/workspace-context'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  UsersIcon, 
  PlusIcon, 
  EnvelopeIcon, 
  TrashIcon,
  StarIcon,
  ShieldCheckIcon,
  UserIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface TeamMember {
  id: number
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_at: string
  last_active?: string
}

interface Invitation {
  id: number
  email: string
  role: string
  created_at: string
  expires_at: string
  is_accepted: boolean
}

export function TeamManagement() {
  const { currentOrganization, inviteMember } = useWorkspace()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'viewer'>('member')
  const [isLoading, setIsLoading] = useState(false)

  const fetchTeamData = async () => {
    if (!currentOrganization) return

    setIsLoading(true)
    try {
      // Fetch members
      const membersResponse = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
        credentials: 'include'
      })
      if (membersResponse.ok) {
        const memberData = await membersResponse.json()
        setMembers(memberData)
      }

      // Fetch pending invitations
      const invitationsResponse = await fetch(`/api/organizations/${currentOrganization.id}/invitations`, {
        credentials: 'include'
      })
      if (invitationsResponse.ok) {
        const invitationData = await invitationsResponse.json()
        setInvitations(invitationData)
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamData()
  }, [currentOrganization])

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !currentOrganization) return

    const success = await inviteMember(currentOrganization.id, inviteEmail, inviteRole)
    if (success) {
      setInviteEmail('')
      setInviteRole('member')
      setShowInviteForm(false)
      await fetchTeamData() // Refresh data
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <StarIcon className="h-4 w-4 text-yellow-500" />
      case 'admin': return <ShieldCheckIcon className="h-4 w-4 text-blue-500" />
      case 'viewer': return <EyeIcon className="h-4 w-4 text-gray-500" />
      default: return <UserIcon className="h-4 w-4 text-green-500" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  if (!currentOrganization) {
    return (
      <Card className="p-6 text-center">
        <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Organization Selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select an organization to manage team members.
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
            <UsersIcon className="h-5 w-5 mr-2" />
            Team Members
          </h2>
          <p className="text-sm text-gray-600">
            Manage your {currentOrganization.name} team
          </p>
        </div>
        <Button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Invite Member</span>
        </Button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="p-4">
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button type="submit">Send Invitation</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Current Members */}
      <Card className="p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Current Members</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 mt-1"></div>
                </div>
              </div>
            ))}
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{member.email}</div>
                    <div className="text-xs text-gray-500">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={`flex items-center space-x-1 ${getRoleColor(member.role)}`}>
                    {getRoleIcon(member.role)}
                    <span className="capitalize">{member.role}</span>
                  </Badge>
                  {member.role !== 'owner' && (
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <UsersIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No team members yet</p>
          </div>
        )}
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-md font-medium text-gray-900 mb-4">Pending Invitations</h3>
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-4">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                    <div className="text-xs text-gray-500">
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={`flex items-center space-x-1 ${getRoleColor(invitation.role)}`}>
                    {getRoleIcon(invitation.role)}
                    <span className="capitalize">{invitation.role}</span>
                  </Badge>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-800">
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}