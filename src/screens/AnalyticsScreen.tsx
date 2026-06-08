import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'

interface Overview {
  totalIncome: number
  totalExpenses: number
  balance: number
  savingsRate: number
}

interface CategoryBreakdown {
  category: { name: string; color: string; icon?: string }
  totalSpent: number
  percentage: number
}

interface TrendItem {
  month: string
  income: number
  expenses: number
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
    const label = d.toLocaleString('default', { month: 'short' })
    months.push({ value, label })
  }
  return months
}

const SOURCE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

export default function AnalyticsScreen() {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const months = getLast6Months()
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1].value)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [categories, setCategories] = useState<CategoryBreakdown[]>([])
  const [trend, setTrend] = useState<TrendItem[]>([])
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const isBusiness = activeWorkspace?.type === 'BUSINESS'

  const fetchData = useCallback(async () => {
    if (!activeWorkspace) return
    try {
      const [overviewRes, categoriesRes, trendRes, sourcesRes] = await Promise.all([
        api.get(`/w/${activeWorkspace.id}/analytics/overview?month=${selectedMonth}`),
        api.get(`/w/${activeWorkspace.id}/analytics/categories?month=${selectedMonth}`),
        api.get(`/w/${activeWorkspace.id}/analytics/trend?months=6`),
        api.get(`/w/${activeWorkspace.id}/analytics/income-sources?month=${selectedMonth}`),
      ])
      setOverview(overviewRes.data)
      setCategories(categoriesRes.data)
      setTrend(trendRes.data)
      setSources(sourcesRes.data.sources)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeWorkspace, selectedMonth])

  useEffect(() => { fetchData() }, [fetchData])

  const maxTrendValue = Math.max(...trend.map((t) => Math.max(t.income, t.expenses)), 1)
  const net = (overview?.totalIncome ?? 0) - (overview?.totalExpenses ?? 0)

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
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor="#10b981" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Financial overview</Text>
      </View>

      {/* Month selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.monthScroll}
        contentContainerStyle={styles.monthList}
      >
        {months.map((m) => (
          <TouchableOpacity
            key={m.value}
            onPress={() => setSelectedMonth(m.value)}
            style={[styles.monthChip, selectedMonth === m.value && styles.monthChipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.monthText, selectedMonth === m.value && styles.monthTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{isBusiness ? 'Revenue' : 'Income'}</Text>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>
            {formatNaira(overview?.totalIncome ?? 0)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
            {formatNaira(overview?.totalExpenses ?? 0)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={[styles.summaryValue, { color: net >= 0 ? '#10b981' : '#ef4444' }]}>
            {formatNaira(net)}
          </Text>
        </View>
      </View>

      {/* Trend chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>6-month trend</Text>
        <View style={styles.chart}>
          {trend.map((item, i) => {
            const incomeH = (item.income / maxTrendValue) * 100
            const expenseH = (item.expenses / maxTrendValue) * 100
            const monthLabel = new Date(item.month + '-01').toLocaleString('default', { month: 'short' })
            return (
              <View key={i} style={styles.chartCol}>
                <View style={styles.chartBars}>
                  <View style={[styles.chartBar, { height: `${incomeH}%` as any, backgroundColor: '#10b981', opacity: 0.8 }]} />
                  <View style={[styles.chartBar, { height: `${expenseH}%` as any, backgroundColor: '#ef4444', opacity: 0.8 }]} />
                </View>
                <Text style={styles.chartLabel}>{monthLabel}</Text>
              </View>
            )
          })}
        </View>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>{isBusiness ? 'Revenue' : 'Income'}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Expenses</Text>
          </View>
        </View>
      </View>

      {/* Savings / profit rate */}
      <View style={styles.card}>
        <View style={styles.rateRow}>
          <Text style={styles.cardTitle}>{isBusiness ? 'Profit margin' : 'Savings rate'}</Text>
          <Text style={[styles.rateValue, { color: (overview?.savingsRate ?? 0) > 20 ? '#10b981' : '#f59e0b' }]}>
            {overview?.savingsRate.toFixed(1) ?? 0}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {
            width: `${Math.min(overview?.savingsRate ?? 0, 100)}%` as any,
            backgroundColor: (overview?.savingsRate ?? 0) > 20 ? '#10b981' : '#f59e0b',
          }]} />
        </View>
        <Text style={styles.rateHint}>
          {(overview?.savingsRate ?? 0) > 20 ? '✓ Healthy rate' : 'Aim for 20%+'}
        </Text>
      </View>

      {/* Spending breakdown */}
      {categories.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spending breakdown</Text>
          <View style={styles.categoryList}>
            {categories.map((item, i) => (
              <View key={i} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryColor, { backgroundColor: item.category?.color ?? '#6366f1' }]} />
                  <Text style={styles.categoryIcon}>
                    {(item.category as any)?.icon && (item.category as any).icon.length <= 2
                      ? (item.category as any).icon
                      : '📦'}
                  </Text>
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
          <Text style={styles.cardTitle}>{isBusiness ? 'Revenue sources' : 'Income sources'}</Text>
          <View style={styles.categoryList}>
            {sources.map((item, i) => (
              <View key={i}>
                <View style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryColor, { backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }]} />
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

      <View style={{ height: 20 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  header: { marginBottom: 20 },
  title: { color: 'white', fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 },

  monthScroll: { marginBottom: 20, marginHorizontal: -20 },
  monthList: { paddingHorizontal: 20, gap: 8 },
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  monthChipActive: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' },
  monthText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '500' },
  monthTextActive: { color: '#10b981' },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#0d1117',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 6 },
  summaryValue: { fontSize: 14, fontWeight: '700' },

  card: {
    backgroundColor: '#0d1117',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  cardTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600', marginBottom: 16 },

  // Trend chart
  chart: { flexDirection: 'row', height: 100, alignItems: 'flex-end', gap: 6, marginBottom: 12 },
  chartCol: { flex: 1, alignItems: 'center', gap: 6 },
  chartBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%' },
  chartBar: { flex: 1, borderRadius: 3, minHeight: 2 },
  chartLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10 },
  chartLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },

  // Rate
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rateValue: { fontSize: 18, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  rateHint: { color: 'rgba(255,255,255,0.25)', fontSize: 12 },

  // Categories
  categoryList: { gap: 14 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  categoryColor: { width: 3, height: 20, borderRadius: 2 },
  categoryIcon: { fontSize: 14 },
  categoryName: { color: 'rgba(255,255,255,0.6)', fontSize: 13, flex: 1 },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryAmount: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  categoryPct: { color: 'rgba(255,255,255,0.25)', fontSize: 12, width: 30, textAlign: 'right' },
  sourceBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  sourceBarFill: { height: '100%', borderRadius: 2 },
})