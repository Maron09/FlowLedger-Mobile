import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native'
import { useAuthStore } from '../store/auth.store'
import { useWorkspaceStore } from '../store/workspace.store'
import AddTransactionModal from '../components/AddtransactionModal'
import api from '../lib/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'


interface Overview {
  totalIncome: number
  totalExpenses: number
  balance: number
  savingsRate: number
  allTimeIncome: number
  allTimeExpenses: number
}

interface RecentExpense {
  id: string
  title: string
  amount: string
  date: string
  category?: { name: string; color: string }
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function DashboardScreen() {
  const { user } = useAuthStore()
  const { activeWorkspace } = useWorkspaceStore()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [expenses, setExpenses] = useState<RecentExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [view, setView] = useState<'month' | 'alltime'>('month')
  const insets = useSafeAreaInsets()
  const fetchData = async () => {
    if (!activeWorkspace) return
    try {
      const [overviewRes, expensesRes] = await Promise.all([
        api.get(`/w/${activeWorkspace.id}/analytics/overview`),
        api.get(`/w/${activeWorkspace.id}/expenses?limit=5`),
      ])
      setOverview(overviewRes.data)
      setExpenses(expensesRes.data.items)
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

  const displayIncome = view === 'alltime' ? (overview?.allTimeIncome ?? 0) : (overview?.totalIncome ?? 0)
  const displayExpenses = view === 'alltime' ? (overview?.allTimeExpenses ?? 0) : (overview?.totalExpenses ?? 0)

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {user?.firstName ?? 'there'} 👋
          </Text>
          <Text style={styles.workspaceName}>{activeWorkspace?.name}</Text>
        </View>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'month' && styles.toggleBtnActive]}
            onPress={() => setView('month')}
          >
            <Text style={[styles.toggleText, view === 'month' && styles.toggleTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'alltime' && styles.toggleBtnActive]}
            onPress={() => setView('alltime')}
          >
            <Text style={[styles.toggleText, view === 'alltime' && styles.toggleTextActive]}>
              All time
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>{formatNaira(overview?.balance ?? 0)}</Text>
        <Text style={[styles.balanceStatus, { color: (overview?.balance ?? 0) >= 0 ? '#10b981' : '#ef4444' }]}>
          {(overview?.balance ?? 0) >= 0 ? '● Positive' : '● Negative'}
        </Text>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryLabel}>
            {activeWorkspace?.type === 'BUSINESS' ? 'Revenue' : 'Income'}
          </Text>
          <Text style={[styles.summaryAmount, { color: '#10b981' }]}>
            {formatNaira(displayIncome)}
          </Text>
          <Text style={styles.summaryPeriod}>{view === 'alltime' ? 'All time' : 'This month'}</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>
            {formatNaira(displayExpenses)}
          </Text>
          <Text style={styles.summaryPeriod}>{view === 'alltime' ? 'All time' : 'This month'}</Text>
        </View>
      </View>

      {/* Savings rate */}
      <View style={styles.savingsCard}>
        <View style={styles.savingsRow}>
          <Text style={styles.savingsLabel}>
            {activeWorkspace?.type === 'BUSINESS' ? 'Profit margin' : 'Savings rate'}
          </Text>
          <Text style={styles.savingsValue}>{overview?.savingsRate.toFixed(1) ?? 0}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(overview?.savingsRate ?? 0, 100)}%` as any,
                backgroundColor: (overview?.savingsRate ?? 0) > 20 ? '#10b981' : '#f59e0b',
              },
            ]}
          />
        </View>
      </View>

      {/* Recent transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {expenses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: `${expense.category?.color ?? '#6366f1'}20` }]}>
                <Text style={{ color: expense.category?.color ?? '#6366f1', fontSize: 14 }}>
                  {expense.title[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{expense.title}</Text>
                <Text style={styles.txCategory}>{expense.category?.name ?? 'Uncategorized'}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>-{formatNaira(Number(expense.amount))}</Text>
                <Text style={styles.txDate}>
                  {new Date(expense.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { color: 'white', fontSize: 20, fontWeight: '600' },
  workspaceName: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: 'rgba(16,185,129,0.2)' },
  toggleText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  toggleTextActive: { color: '#10b981' },
  balanceCard: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 },
  balanceAmount: { color: 'white', fontSize: 32, fontWeight: '700', marginBottom: 6 },
  balanceStatus: { fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: {
    backgroundColor: '#0a0d12',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  summaryAmount: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  summaryPeriod: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  savingsCard: {
    backgroundColor: '#0a0d12',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  savingsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  savingsLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  savingsValue: { color: 'white', fontSize: 14, fontWeight: '600' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  section: { gap: 8 },
  sectionTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  txIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  txCategory: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
  txDate: { color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 2 },
  fab: {
  position: 'absolute',
  bottom: 24,
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