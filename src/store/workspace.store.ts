import { create } from 'zustand'

interface Workspace {
  id: string
  name: string
  type: 'PERSONAL' | 'BUSINESS'
  currency: string
  ownerId: string
  members: { role: string; userId: string }[]
}

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  workspacesLoaded: boolean
  setWorkspaces: (workspaces: Workspace[]) => void
  setActiveWorkspace: (workspace: Workspace) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspace: null,
  workspacesLoaded: false,

  setWorkspaces: (workspaces) => set({ workspaces, workspacesLoaded: true }),

  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

  reset: () => set({ workspaces: [], activeWorkspace: null, workspacesLoaded: false }),
}))