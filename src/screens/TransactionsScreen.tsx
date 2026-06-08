import {  useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'

interface Transaction {
  id: string
  title: string
  amount: string
  date: string
  paymentMethod?: string
  source?: string
  category?: { name: string; color: string; icon: string }
  type: 'expense' | 'income'
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

function groupByDate(transactions: Transaction[]) {
  const groups: { date: string; items: Transaction[] }[] = []
  const map: Record<string, Transaction[]> = {}

  for (const tx of transactions) {
    const date = new Date(tx.date).toLocaleDateString('en-NG', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
    if (!map[date]) {
      map[date] = []
      groups.push({ date, items: map[date] })
    }
    map[date].push(tx)
  }
  return groups
}

const TABS = ['All', 'Expenses', 'Income'] as const

export default function TransactionsScreen() {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [expenses, setExpenses] = useState<Transaction[]>([])
  const [income, setIncome] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('All')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    if (!activeWorkspace) return
    try {
      const [expRes, incRes] = await Promise.all([
        api.get(`/w/${activeWorkspace.id}/expenses?limit=100`),
        api.get(`/w/${activeWorkspace.id}/income?limit=100`),
      ])
      setExpenses(expRes.data.items.map((e: any) => ({ ...e, type: 'expense' })))
      setIncome(incRes.data.items.map((i: any) => ({ ...i, type: 'income' })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeWorkspace])

  useFocusEffect(
  useCallback(() => {
    fetchData()
  }, [activeWorkspace])
)

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

  const filtered = (
    activeTab === 'All' ? all :
    activeTab === 'Expenses' ? expenses : income
  ).filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))

  const grouped = groupByDate(filtered)

  const totalFiltered = filtered.reduce((sum, t) => {
    return t.type === 'income' ? sum + Number(t.amount) : sum - Number(t.amount)
  }, 0)

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={[styles.totalAmount, { color: totalFiltered >= 0 ? '#10b981' : '#ef4444' }]}>
          {totalFiltered >= 0 ? '+' : ''}{formatNaira(totalFiltered)}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions..."
            placeholderTextColor="rgba(255,255,255,0.2)"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.date}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor="#10b981" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        renderItem={({ item: group }) => (
          <View style={styles.group}>
            <Text style={styles.groupDate}>{group.date}</Text>
            {group.items.map((tx) => (
              <TouchableOpacity
                key={`${tx.type}-${tx.id}`}
                style={styles.txRow}
                onLongPress={() => handleDelete(tx.id, tx.type)}
                activeOpacity={0.6}
              >
                <View style={[styles.txBorder, { backgroundColor: tx.category?.color ?? '#6366f1' }]} />
                <View style={[styles.txIcon, { backgroundColor: `${tx.category?.color ?? '#6366f1'}18` }]}>
                  <Text style={{ fontSize: 16 }}>
                    {tx.category?.icon && tx.category.icon.length <= 2
                      ? tx.category.icon
                      : tx.type === 'income' ? '💰' : '💸'}
                  </Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle} numberOfLines={1}>{tx.title}</Text>
                  <Text style={styles.txMeta}>
                    {tx.category?.name ?? 'Uncategorized'}
                    {tx.paymentMethod ? ` · ${tx.paymentMethod.replace(/_/g, ' ')}` : ''}
                    {tx.source ? ` · ${tx.source}` : ''}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'income' ? '#10b981' : '#ef4444' }]}>
                  {tx.type === 'income' ? '+' : '-'}{formatNaira(Number(tx.amount))}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      <Text style={styles.hint}>Long press to delete</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { color: 'white', fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  totalAmount: { fontSize: 15, fontWeight: '600' },

  searchRow: { paddingHorizontal: 20, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 12, color: 'white', fontSize: 14 },
  searchClear: { color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: 4 },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 4,
  },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, position: 'relative' },
  tabActive: { backgroundColor: 'rgba(16,185,129,0.1)' },
  tabText: { color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: '#10b981' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#10b981',
    borderRadius: 1,
  },

  list: { paddingHorizontal: 20, paddingBottom: 20 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14 },

  group: { marginBottom: 20 },
  groupDate: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  txBorder: { width: 3, height: 36, borderRadius: 2, flexShrink: 0 },
  txIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txInfo: { flex: 1, minWidth: 0 },
  txTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  txMeta: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600', flexShrink: 0 },

  hint: { color: 'rgba(255,255,255,0.1)', fontSize: 11, textAlign: 'center', paddingBottom: 12 },
})