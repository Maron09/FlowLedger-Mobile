import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity,
  TextInput, Alert, Modal
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspaceStore } from '../store/workspace.store'
import { useAuthStore } from '../store/auth.store'
import api from '../lib/api'

interface Member {
  id: string
  role: string
  userId: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  VIEWER: 'Can view transactions and reports',
  EDITOR: 'Can add and edit transactions',
  ADMIN: 'Full access except delete workspace',
  OWNER: 'Full access',
}

const ROLES = ['VIEWER', 'EDITOR', 'ADMIN']

export default function TeamMembersScreen({ navigation }: any) {
  const { activeWorkspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('EDITOR')
  const [inviting, setInviting] = useState(false)

  const myRole = members.find((m) => m.userId === user?.id)?.role
  const isAdmin = myRole === 'OWNER' || myRole === 'ADMIN'
  const isOwner = myRole === 'OWNER'

  const fetchMembers = async () => {
    if (!activeWorkspace) return
    try {
      const { data } = await api.get(`/w/${activeWorkspace.id}/members`)
      setMembers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchMembers() }, [activeWorkspace])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address')
      return
    }
    setInviting(true)
    try {
      const { data } = await api.post(`/w/${activeWorkspace!.id}/members/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      Alert.alert('Success', data.message)
      setInviteEmail('')
      setShowInvite(false)
      fetchMembers()
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = (member: Member) => {
    Alert.alert('Remove member', `Remove ${member.user.firstName || member.user.email} from this workspace?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/w/${activeWorkspace!.id}/members/${member.id}`)
            fetchMembers()
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to remove member')
          }
        },
      },
    ])
  }

  const handleUpdateRole = async (memberId: string, role: string) => {
    try {
      await api.patch(`/w/${activeWorkspace!.id}/members/${memberId}/role`, { role })
      fetchMembers()
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update role')
    }
  }

  const getRoleColor = (role: string) => {
    if (role === 'OWNER') return '#10b981'
    if (role === 'ADMIN') return '#3b82f6'
    if (role === 'EDITOR') return '#8b5cf6'
    return 'rgba(255,255,255,0.3)'
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMembers() }} tintColor="#10b981" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInvite(true)}>
              <Text style={styles.inviteBtnText}>+ Invite</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title}>Team Members</Text>
        <Text style={styles.subtitle}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>

        {/* Members list */}
        <View style={styles.membersList}>
          {members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {member.user.firstName?.[0] ?? member.user.email[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.user.firstName
                    ? `${member.user.firstName} ${member.user.lastName ?? ''}`.trim()
                    : member.user.email}
                </Text>
                <Text style={styles.memberEmail} numberOfLines={1}>{member.user.email}</Text>
              </View>
              <View style={styles.memberRight}>
                <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(member.role)}20` }]}>
                  <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                    {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                  </Text>
                </View>
                {isAdmin && member.role !== 'OWNER' && member.userId !== user?.id && (
                  <TouchableOpacity
                    onPress={() => handleRemove(member)}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Role descriptions */}
        <Text style={styles.sectionLabel}>Role permissions</Text>
        <View style={styles.rolesCard}>
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc], i) => (
            <View key={role}>
              <View style={styles.roleRow}>
                <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(role) }]} />
                <View style={styles.roleDetails}>
                  <Text style={styles.roleName}>{role.charAt(0) + role.slice(1).toLowerCase()}</Text>
                  <Text style={styles.roleDesc}>{desc}</Text>
                </View>
              </View>
              {i < Object.entries(ROLE_DESCRIPTIONS).length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInvite} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowInvite(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInvite(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invite Member</Text>
            <TouchableOpacity onPress={handleInvite} disabled={inviting}>
              {inviting
                ? <ActivityIndicator color="#10b981" size="small" />
                : <Text style={styles.modalSave}>Send</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="colleague@example.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleSelector}>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleSelectorChip, inviteRole === role && { borderColor: getRoleColor(role), backgroundColor: `${getRoleColor(role)}15` }]}
                    onPress={() => setInviteRole(role)}
                  >
                    <Text style={[styles.roleSelectorText, inviteRole === role && { color: getRoleColor(role) }]}>
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </Text>
                    <Text style={styles.roleSelectorDesc}>{ROLE_DESCRIPTIONS[role]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backText: { color: '#10b981', fontSize: 16 },
  inviteBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  inviteBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  title: { color: 'white', fontSize: 22, fontWeight: '600', marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginBottom: 24 },
  membersList: { gap: 10, marginBottom: 28 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0a0d12',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberAvatarText: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  memberEmail: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  memberRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 12, fontWeight: '500' },
  removeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: 'rgba(239,68,68,0.6)', fontSize: 14 },
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  rolesCard: {
    backgroundColor: '#0a0d12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  roleIndicator: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  roleDetails: { flex: 1 },
  roleName: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  roleDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 14 },
  modalContainer: { flex: 1, backgroundColor: '#0f1117' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalCancel: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  modalTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalSave: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  modalContent: { padding: 20, gap: 24 },
  field: { gap: 8 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: 'white',
    fontSize: 15,
  },
  roleSelector: { gap: 10 },
  roleSelectorChip: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  roleSelectorText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  roleSelectorDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
})