import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'

export default function OnboardingScreen() {
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore()
  const [type, setType] = useState<'PERSONAL' | 'BUSINESS' | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!type || !name.trim()) {
      Alert.alert('Error', 'Please select a type and enter a name')
      return
    }
    setCreating(true)
    try {
      const { data: workspace } = await api.post('/workspaces', { name, type })
      const { data: allWorkspaces } = await api.get('/workspaces')
      setWorkspaces(allWorkspaces)
      setActiveWorkspace(workspace)
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>⬡</Text>
          </View>
          <Text style={styles.logoText}>FlowLedger</Text>
        </View>

        <Text style={styles.title}>Welcome! 👋</Text>
        <Text style={styles.subtitle}>Let's set up your first workspace to get started.</Text>

        {/* Type selector */}
        <Text style={styles.sectionLabel}>What best describes you?</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeCard, type === 'PERSONAL' && styles.typeCardActiveGreen]}
            onPress={() => {
              setType('PERSONAL')
              if (!name) setName('My Personal')
            }}
          >
            <Text style={styles.typeEmoji}>👤</Text>
            <Text style={[styles.typeTitle, type === 'PERSONAL' && styles.typeTitleActiveGreen]}>Personal</Text>
            <Text style={styles.typeDesc}>Track personal finances and savings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, type === 'BUSINESS' && styles.typeCardActiveBlue]}
            onPress={() => {
              setType('BUSINESS')
              if (!name) setName('My Business')
            }}
          >
            <Text style={styles.typeEmoji}>🏢</Text>
            <Text style={[styles.typeTitle, type === 'BUSINESS' && styles.typeTitleActiveBlue]}>Business</Text>
            <Text style={styles.typeDesc}>Track revenue and business performance</Text>
          </TouchableOpacity>
        </View>

        {/* Name input */}
        {type && (
          <View style={styles.field}>
            <Text style={styles.label}>Workspace name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. My Personal Finances"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoFocus
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, (!type || !name.trim() || creating) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={!type || !name.trim() || creating}
        >
          {creating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Get started →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoBox: { width: 36, height: 36, backgroundColor: '#10b981', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  logoText: { color: 'white', fontSize: 20, fontWeight: '600' },
  title: { color: 'white', fontSize: 26, fontWeight: '600', marginBottom: 6 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32, lineHeight: 22 },
  sectionLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  typeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeCardActiveGreen: { borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.1)' },
  typeCardActiveBlue: { borderColor: 'rgba(59,130,246,0.5)', backgroundColor: 'rgba(59,130,246,0.1)' },
  typeEmoji: { fontSize: 24, marginBottom: 8 },
  typeTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  typeTitleActiveGreen: { color: '#10b981' },
  typeTitleActiveBlue: { color: '#3b82f6' },
  typeDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, lineHeight: 18 },
  field: { gap: 8, marginBottom: 24 },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: 'white',
    fontSize: 15,
  },
  button: { backgroundColor: '#10b981', borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '600' },
})