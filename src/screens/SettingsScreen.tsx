import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator
} from 'react-native'
import { useAuthStore } from '../store/auth.store'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'


export default function SettingsScreen() {
  const { user, setAuth, logout } = useAuthStore()
  const { activeWorkspace, workspaces, reset } = useWorkspaceStore()
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | null>(null)
  const insets = useSafeAreaInsets()

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await api.post('/auth/logout').catch(() => {})
          await logout()
          reset()
        },
      },
    ])
  }

  const handleUpdateProfile = async () => {
    setSaving(true)
    setSuccess('')
    try {
      const { data } = await api.patch('/users/me', profileForm)
      const token = (await import('@react-native-async-storage/async-storage')).default
      const refreshToken = await token.getItem('refreshToken')
      const accessToken = await token.getItem('accessToken')
      setAuth(data, accessToken!, refreshToken!)
      setSuccess('Profile updated successfully')
      setActiveSection(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }
    setSaving(true)
    try {
      await api.patch('/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSuccess('Password updated successfully')
      setActiveSection(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[ styles.content, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0] ?? user?.email?.[0]?.toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.userName}>
            {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.email}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {success !== '' && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}

      {/* Profile section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}
        >
          <Text style={styles.sectionTitle}>Update profile</Text>
          <Text style={styles.chevron}>{activeSection === 'profile' ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {activeSection === 'profile' && (
          <View style={styles.sectionBody}>
            <View style={styles.field}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={profileForm.firstName}
                onChangeText={(v) => setProfileForm({ ...profileForm, firstName: v })}
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={profileForm.lastName}
                onChangeText={(v) => setProfileForm({ ...profileForm, lastName: v })}
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleUpdateProfile}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.buttonText}>Save changes</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Password section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'password' ? null : 'password')}
        >
          <Text style={styles.sectionTitle}>Change password</Text>
          <Text style={styles.chevron}>{activeSection === 'password' ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {activeSection === 'password' && (
          <View style={styles.sectionBody}>
            <View style={styles.field}>
              <Text style={styles.label}>Current password</Text>
              <TextInput
                style={styles.input}
                value={passwordForm.currentPassword}
                onChangeText={(v) => setPasswordForm({ ...passwordForm, currentPassword: v })}
                secureTextEntry
                placeholderTextColor="rgba(255,255,255,0.2)"
                placeholder="••••••••"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                value={passwordForm.newPassword}
                onChangeText={(v) => setPasswordForm({ ...passwordForm, newPassword: v })}
                secureTextEntry
                placeholderTextColor="rgba(255,255,255,0.2)"
                placeholder="••••••••"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                style={styles.input}
                value={passwordForm.confirmPassword}
                onChangeText={(v) => setPasswordForm({ ...passwordForm, confirmPassword: v })}
                secureTextEntry
                placeholderTextColor="rgba(255,255,255,0.2)"
                placeholder="••••••••"
              />
            </View>
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleUpdatePassword}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.buttonText}>Update password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Workspace info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active workspace</Text>
        </View>
        <View style={styles.sectionBody}>
          <View style={styles.wsRow}>
            <View style={[styles.wsIcon, { backgroundColor: activeWorkspace?.type === 'BUSINESS' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)' }]}>
              <Text style={{ color: activeWorkspace?.type === 'BUSINESS' ? '#3b82f6' : '#10b981', fontWeight: '600' }}>
                {activeWorkspace?.name[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.wsName}>{activeWorkspace?.name}</Text>
              <Text style={styles.wsType}>{activeWorkspace?.type?.toLowerCase()}</Text>
            </View>
          </View>
          <Text style={styles.wsHint}>{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} total</Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>FlowLedger Mobile v1.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { color: 'white', fontSize: 22, fontWeight: '600' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#0a0d12',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#10b981', fontSize: 18, fontWeight: '600' },
  userName: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500' },
  userEmail: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 },
  successBanner: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successText: { color: '#10b981', fontSize: 14 },
  section: {
    backgroundColor: '#0a0d12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  chevron: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  sectionBody: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  field: { gap: 6 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 13,
    color: 'white',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  wsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  wsIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  wsName: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  wsType: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textTransform: 'capitalize', marginTop: 2 },
  wsHint: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  logoutButton: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  version: { color: 'rgba(255,255,255,0.1)', fontSize: 12, textAlign: 'center' },
})