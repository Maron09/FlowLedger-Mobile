import {  useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, FlatList
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../store/auth.store'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'

interface Overview {
  totalIncome: number
  totalExpenses: number
  balance: number
  savingsRate: number
  allTimeIncome: number
  allTimeExpenses: number
}

interface BudgetStatus {
  budget: {
    id: string
    amount: string
    category: { id: string; name: string; color: string }
  }
  spent: number
  remaining: number
  percentage: number
  status: 'ok' | 'warning' | 'over'
}

interface RecentExpense {
  id: string
  title: string
  amount: string
  date: string
  category?: { name: string; color: string; icon: string }
  type?: string
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function statusColor(status: string) {
  if (status === 'over') return '#ef4444'
  if (status === 'warning') return '#f59e0b'
  return '#10b981'
}

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuthStore()
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [budgets, setBudgets] = useState<BudgetStatus[]>([])
  const [transactions, setTransactions] = useState<RecentExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false)

  const isBusiness = activeWorkspace?.type === 'BUSINESS'

  const fetchData = useCallback(async () => {
    if (!activeWorkspace) return
    try {
      const [overviewRes, budgetsRes, expensesRes, incomeRes] = await Promise.all([
        api.get(`/w/${activeWorkspace.id}/analytics/overview`),
        api.get(`/w/${activeWorkspace.id}/analytics/budgets`),
        api.get(`/w/${activeWorkspace.id}/expenses?limit=5`),
        api.get(`/w/${activeWorkspace.id}/income?limit=5`),
      ])
      setOverview(overviewRes.data)
      const sorted = [...budgetsRes.data].sort((a: BudgetStatus, b: BudgetStatus) => b.percentage - a.percentage)
      setBudgets(sorted.slice(0, 3))
      const expenses = expensesRes.data.items.map((e: any) => ({ ...e, type: 'expense' }))
      const income = incomeRes.data.items.map((i: any) => ({ ...i, type: 'income' }))
      const all = [...expenses, ...income]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6)
      setTransactions(all)
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

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleSwitchWorkspace = async (ws: any) => {
    try {
      await api.post(`/workspaces/${ws.id}/switch`)
      setActiveWorkspace(ws)
      setShowWorkspacePicker(false)
    } catch (err) {
      console.error(err)
    }
  }

  const net = (overview?.totalIncome ?? 0) - (overview?.totalExpenses ?? 0)
  const balanceChange = overview?.totalIncome
    ? ((overview.totalIncome - overview.totalExpenses) / overview.totalIncome * 100)
    : 0

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.firstName ?? user?.email?.split('@')[0]}</Text>
          </View>
          <TouchableOpacity
            style={styles.workspaceBtn}
            onPress={() => setShowWorkspacePicker(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.workspaceDot, { backgroundColor: isBusiness ? '#3b82f6' : '#10b981' }]} />
            <Text style={styles.workspaceBtnText} numberOfLines={1}>
              {activeWorkspace?.name}
            </Text>
            <Text style={styles.workspaceChevron}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>
              {isBusiness ? 'Net Balance' : 'Available Balance'}
            </Text>
            <TouchableOpacity
              onPress={() => setBalanceHidden(!balanceHidden)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={balanceHidden ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="rgba(255,255,255,0.4)"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceAmount}>
            {balanceHidden ? '₦ ••••••' : formatNaira(overview?.balance ?? 0)}
          </Text>

          {!balanceHidden && (
            <Text style={[styles.balanceChange, { color: balanceChange >= 0 ? '#10b981' : '#ef4444' }]}>
              {balanceChange >= 0 ? '↑' : '↓'} {Math.abs(balanceChange).toFixed(1)}% this month
            </Text>
          )}

          {!balanceHidden && (
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <View style={styles.balanceStatDot}>
                  <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.balanceStatLabel}>
                    {isBusiness ? 'Revenue' : 'Income'}
                  </Text>
                </View>
                <Text style={styles.balanceStatValue}>
                  {formatNaira(overview?.totalIncome ?? 0)}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <View style={styles.balanceStatDot}>
                  <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.balanceStatLabel}>Expenses</Text>
                </View>
                <Text style={styles.balanceStatValue}>
                  {formatNaira(overview?.totalExpenses ?? 0)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.7}
          >
            <Ionicons name="bar-chart-outline" size={16} color="#10b981" />
            <Text style={[styles.quickActionText, { color: '#10b981' }]}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Budgets')}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet-outline" size={16} color="#3b82f6" />
            <Text style={[styles.quickActionText, { color: '#3b82f6' }]}>Budgets</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Recurring')}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color="#8b5cf6" />
            <Text style={[styles.quickActionText, { color: '#8b5cf6' }]}>Recurring</Text>
          </TouchableOpacity>
        </View>

        {/* This month summary */}
        {!balanceHidden && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>This month</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>
                  {isBusiness ? 'Revenue' : 'Income'}
                </Text>
                <Text style={[styles.summaryStatValue, { color: '#10b981' }]}>
                  {formatNaira(overview?.totalIncome ?? 0)}
                </Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Expenses</Text>
                <Text style={[styles.summaryStatValue, { color: '#ef4444' }]}>
                  {formatNaira(overview?.totalExpenses ?? 0)}
                </Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Net</Text>
                <Text style={[styles.summaryStatValue, { color: net >= 0 ? '#10b981' : '#ef4444' }]}>
                  {formatNaira(net)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Budget health */}
        {budgets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Budget health</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.budgetsList}>
              {budgets.map((bs) => (
                <View key={bs.budget.id} style={styles.budgetRow}>
                  <View style={styles.budgetLeft}>
                    <View style={[styles.budgetDot, { backgroundColor: bs.budget.category.color }]} />
                    <Text style={styles.budgetName}>{bs.budget.category.name}</Text>
                  </View>
                  <View style={styles.budgetRight}>
                    <Text style={[styles.budgetPct, { color: statusColor(bs.status) }]}>
                      {bs.percentage.toFixed(0)}%
                    </Text>
                    <View style={styles.budgetTrack}>
                      <View style={[
                        styles.budgetFill,
                        {
                          width: `${Math.min(bs.percentage, 100)}%` as any,
                          backgroundColor: statusColor(bs.status),
                        }
                      ]} />
                    </View>
                    <Text style={styles.budgetRemaining}>
                      {bs.status === 'over'
                        ? `${formatNaira(Math.abs(bs.remaining))} over`
                        : `${formatNaira(bs.remaining)} left`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.sectionLink}>See all</Text>
            </TouchableOpacity>
          </View>
          {transactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Text style={styles.emptyTxText}>No transactions yet</Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {transactions.map((tx) => (
                <View key={`${tx.type}-${tx.id}`} style={styles.txRow}>
                  <View style={[styles.txLeft, { borderLeftColor: tx.category?.color ?? '#6366f1' }]}>
                    <View style={[styles.txIcon, { backgroundColor: `${tx.category?.color ?? '#6366f1'}18` }]}>
                      <Text style={{ fontSize: 16 }}>
                        {tx.category?.icon && tx.category.icon.length <= 2
                          ? tx.category.icon
                          : (tx.type === 'income' ? '💰' : '💸')}
                      </Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>{tx.title}</Text>
                      <Text style={styles.txCategory}>{tx.category?.name ?? 'Uncategorized'}</Text>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: tx.type === 'income' ? '#10b981' : '#ef4444' }]}>
                      {tx.type === 'income' ? '+' : '-'}{formatNaira(Number(tx.amount))}
                    </Text>
                    <Text style={styles.txDate}>
                      {new Date(tx.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Workspace picker modal */}
      <Modal
        visible={showWorkspacePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkspacePicker(false)}
      >
        <View style={[styles.pickerContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Switch workspace</Text>
            <TouchableOpacity onPress={() => setShowWorkspacePicker(false)}>
              <Text style={styles.pickerClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={workspaces}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  item.id === activeWorkspace?.id && styles.pickerItemActive,
                ]}
                onPress={() => handleSwitchWorkspace(item)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.pickerIcon,
                  { backgroundColor: item.type === 'BUSINESS' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)' }
                ]}>
                  <Text style={{
                    color: item.type === 'BUSINESS' ? '#3b82f6' : '#10b981',
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                    {item.name[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.pickerItemInfo}>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemType}>{item.type.toLowerCase()}</Text>
                </View>
                {item.id === activeWorkspace?.id && (
                  <Text style={styles.pickerCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 2 },
  userName: { color: 'white', fontSize: 22, fontWeight: '600', letterSpacing: -0.3 },
  workspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  workspaceDot: { width: 6, height: 6, borderRadius: 3 },
  workspaceBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', flex: 1 },
  workspaceChevron: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },

  balanceCard: {
    backgroundColor: '#0d1117',
    borderRadius: 20,
    padding: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  eyeBtn: { padding: 4 },
  balanceAmount: { color: 'white', fontSize: 34, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4 },
  balanceChange: { fontSize: 13, marginBottom: 20 },
  balanceRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16,
  },
  balanceStat: { flex: 1 },
  balanceStatDot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  balanceStatLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  balanceStatValue: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },

  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0d1117',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickActionText: { fontSize: 12, fontWeight: '500' },

  summaryCard: {
    backgroundColor: '#0d1117',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryTitle: { color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  summaryRow: { flexDirection: 'row' },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryStatLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 4 },
  summaryStatValue: { fontSize: 15, fontWeight: '600' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  sectionLink: { color: '#10b981', fontSize: 13 },

  budgetsList: { gap: 14 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 110 },
  budgetDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  budgetName: { color: 'rgba(255,255,255,0.6)', fontSize: 13, flex: 1 },
  budgetRight: { flex: 1, gap: 4 },
  budgetPct: { fontSize: 11, fontWeight: '600', textAlign: 'right' },
  budgetTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 2 },
  budgetRemaining: { color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'right' },

  txList: { gap: 2 },
  emptyTx: { alignItems: 'center', paddingVertical: 32 },
  emptyTxText: { color: 'rgba(255,255,255,0.2)', fontSize: 14 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
    paddingLeft: 10,
    marginLeft: -12,
  },
  txIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txInfo: { flex: 1, minWidth: 0 },
  txTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  txCategory: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  txRight: { alignItems: 'flex-end', flexShrink: 0 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  txDate: { color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 2 },

  pickerContainer: { flex: 1, backgroundColor: '#0f1117', padding: 20 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pickerTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  pickerClose: { color: '#10b981', fontSize: 16 },
  pickerList: { gap: 10 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: '#0a0d12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pickerItemActive: { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.05)' },
  pickerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pickerItemInfo: { flex: 1 },
  pickerItemName: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500' },
  pickerItemType: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  pickerCheck: { color: '#10b981', fontSize: 18 },
})