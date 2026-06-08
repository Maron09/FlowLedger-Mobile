import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Category {
  id: string
  name: string
  color: string
  type: string
}

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'CARD', 'MOBILE_MONEY']

export default function AddTransactionModal({ visible, onClose, onSuccess }: Props) {
  const { activeWorkspace } = useWorkspaceStore()
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    title: '',
    amount: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    source: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (visible && activeWorkspace) {
      api.get(`/w/${activeWorkspace.id}/categories`)
        .then(({ data }) => setCategories(data))
        .catch(console.error)
    }
  }, [visible, activeWorkspace])

  const filteredCategories = categories.filter(
    (c) => c.type === type.toUpperCase() || c.type === 'BOTH'
  )

  const handleSubmit = async () => {
    if (!form.title || !form.amount || !form.categoryId) {
      Alert.alert('Error', 'Please fill in title, amount and category')
      return
    }
    setSaving(true)
    try {
      const endpoint = type === 'expense'
        ? `/w/${activeWorkspace!.id}/expenses`
        : `/w/${activeWorkspace!.id}/income`

      const payload = type === 'expense'
        ? {
            title: form.title,
            amount: Number(form.amount),
            categoryId: form.categoryId,
            date: form.date,
            paymentMethod: form.paymentMethod,
            notes: form.notes,
          }
        : {
            title: form.title,
            amount: Number(form.amount),
            categoryId: form.categoryId,
            date: form.date,
            source: form.source,
          }

      await api.post(endpoint, payload)
      setForm({
        title: '',
        amount: '',
        categoryId: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
        source: '',
        notes: '',
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[ styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Transaction</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#10b981" size="small" />
            ) : (
              <Text style={styles.save}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Type toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
              onPress={() => { setType('expense'); setForm({ ...form, categoryId: '' }) }}
            >
              <Text style={[styles.typeText, type === 'expense' && styles.typeTextExpense]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
              onPress={() => { setType('income'); setForm({ ...form, categoryId: '' }) }}
            >
              <Text style={[styles.typeText, type === 'income' && styles.typeTextIncome]}>Income</Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm({ ...form, title: v })}
              placeholder="e.g. Netflix subscription"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Amount (₦)</Text>
            <TextInput
              style={styles.input}
              value={form.amount}
              onChangeText={(v) => setForm({ ...form, amount: v })}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {filteredCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setForm({ ...form, categoryId: cat.id })}
                  style={[
                    styles.catChip,
                    form.categoryId === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}20` }
                  ]}
                >
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catName, form.categoryId === cat.id && { color: cat.color }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={(v) => setForm({ ...form, date: v })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>

          {/* Payment method (expense only) */}
          {type === 'expense' && (
            <View style={styles.field}>
              <Text style={styles.label}>Payment method</Text>
              <View style={styles.pmRow}>
                {PAYMENT_METHODS.map((pm) => (
                  <TouchableOpacity
                    key={pm}
                    onPress={() => setForm({ ...form, paymentMethod: pm })}
                    style={[styles.pmChip, form.paymentMethod === pm && styles.pmChipActive]}
                  >
                    <Text style={[styles.pmText, form.paymentMethod === pm && styles.pmTextActive]}>
                      {pm.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Source (income only) */}
          {type === 'income' && (
            <View style={styles.field}>
              <Text style={styles.label}>Source</Text>
              <TextInput
                style={styles.input}
                value={form.source}
                onChangeText={(v) => setForm({ ...form, source: v })}
                placeholder="e.g. Salary, Freelance"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>
          )}

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
              placeholder="Any additional notes..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
            />
          </View>
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
  headerTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  save: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  content: { padding: 20, gap: 16, paddingBottom: 60 },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 4,
  },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  typeBtnExpense: { backgroundColor: 'rgba(239,68,68,0.2)' },
  typeBtnIncome: { backgroundColor: 'rgba(16,185,129,0.2)' },
  typeText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '500' },
  typeTextExpense: { color: '#ef4444' },
  typeTextIncome: { color: '#10b981' },
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
  catScroll: { flexGrow: 0 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  pmRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pmChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pmChipActive: { borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.1)' },
  pmText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  pmTextActive: { color: '#10b981' },
})