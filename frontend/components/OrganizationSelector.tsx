'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';

interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  member_count: number;
  workspace_count: number;
  user_role: string;
  created_at: string;
}

interface Workspace {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  document_count: number;
  created_at: string;
  created_by: {
    id: number;
    name: string;
  };
}

interface OrganizationSelectorProps {
  onOrganizationChange?: (org: Organization | null) => void;
  onWorkspaceChange?: (workspace: Workspace | null) => void;
}

export function OrganizationSelector({ 
  onOrganizationChange, 
  onWorkspaceChange 
}: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  // Load user organizations
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Load workspaces when organization changes
  useEffect(() => {
    if (currentOrg) {
      fetchWorkspaces(currentOrg.id);
      if (onOrganizationChange) onOrganizationChange(currentOrg);
    }
  }, [currentOrg, onOrganizationChange]);

  // Notify workspace change
  useEffect(() => {
    if (onWorkspaceChange) onWorkspaceChange(currentWorkspace);
  }, [currentWorkspace, onWorkspaceChange]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/organizations/', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const orgs = await response.json();
        setOrganizations(orgs);
        
        // Select first organization by default
        if (orgs.length > 0 && !currentOrg) {
          setCurrentOrg(orgs[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async (orgId: number) => {
    try {
      const response = await fetch(`/organizations/${orgId}/workspaces`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const workspaceList = await response.json();
        setWorkspaces(workspaceList);
        
        // Select first workspace by default
        if (workspaceList.length > 0) {
          setCurrentWorkspace(workspaceList[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  const createOrganization = async () => {
    try {
      const response = await fetch('/organizations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newOrgName,
          description: newOrgDescription
        })
      });

      if (response.ok) {
        const newOrg = await response.json();
        setOrganizations([...organizations, newOrg]);
        setCurrentOrg(newOrg);
        setShowCreateOrg(false);
        setNewOrgName('');
        setNewOrgDescription('');
      }
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  const createWorkspace = async () => {
    if (!currentOrg) return;

    try {
      const response = await fetch(`/organizations/${currentOrg.id}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newWorkspaceName,
          description: newWorkspaceDescription,
          is_public: true
        })
      });

      if (response.ok) {
        const newWorkspace = await response.json();
        setWorkspaces([...workspaces, newWorkspace]);
        setCurrentWorkspace(newWorkspace);
        setShowCreateWorkspace(false);
        setNewWorkspaceName('');
        setNewWorkspaceDescription('');
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const inviteUser = async () => {
    if (!currentOrg) return;

    try {
      const response = await fetch(`/organizations/${currentOrg.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });

      if (response.ok) {
        setShowInviteModal(false);
        setInviteEmail('');
        alert('Invitation sent successfully!');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500';
      case 'admin': return 'bg-blue-500';
      case 'member': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Organization Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Organization</span>
            <Button
              size="sm"
              onClick={() => setShowCreateOrg(true)}
              disabled={showCreateOrg}
            >
              + New Org
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current Organization Display */}
          {currentOrg && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{currentOrg.name}</h3>
                  <p className="text-sm text-gray-600">
                    {currentOrg.member_count} members • {currentOrg.workspace_count} workspaces
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleBadgeColor(currentOrg.user_role)}>
                    {currentOrg.user_role}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInviteModal(true)}
                  >
                    Invite
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Organization List */}
          <div className="space-y-2">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => setCurrentOrg(org)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  currentOrg?.id === org.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-gray-500">
                      {org.member_count} members
                    </div>
                  </div>
                  <Badge className={getRoleBadgeColor(org.user_role)}>
                    {org.user_role}
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          {/* Create Organization Form */}
          {showCreateOrg && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">Create New Organization</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Organization name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={createOrganization}
                    disabled={!newOrgName.trim()}
                  >
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateOrg(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspace Selection */}
      {currentOrg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Workspace</span>
              <Button
                size="sm"
                onClick={() => setShowCreateWorkspace(true)}
                disabled={showCreateWorkspace}
              >
                + New Workspace
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Current Workspace Display */}
            {currentWorkspace && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{currentWorkspace.name}</h4>
                    <p className="text-sm text-gray-600">
                      {currentWorkspace.document_count} documents
                    </p>
                  </div>
                  {currentWorkspace.is_public && (
                    <Badge className="bg-blue-500">Public</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Workspace List */}
            <div className="space-y-2">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => setCurrentWorkspace(workspace)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    currentWorkspace?.id === workspace.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{workspace.name}</div>
                      <div className="text-sm text-gray-500">
                        {workspace.document_count} documents
                      </div>
                    </div>
                    {workspace.is_public && (
                      <Badge className="bg-blue-500">Public</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Create Workspace Form */}
            {showCreateWorkspace && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-3">Create New Workspace</h4>
                <div className="space-y-3">
                  <Input
                    placeholder="Workspace name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={createWorkspace}
                      disabled={!newWorkspaceName.trim()}
                    >
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateWorkspace(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">Invite Team Member</h3>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <select
                className="w-full p-2 border rounded"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-2">
                <Button
                  onClick={inviteUser}
                  disabled={!inviteEmail.trim()}
                >
                  Send Invitation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}