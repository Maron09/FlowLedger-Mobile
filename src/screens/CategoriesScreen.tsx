import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert
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

const PRESET_COLORS = [
  '#10b981', '#f97316', '#3b82f6', '#8b5cf6',
  '#ec4899', '#eab308', '#14b8a6', '#ef4444',
  '#a855f7', '#06b6d4', '#84cc16', '#f59e0b',
]

const PRESET_ICONS = [
  '🛒', '🍔', '🚗', '🏠', '💊', '📚', '✈️', '🎮',
  '👗', '💇', '🏋️', '🎬', '💡', '📱', '🐾', '🎁',
  '💰', '💼', '📈', '🏦', '💳', '🤝', '🎓', '🌍',
  '⛽', '🔧', '🛁', '🍕', '☕', '🎵', '🌿', '💅',
]

export default function CategoriesScreen({ navigation }: any) {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', color: '#10b981', icon: '🛒', type: 'EXPENSE' })
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    if (!activeWorkspace) return
    try {
      const { data } = await api.get(`/w/${activeWorkspace.id}/categories`)
      setCategories(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchCategories() }, [activeWorkspace])

  const openCreate = () => {
    setEditCat(null)
    setForm({ name: '', color: '#10b981', icon: '🛒', type: 'EXPENSE' })
    setShowForm(true)
  }

  const openEdit = (cat: Category) => {
    setEditCat(cat)
    setForm({ name: cat.name, color: cat.color, icon: cat.icon ?? '🛒', type: cat.type })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter a category name')
      return
    }
    setSaving(true)
    try {
      if (editCat) {
        await api.patch(`/w/${activeWorkspace!.id}/categories/${editCat.id}`, form)
      } else {
        await api.post(`/w/${activeWorkspace!.id}/categories`, form)
      }
      setShowForm(false)
      fetchCategories()
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (cat: Category) => {
    Alert.alert('Delete category', `Delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/w/${activeWorkspace!.id}/categories/${cat.id}`)
            fetchCategories()
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Cannot delete category')
          }
        },
      },
    ])
  }

  const grouped = {
    EXPENSE: categories.filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH'),
    INCOME: categories.filter((c) => c.type === 'INCOME' || c.type === 'BOTH'),
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCategories() }} tintColor="#10b981" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>{categories.length} categories</Text>

        {/* Expense categories */}
        {grouped.EXPENSE.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Expense</Text>
            <View style={styles.grid}>
              {grouped.EXPENSE.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catCard}
                  onPress={() => openEdit(cat)}
                  onLongPress={() => handleDelete(cat)}
                >
                  <View style={[styles.catIcon, { backgroundColor: `${cat.color}20` }]}>
                    <Text style={{ fontSize: 20 }}>{cat.icon ?? cat.name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                  <Text style={styles.catType}>{cat.type.toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Income categories */}
        {grouped.INCOME.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Income</Text>
            <View style={styles.grid}>
              {grouped.INCOME.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catCard}
                  onPress={() => openEdit(cat)}
                  onLongPress={() => handleDelete(cat)}
                >
                  <View style={[styles.catIcon, { backgroundColor: `${cat.color}20` }]}>
                    <Text style={{ fontSize: 20 }}>{cat.icon ?? cat.name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                  <Text style={styles.catType}>{cat.type.toLowerCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {categories.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No categories yet</Text>
            <TouchableOpacity onPress={openCreate}>
              <Text style={styles.emptyLink}>Create your first category</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.hint}>Tap to edit · Long press to delete</Text>
      </ScrollView>

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editCat ? 'Edit Category' : 'New Category'}</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#10b981" size="small" /> : <Text style={styles.modalSave}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

            {/* Preview */}
            <View style={styles.previewRow}>
              <View style={[styles.previewIcon, { backgroundColor: `${form.color}20` }]}>
                <Text style={{ fontSize: 28 }}>{form.icon}</Text>
              </View>
              <View>
                <Text style={styles.previewName}>{form.name || 'Category name'}</Text>
                <Text style={styles.previewType}>{form.type.toLowerCase()}</Text>
              </View>
            </View>

            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="e.g. Food & Dining"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoFocus
              />
            </View>

            {/* Type */}
            <View style={styles.field}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {['EXPENSE', 'INCOME', 'BOTH'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                    onPress={() => setForm({ ...form, type: t })}
                  >
                    <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Icon picker */}
            <View style={styles.field}>
              <Text style={styles.label}>Icon</Text>
              <View style={styles.iconGrid}>
                {PRESET_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconChip,
                      form.icon === icon && { borderColor: form.color, backgroundColor: `${form.color}20` }
                    ]}
                    onPress={() => setForm({ ...form, icon })}
                  >
                    <Text style={{ fontSize: 22 }}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color picker */}
            <View style={styles.field}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      form.color === color && styles.colorDotSelected,
                    ]}
                    onPress={() => setForm({ ...form, color })}
                  />
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
  backBtn: { paddingVertical: 4 },
  backText: { color: '#10b981', fontSize: 16 },
  addBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  title: { color: 'white', fontSize: 22, fontWeight: '600', marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    width: '30%',
    backgroundColor: '#0a0d12',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  catIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catName: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center' },
  catType: { color: 'rgba(255,255,255,0.2)', fontSize: 10, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 15 },
  emptyLink: { color: '#10b981', fontSize: 14, marginTop: 8 },
  hint: { color: 'rgba(255,255,255,0.1)', fontSize: 11, textAlign: 'center', marginTop: 16 },
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
  modalContent: { padding: 20, gap: 20, paddingBottom: 60 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 16,
  },
  previewIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewName: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500' },
  previewType: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
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
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeChipActive: { borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.1)' },
  typeChipText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  typeChipTextActive: { color: '#10b981' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotSelected: { borderWidth: 3, borderColor: 'white' },
})