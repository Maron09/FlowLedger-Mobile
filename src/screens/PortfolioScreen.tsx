import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'
import AddTradeModal from '../components/AddTradeModal'

interface Trade {
  id: string
  units: number
  pricePerUnit: number
  totalCost: number
  buyDate: string
  notes?: string
}

interface Position {
  id: string
  symbol: string
  name: string
  exchange: string
  currency: string
  totalUnits: number
  avgCost: number
  totalCost: number
  currentPrice: number | null
  currentValue: number | null
  gainLoss: number | null
  gainLossPct: number | null
  trades: Trade[]
}

interface Summary {
  NGN: { totalValue: number; totalCost: number; gainLoss: number; gainLossPct: number }
  USD: { totalValue: number; totalCost: number; gainLoss: number; gainLossPct: number }
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function PortfolioScreen({ navigation }: any) {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [positions, setPositions] = useState<Position[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null)

  const fetchPortfolio = useCallback(async () => {
    if (!activeWorkspace) return
    try {
      const { data } = await api.get(`/w/${activeWorkspace.id}/portfolio`)
      setPositions(data.positions)
      setSummary(data.summary)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeWorkspace])

  useFocusEffect(
    useCallback(() => {
      fetchPortfolio()
    }, [activeWorkspace])
  )

  const handleDeleteTrade = (tradeId: string) => {
    Alert.alert('Delete trade', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/w/${activeWorkspace!.id}/portfolio/trades/${tradeId}`)
            fetchPortfolio()
          } catch {
            Alert.alert('Error', 'Failed to delete trade')
          }
        },
      },
    ])
  }

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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPortfolio() }} tintColor="#10b981" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Portfolio</Text>
            <Text style={styles.subtitle}>Track your investments</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addBtnText}>Add trade</Text>
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        {summary && (
          <View style={styles.summaryRow}>
            {/* NGN */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <Text style={styles.summaryCardLabel}>Nigerian</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>NGN</Text>
                </View>
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(summary.NGN.totalValue, 'NGN')}</Text>
              <Text style={styles.summaryCost}>Cost: {formatCurrency(summary.NGN.totalCost, 'NGN')}</Text>
              <Text style={[styles.summaryGain, { color: summary.NGN.gainLoss >= 0 ? '#10b981' : '#ef4444' }]}>
                {summary.NGN.gainLoss >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(summary.NGN.gainLoss), 'NGN')} ({summary.NGN.gainLossPct.toFixed(2)}%)
              </Text>
            </View>

            {/* USD */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <Text style={styles.summaryCardLabel}>International</Text>
                <View style={[styles.badge, styles.badgeBlue]}>
                  <Text style={[styles.badgeText, styles.badgeTextBlue]}>USD</Text>
                </View>
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(summary.USD.totalValue, 'USD')}</Text>
              <Text style={styles.summaryCost}>Cost: {formatCurrency(summary.USD.totalCost, 'USD')}</Text>
              <Text style={[styles.summaryGain, { color: summary.USD.gainLoss >= 0 ? '#10b981' : '#ef4444' }]}>
                {summary.USD.gainLoss >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(summary.USD.gainLoss), 'USD')} ({summary.USD.gainLossPct.toFixed(2)}%)
              </Text>
            </View>
          </View>
        )}

        {/* Positions */}
        {positions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No positions yet</Text>
            <Text style={styles.emptyHint}>Tap Add trade to get started</Text>
          </View>
        ) : (
          <View style={styles.positionsList}>
            <Text style={styles.sectionTitle}>Positions</Text>
            {positions.map((pos) => (
              <View key={pos.id} style={styles.positionCard}>
                {/* Position header */}
                <TouchableOpacity
                  style={styles.positionHeader}
                  onPress={() => setExpandedPosition(expandedPosition === pos.id ? null : pos.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.positionLeft}>
                    <View style={[styles.symbolBox, { backgroundColor: pos.currency === 'NGN' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)' }]}>
                      <Text style={[styles.symbolText, { color: pos.currency === 'NGN' ? '#10b981' : '#3b82f6' }]}>
                        {pos.symbol.slice(0, 2)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.symbolName}>{pos.symbol}</Text>
                      <Text style={styles.companyName} numberOfLines={1}>{pos.name}</Text>
                    </View>
                  </View>
                  <View style={styles.positionRight}>
                    <Text style={styles.positionValue}>
                      {pos.currentValue
                        ? formatCurrency(pos.currentValue, pos.currency)
                        : formatCurrency(pos.totalCost, pos.currency)}
                    </Text>
                    {pos.gainLossPct !== null && (
                      <Text style={[styles.gainLoss, { color: pos.gainLossPct >= 0 ? '#10b981' : '#ef4444' }]}>
                        {pos.gainLossPct >= 0 ? '+' : ''}{pos.gainLossPct.toFixed(2)}%
                      </Text>
                    )}
                    {pos.currentPrice === null && (
                      <Text style={styles.priceUnavailable}>Price unavailable</Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Units</Text>
                    <Text style={styles.statValue}>{pos.totalUnits}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Avg cost</Text>
                    <Text style={styles.statValue}>{formatCurrency(pos.avgCost, pos.currency)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Current</Text>
                    <Text style={styles.statValue}>
                      {pos.currentPrice ? formatCurrency(pos.currentPrice, pos.currency) : '—'}
                    </Text>
                  </View>
                </View>

                {/* Trade history */}
                {expandedPosition === pos.id && (
                  <View style={styles.tradesSection}>
                    <Text style={styles.tradesTitle}>Trade history</Text>
                    {pos.trades.map((trade) => (
                      <View key={trade.id} style={styles.tradeRow}>
                        <View style={styles.tradeInfo}>
                          <Text style={styles.tradeText}>
                            {trade.units} units @ {formatCurrency(trade.pricePerUnit, pos.currency)}
                          </Text>
                          <Text style={styles.tradeDate}>
                            {new Date(trade.buyDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Text>
                          {trade.notes && <Text style={styles.tradeNotes}>{trade.notes}</Text>}
                        </View>
                        <View style={styles.tradeRight}>
                          <Text style={styles.tradeCost}>{formatCurrency(trade.totalCost, pos.currency)}</Text>
                          <TouchableOpacity onPress={() => handleDeleteTrade(trade.id)}>
                            <Text style={styles.deleteBtn}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <AddTradeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false)
          fetchPortfolio()
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { color: 'white', fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#0d1117',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  summaryCardLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  badge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeBlue: { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)' },
  badgeText: { color: '#10b981', fontSize: 10, fontWeight: '600' },
  badgeTextBlue: { color: '#3b82f6' },
  summaryValue: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  summaryCost: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 4 },
  summaryGain: { fontSize: 11, fontWeight: '500' },

  sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600', marginBottom: 12 },
  positionsList: { gap: 10 },
  positionCard: {
    backgroundColor: '#0d1117',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  positionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  symbolBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  symbolText: { fontSize: 14, fontWeight: '700' },
  symbolName: { color: 'white', fontSize: 14, fontWeight: '600' },
  companyName: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2, maxWidth: 120 },
  positionRight: { alignItems: 'flex-end' },
  positionValue: { color: 'white', fontSize: 14, fontWeight: '600' },
  gainLoss: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  priceUnavailable: { color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stat: { flex: 1 },
  statLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 3 },
  statValue: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },

  tradesSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    padding: 16,
  },
  tradesTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tradeInfo: { flex: 1 },
  tradeText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  tradeDate: { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 3 },
  tradeNotes: { color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 3 },
  tradeRight: { alignItems: 'flex-end' },
  tradeCost: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  deleteBtn: { color: 'rgba(239,68,68,0.5)', fontSize: 11, marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 15 },
  emptyHint: { color: 'rgba(255,255,255,0.1)', fontSize: 13, marginTop: 6 },
})