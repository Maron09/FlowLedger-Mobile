import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'

interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: string
}

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddBudgetModal({ visible, onClose, onSuccess }: Props) {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible && activeWorkspace) {
      api.get(`/w/${activeWorkspace.id}/categories`)
        .then(({ data }) => {
          const expenseCategories = data.filter((c: Category) =>
            c.type === 'EXPENSE' || c.type === 'BOTH'
          )
          setCategories(expenseCategories)
        })
        .catch(console.error)
    }
  }, [visible, activeWorkspace])

  const handleSubmit = async () => {
    if (!categoryId || !amount) {
      Alert.alert('Error', 'Please select a category and enter an amount')
      return
    }
    setSaving(true)
    try {
      await api.post(`/w/${activeWorkspace!.id}/budgets`, {
        categoryId,
        amount: Number(amount),
      })
      setCategoryId('')
      setAmount('')
      onSuccess()
      onClose()
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create budget')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Budget</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#10b981" size="small" />
              : <Text style={styles.save}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Monthly limit (₦)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 50000"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
              autoFocus
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            {categories.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No expense categories found</Text>
                <Text style={styles.emptyHint}>Create categories first</Text>
              </View>
            ) : (
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      categoryId === cat.id && {
                        borderColor: cat.color,
                        backgroundColor: `${cat.color}15`,
                      }
                    ]}
                    onPress={() => setCategoryId(cat.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.catIcon}>{cat.icon && cat.icon.length <= 2 ? cat.icon : '📦'}</Text>
                    <Text style={[
                      styles.catName,
                      categoryId === cat.id && { color: cat.color }
                    ]}>
                      {cat.name}
                    </Text>
                    {categoryId === cat.id && (
                      <Text style={[styles.catCheck, { color: cat.color }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Preview */}
          {categoryId && amount ? (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Budget preview</Text>
              <Text style={styles.previewText}>
                {categories.find(c => c.id === categoryId)?.name} —{' '}
                <Text style={styles.previewAmount}>
                  ₦{Number(amount).toLocaleString()} / month
                </Text>
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  cancel: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  title: { color: 'white', fontSize: 16, fontWeight: '600' },
  save: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  content: { padding: 20, gap: 24, paddingBottom: 60 },
  field: { gap: 10 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  empty: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  emptyHint: { color: 'rgba(255,255,255,0.15)', fontSize: 12, marginTop: 4 },
  categoryGrid: { gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catIcon: { fontSize: 16 },
  catName: { color: 'rgba(255,255,255,0.6)', fontSize: 14, flex: 1 },
  catCheck: { fontSize: 14, fontWeight: '600' },
  preview: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  previewLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  previewText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  previewAmount: { color: '#10b981', fontWeight: '600' },
})