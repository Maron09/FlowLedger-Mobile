import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity
} from 'react-native'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'


interface Overview {
  totalIncome: number
  totalExpenses: number
  balance: number
  savingsRate: number
}

interface CategoryBreakdown {
  category: { name: string; color: string }
  totalSpent: number
  percentage: number
}

interface IncomeSource {
  source: string
  total: number
  percentage: number
  count: number
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

function getLast6Months() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
    months.push({ value, label })
  }
  return months
}

const SOURCE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

export default function AnalyticsScreen() {
  const { activeWorkspace } = useWorkspaceStore()
  const months = getLast6Months()
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1].value)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [categories, setCategories] = useState<CategoryBreakdown[]>([])
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const insets = useSafeAreaInsets()
  const fetchData = async () => {
    if (!activeWorkspace) return
    try {
      const [overviewRes, categoriesRes, sourcesRes] = await Promise.all([
        api.get(`/w/${activeWorkspace.id}/analytics/overview?month=${selectedMonth}`),
        api.get(`/w/${activeWorkspace.id}/analytics/categories?month=${selectedMonth}`),
        api.get(`/w/${activeWorkspace.id}/analytics/income-sources?month=${selectedMonth}`),
      ])
      setOverview(overviewRes.data)
      setCategories(categoriesRes.data)
      setSources(sourcesRes.data.sources)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchData() }, [activeWorkspace, selectedMonth])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

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
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Your financial picture</Text>
      </View>

      {/* Month selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={styles.monthList}>
        {months.map((m) => (
          <TouchableOpacity
            key={m.value}
            onPress={() => setSelectedMonth(m.value)}
            style={[styles.monthChip, selectedMonth === m.value && styles.monthChipActive]}
          >
            <Text style={[styles.monthText, selectedMonth === m.value && styles.monthTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryLabel}>{activeWorkspace?.type === 'BUSINESS' ? 'Revenue' : 'Income'}</Text>
          <Text style={[styles.summaryAmount, { color: '#10b981' }]}>{formatNaira(overview?.totalIncome ?? 0)}</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>{formatNaira(overview?.totalExpenses ?? 0)}</Text>
        </View>
        <View style={[styles.summaryCard, { flex: 1 }]}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text style={[styles.summaryAmount, { color: '#3b82f6' }]}>{formatNaira(overview?.balance ?? 0)}</Text>
        </View>
      </View>

      {/* Savings rate */}
      <View style={styles.card}>
        <View style={styles.savingsRow}>
          <Text style={styles.cardTitle}>{activeWorkspace?.type === 'BUSINESS' ? 'Profit margin' : 'Savings rate'}</Text>
          <Text style={styles.savingsValue}>{overview?.savingsRate.toFixed(1) ?? 0}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {
            width: `${Math.min(overview?.savingsRate ?? 0, 100)}%` as any,
            backgroundColor: (overview?.savingsRate ?? 0) > 20 ? '#10b981' : '#f59e0b',
          }]} />
        </View>
      </View>

      {/* Spending breakdown */}
      {categories.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spending breakdown</Text>
          <View style={styles.categoryList}>
            {categories.map((item, i) => (
              <View key={i} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.dot, { backgroundColor: item.category?.color ?? '#6366f1' }]} />
                  <Text style={styles.categoryName} numberOfLines={1}>{item.category?.name}</Text>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>{formatNaira(item.totalSpent)}</Text>
                  <Text style={styles.categoryPct}>{item.percentage.toFixed(0)}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Income sources */}
      {sources.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Income sources</Text>
          <View style={styles.categoryList}>
            {sources.map((item, i) => (
              <View key={i}>
                <View style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.dot, { backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }]} />
                    <Text style={styles.categoryName}>{item.source}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryAmount}>{formatNaira(item.total)}</Text>
                    <Text style={styles.categoryPct}>{item.percentage.toFixed(0)}%</Text>
                  </View>
                </View>
                <View style={styles.sourceBar}>
                  <View style={[styles.sourceBarFill, {
                    width: `${item.percentage}%` as any,
                    backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length],
                  }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 16 },
  title: { color: 'white', fontSize: 22, fontWeight: '600' },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 },
  monthScroll: { marginBottom: 16 },
  monthList: { gap: 8, paddingRight: 20 },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  monthChipActive: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' },
  monthText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  monthTextActive: { color: '#10b981' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard: {
    backgroundColor: '#0a0d12',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  summaryAmount: { fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#0a0d12',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  cardTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  savingsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  savingsValue: { color: 'white', fontSize: 14, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  categoryList: { gap: 12 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { color: 'rgba(255,255,255,0.6)', fontSize: 13, flex: 1 },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryAmount: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  categoryPct: { color: 'rgba(255,255,255,0.3)', fontSize: 12, width: 32, textAlign: 'right' },
  sourceBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  sourceBarFill: { height: '100%', borderRadius: 2 },
})