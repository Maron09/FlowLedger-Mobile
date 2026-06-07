import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'


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

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

function statusColor(status: string) {
  if (status === 'over') return '#ef4444'
  if (status === 'warning') return '#f59e0b'
  return '#10b981'
}

export default function BudgetsScreen() {
  const { activeWorkspace } = useWorkspaceStore()
  const [budgets, setBudgets] = useState<BudgetStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const insets = useSafeAreaInsets()

  const fetchData = async () => {
    if (!activeWorkspace) return
    try {
      const { data } = await api.get(`/w/${activeWorkspace.id}/analytics/budgets`)
      setBudgets(data)
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
      contentContainerStyle={[  styles.content, { paddingTop: insets.top + 20 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
        <Text style={styles.subtitle}>Monthly spending limits</Text>
      </View>

      {budgets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No budgets set</Text>
          <Text style={styles.emptyHint}>Set budgets on the web app</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {budgets.map((bs) => {
            const { budget, spent, remaining, percentage, status } = bs
            const color = statusColor(status)
            return (
              <View key={budget.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.catIcon, { backgroundColor: `${budget.category.color}20` }]}>
                      <Text style={{ color: budget.category.color, fontSize: 14, fontWeight: '600' }}>
                        {budget.category.name[0].toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.catName}>{budget.category.name}</Text>
                      <Text style={styles.catPeriod}>Monthly budget</Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.amounts}>
                      {formatNaira(spent)}{' '}
                      <Text style={styles.amountOf}>/ {formatNaira(Number(budget.amount))}</Text>
                    </Text>
                    <Text style={[styles.remaining, { color }]}>
                      {status === 'over'
                        ? `${formatNaira(Math.abs(remaining))} over`
                        : `${formatNaira(remaining)} left`}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(percentage, 100)}%` as any,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>

                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>0%</Text>
                  <Text style={[styles.progressLabel, { color }]}>
                    {percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 20 },
  title: { color: 'white', fontSize: 22, fontWeight: '600' },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 15 },
  emptyHint: { color: 'rgba(255,255,255,0.1)', fontSize: 13, marginTop: 6 },
  list: { gap: 12 },
  card: {
    backgroundColor: '#0a0d12',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  catPeriod: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  amounts: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  amountOf: { color: 'rgba(255,255,255,0.3)', fontWeight: '400' },
  remaining: { fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 11 },
})