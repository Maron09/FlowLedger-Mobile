import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  TextInput, Alert
} from 'react-native'
import { useWorkspaceStore } from '../store/workspace.store'
import AddTransactionModal from '../components/AddTransactionModal'
import api from '../lib/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Transaction {
  id: string
  title: string
  amount: string
  date: string
  paymentMethod?: string
  source?: string
  category?: { name: string; color: string }
  type: 'expense' | 'income'
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function TransactionsScreen() {
  const { activeWorkspace } = useWorkspaceStore()
  const [expenses, setExpenses] = useState<Transaction[]>([])
  const [income, setIncome] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'expenses' | 'income'>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const insets = useSafeAreaInsets()
  const fetchData = async () => {
    if (!activeWorkspace) return
    try {
      const [expRes, incRes] = await Promise.all([
        api.get(`/w/${activeWorkspace.id}/expenses?limit=50`),
        api.get(`/w/${activeWorkspace.id}/income?limit=50`),
      ])
      setExpenses(expRes.data.items.map((e: any) => ({ ...e, type: 'expense' })))
      setIncome(incRes.data.items.map((i: any) => ({ ...i, type: 'income' })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchData() }, [activeWorkspace])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleDelete = (id: string, type: 'expense' | 'income') => {
    Alert.alert('Delete transaction', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const endpoint = type === 'expense'
              ? `/w/${activeWorkspace!.id}/expenses/${id}`
              : `/w/${activeWorkspace!.id}/income/${id}`
            await api.delete(endpoint)
            fetchData()
          } catch {
            Alert.alert('Error', 'Failed to delete transaction')
          }
        },
      },
    ])
  }

  const all = [...expenses, ...income].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const filtered = (activeTab === 'all' ? all : activeTab === 'expenses' ? expenses : income)
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>{filtered.length} records</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search transactions..."
          placeholderTextColor="rgba(255,255,255,0.2)"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['all', 'expenses', 'income'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.txRow}
            onLongPress={() => handleDelete(item.id, item.type)}
            activeOpacity={0.7}
          >
            <View style={[styles.txIcon, { backgroundColor: `${item.category?.color ?? '#6366f1'}20` }]}>
              <Text style={{ color: item.category?.color ?? '#6366f1', fontSize: 14 }}>
                {item.title[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txTitle}>{item.title}</Text>
              <Text style={styles.txCategory}>{item.category?.name ?? 'Uncategorized'}</Text>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: item.type === 'income' ? '#10b981' : '#ef4444' }]}>
                {item.type === 'income' ? '+' : '-'}{formatNaira(Number(item.amount))}
              </Text>
              <Text style={styles.txDate}>
                {new Date(item.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
      {/* Floating button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddTransactionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchData}
      />

      {/* Hint */}
      <Text style={styles.hint}>Long press to delete a transaction</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, paddingBottom: 12 },
  title: { color: 'white', fontSize: 22, fontWeight: '600' },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 },
  searchRow: { paddingHorizontal: 20, marginBottom: 12 },
  search: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    color: 'white',
    fontSize: 14,
  },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  tabTextActive: { color: '#10b981' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  txIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  txCategory: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '500' },
  txDate: { color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 2 },
  hint: { color: 'rgba(255,255,255,0.1)', fontSize: 11, textAlign: 'center', paddingBottom: 12 },
  fab: {
  position: 'absolute',
  bottom: 60,
  right: 24,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '#10b981',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#10b981',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
},
fabText: { color: 'white', fontSize: 28, fontWeight: '300', marginTop: -2 },
})