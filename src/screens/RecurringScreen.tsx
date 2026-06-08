import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'
import AddTransactionModal from '../components/AddtransactionModal'

interface Transaction {
  id: string
  title: string
  amount: string
  date: string
  paymentMethod?: string
  source?: string
  categoryId?: string
  category?: { id: string; name: string; color: string; icon: string }
  type: 'expense' | 'income'
  isRecurring: boolean
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function RecurringScreen({ navigation }: any) {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [expenses, setExpenses] = useState<Transaction[]>([])
  const [income, setIncome] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [logAgain, setLogAgain] = useState<any>(null)

  const fetchData = async () => {
    if (!activeWorkspace) return
    try {
      const [expRes, incRes] = await Promise.all([
        api.get(`/w/${activeWorkspace.id}/expenses?isRecurring=true&limit=100`),
        api.get(`/w/${activeWorkspace.id}/income?isRecurring=true&limit=100`),
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

  const all = [...expenses, ...income].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const handleLogAgain = (tx: Transaction) => {
    setLogAgain({
      title: tx.title,
      amount: tx.amount,
      date: new Date().toISOString(),
      categoryId: tx.categoryId,
      category: tx.category,
      paymentMethod: tx.paymentMethod,
      source: tx.source,
      type: tx.type,
      isRecurring: false,
    })
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
      <FlatList
        data={all}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor="#10b981" />}
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Recurring</Text>
            <Text style={styles.subtitle}>
              {all.length} recurring transaction{all.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No recurring transactions</Text>
            <Text style={styles.emptyHint}>Mark a transaction as recurring when adding it</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={[styles.txIcon, { backgroundColor: `${item.category?.color ?? '#6366f1'}20` }]}>
              <Text style={{ fontSize: 18 }}>
                {item.category?.icon && item.category.icon.length <= 2
                  ? item.category.icon
                  : item.title[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.txInfo}>
              <View style={styles.txTitleRow}>
                <Text style={styles.txTitle}>{item.title}</Text>
                <View style={styles.recurringBadge}>
                  <Text style={styles.recurringBadgeText}>recurring</Text>
                </View>
              </View>
              <Text style={styles.txCategory}>{item.category?.name ?? 'Uncategorized'}</Text>
              <Text style={styles.txDate}>
                Last: {new Date(item.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: item.type === 'income' ? '#10b981' : '#ef4444' }]}>
                {item.type === 'income' ? '+' : '-'}{formatNaira(Number(item.amount))}
              </Text>
              <TouchableOpacity
                style={styles.logBtn}
                onPress={() => handleLogAgain(item)}
              >
                <Text style={styles.logBtnText}>Log again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {logAgain && (
        <AddTransactionModal
          visible={!!logAgain}
          onClose={() => setLogAgain(null)}
          onSuccess={() => {
            setLogAgain(null)
            Alert.alert('Success', 'Transaction logged successfully')
            fetchData()
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backText: { color: '#10b981', fontSize: 16, marginBottom: 12 },
  title: { color: 'white', fontSize: 22, fontWeight: '600', marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 15 },
  emptyHint: { color: 'rgba(255,255,255,0.1)', fontSize: 13, marginTop: 6 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0a0d12',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
  },
  txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txInfo: { flex: 1, minWidth: 0 },
  txTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  txTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  recurringBadge: { backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recurringBadgeText: { color: '#10b981', fontSize: 10 },
  txCategory: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  txDate: { color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  txAmount: { fontSize: 13, fontWeight: '600' },
  logBtn: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  logBtnText: { color: '#10b981', fontSize: 11, fontWeight: '500' },
})