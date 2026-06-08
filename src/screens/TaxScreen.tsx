import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, TouchableOpacity
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'

interface PersonalTax {
  type: 'PERSONAL'
  monthlyIncome: number
  annualIncome: number
  annualTax: number
  monthlyTax: number
  effectiveRate: number
  breakdown?: { band: string; rate: number; tax: number }[]
  note: string
  employmentType: string
}

interface BusinessTax {
  type: 'BUSINESS'
  ytdRevenue: number
  ytdExpenses: number
  taxableProfit: number
  annualizedRevenue: number
  annualizedProfit: number
  citRate: number
  annualTax: number
  monthlyTaxProvision: number
  vatRegistered: boolean
  monthlyVat: number
  totalMonthlyProvision: number
  effectiveRate: number
  note: string
}

interface TaxProfile {
  employmentType: string
  taxableCategories: string[]
  businessSector?: string
  businessSize?: string
  handlesPaye?: boolean
  vatRegistered?: boolean
  deductibleCategories?: string[]
}

type TaxEstimate = PersonalTax | BusinessTax

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  SELF_EMPLOYED: 'Self-employed / Freelancer',
  SALARIED: 'Salaried — side income only',
  MIXED: 'Mixed income',
}

const SECTOR_LABELS: Record<string, string> = {
  GENERAL: 'General / Services',
  TECH: 'Technology',
  AGRICULTURE: 'Agriculture',
  MANUFACTURING: 'Manufacturing',
  OTHER: 'Other',
}

const SIZE_LABELS: Record<string, string> = {
  SOLE: 'Sole trader',
  MICRO: 'Micro (1–9 employees)',
  SMALL: 'Small (10–49 employees)',
  MEDIUM: 'Medium / Large (50+)',
}

export default function TaxScreen({ navigation }: any) {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [estimate, setEstimate] = useState<TaxEstimate | null>(null)
  const [profile, setProfile] = useState<TaxProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!activeWorkspace) return
    try {
      const [estimateRes, profileRes] = await Promise.all([
        api.get(`/w/${activeWorkspace.id}/analytics/tax`),
        api.get(`/w/${activeWorkspace.id}/analytics/tax/profile`),
      ])
      setEstimate(estimateRes.data)
      setProfile(profileRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchData() }, [activeWorkspace])

  const isBusiness = activeWorkspace?.type === 'BUSINESS'
  const biz = estimate?.type === 'BUSINESS' ? estimate as BusinessTax : null
  const personal = estimate?.type === 'PERSONAL' ? estimate as PersonalTax : null
  const hasData = biz ? biz.ytdRevenue > 0 : (personal?.monthlyIncome ?? 0) > 0

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
    >
      {/* Header */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Tax Estimation</Text>
      <Text style={styles.subtitle}>
        Based on Nigeria Tax Act 2025 — {isBusiness ? 'Companies Income Tax' : 'Personal Income Tax'}
      </Text>

      {/* Tax profile summary */}
      {profile && (
        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>Tax Profile</Text>
          {!isBusiness ? (
            <View style={styles.profileRows}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Employment type</Text>
                <Text style={styles.profileValue}>
                  {EMPLOYMENT_LABELS[profile.employmentType] ?? profile.employmentType}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Taxable categories</Text>
                <Text style={styles.profileValue}>
                  {profile.taxableCategories.length > 0
                    ? `${profile.taxableCategories.length} selected`
                    : 'All income'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.profileRows}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Sector</Text>
                <Text style={styles.profileValue}>
                  {SECTOR_LABELS[profile.businessSector ?? ''] ?? profile.businessSector ?? 'General'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Business size</Text>
                <Text style={styles.profileValue}>
                  {SIZE_LABELS[profile.businessSize ?? ''] ?? profile.businessSize ?? 'Small'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>VAT registered</Text>
                <Text style={styles.profileValue}>{profile.vatRegistered ? 'Yes' : 'No'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Handles PAYE</Text>
                <Text style={styles.profileValue}>{profile.handlesPaye ? 'Yes' : 'No'}</Text>
              </View>
            </View>
          )}
          <View style={styles.profileHint}>
            <Text style={styles.profileHintText}>
              ✏️ Update your tax profile on the web app for more accurate estimates
            </Text>
          </View>
        </View>
      )}

      {!hasData ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No {isBusiness ? 'revenue' : 'income'} recorded</Text>
          <Text style={styles.emptyHint}>Add transactions to see your tax estimate</Text>
        </View>
      ) : (
        <>
          {/* Personal tax */}
          {!isBusiness && personal && (
            <>
              <View style={styles.grid}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Taxable Income</Text>
                  <Text style={styles.cardValue}>{formatNaira(personal.monthlyIncome)}</Text>
                  <Text style={styles.cardSub}>Monthly</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Effective Rate</Text>
                  <Text style={styles.cardValue}>{personal.effectiveRate.toFixed(1)}%</Text>
                  <Text style={styles.cardSub}>Of annual income</Text>
                </View>
              </View>

              <View style={[styles.card, styles.highlightCard]}>
                <Text style={styles.highlightLabel}>Set aside monthly</Text>
                <Text style={styles.highlightValue}>{formatNaira(Math.ceil(personal.monthlyTax))}</Text>
                <Text style={styles.highlightSub}>For tax obligations</Text>
              </View>

              <View style={styles.grid}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Annual Tax</Text>
                  <Text style={styles.cardValue}>{formatNaira(Math.ceil(personal.annualTax))}</Text>
                  <Text style={styles.cardSub}>Estimated liability</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Annual Income</Text>
                  <Text style={styles.cardValue}>{formatNaira(personal.annualIncome)}</Text>
                  <Text style={styles.cardSub}>Projected</Text>
                </View>
              </View>

              {/* Band breakdown */}
              {personal.breakdown && personal.breakdown.length > 0 && (
                <View style={styles.breakdownCard}>
                  <Text style={styles.breakdownTitle}>Tax Band Breakdown</Text>
                  <View style={styles.bandRow}>
                    <Text style={styles.bandLabel}>First ₦800,000</Text>
                    <Text style={[styles.bandRate, { color: '#10b981' }]}>0% — Tax free</Text>
                  </View>
                  {personal.breakdown.map((band, i) => (
                    <View key={i} style={styles.bandRow}>
                      <Text style={styles.bandLabel} numberOfLines={1}>{band.band}</Text>
                      <Text style={styles.bandRate}>{band.rate}% — {formatNaira(band.tax)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Business tax */}
          {isBusiness && biz && (
            <>
              <View style={styles.grid}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>YTD Revenue</Text>
                  <Text style={styles.cardValue}>{formatNaira(biz.ytdRevenue)}</Text>
                  <Text style={styles.cardSub}>This year</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>YTD Expenses</Text>
                  <Text style={styles.cardValue}>{formatNaira(biz.ytdExpenses)}</Text>
                  <Text style={styles.cardSub}>Deductible</Text>
                </View>
              </View>

              <View style={styles.grid}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Taxable Profit</Text>
                  <Text style={styles.cardValue}>{formatNaira(biz.taxableProfit)}</Text>
                  <Text style={styles.cardSub}>Revenue - expenses</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>CIT Rate</Text>
                  <Text style={styles.cardValue}>{biz.citRate}%</Text>
                  <Text style={styles.cardSub}>Companies Income Tax</Text>
                </View>
              </View>

              <View style={[styles.card, styles.highlightCard]}>
                <Text style={styles.highlightLabel}>Set aside monthly</Text>
                <Text style={styles.highlightValue}>{formatNaira(Math.ceil(biz.totalMonthlyProvision))}</Text>
                <Text style={styles.highlightSub}>CIT{biz.vatRegistered ? ' + VAT' : ''} provision</Text>
              </View>

              {biz.vatRegistered && (
                <View style={styles.grid}>
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Monthly VAT</Text>
                    <Text style={styles.cardValue}>{formatNaira(Math.ceil(biz.monthlyVat))}</Text>
                    <Text style={styles.cardSub}>7.5% on revenue</Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Annual CIT</Text>
                    <Text style={styles.cardValue}>{formatNaira(Math.ceil(biz.annualTax))}</Text>
                    <Text style={styles.cardSub}>Estimated</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Note */}
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>{estimate?.note}</Text>
            <Text style={styles.noteDisclaimer}>
              This is an estimate only. Consult a tax professional for accurate filing.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  centered: { flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#10b981', fontSize: 16 },
  title: { color: 'white', fontSize: 22, fontWeight: '600', marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginBottom: 20, lineHeight: 20 },
  profileCard: {
    backgroundColor: '#0a0d12',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  profileTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  profileRows: { gap: 10 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  profileValue: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  profileHint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  profileHintText: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 15 },
  emptyHint: { color: 'rgba(255,255,255,0.1)', fontSize: 13, marginTop: 6 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: '#0a0d12',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  cardValue: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  highlightCard: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.2)',
    marginBottom: 12,
  },
  highlightLabel: { color: 'rgba(245,158,11,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  highlightValue: { color: '#f59e0b', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  highlightSub: { color: 'rgba(245,158,11,0.5)', fontSize: 11 },
  breakdownCard: {
    backgroundColor: '#0a0d12',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
    gap: 10,
  },
  breakdownTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  bandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bandLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, flex: 1 },
  bandRate: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  noteCard: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  noteText: { color: '#60a5fa', fontSize: 13, lineHeight: 20 },
  noteDisclaimer: { color: 'rgba(96,165,250,0.5)', fontSize: 11 },
})