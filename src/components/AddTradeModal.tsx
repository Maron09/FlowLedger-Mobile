import { useState } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'

interface SearchResult {
  symbol: string
  name: string
  type: string
  region: string
  currency: string
  price?: number
}

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddTradeModal({ visible, onClose, onSuccess }: Props) {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [exchange, setExchange] = useState<'INTERNATIONAL' | 'NGX'>('INTERNATIONAL')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null)
  const [form, setForm] = useState({
    units: '',
    pricePerUnit: '',
    buyDate: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setExchange('INTERNATIONAL')
    setSearchQuery('')
    setSearchResults([])
    setSelectedStock(null)
    setForm({ units: '', pricePerUnit: '', buyDate: new Date().toISOString().split('T')[0], notes: '' })
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !activeWorkspace) return
    setSearching(true)
    try {
      const { data } = await api.get(
        `/w/${activeWorkspace.id}/portfolio/search?q=${searchQuery}&exchange=${exchange}`
      )
      setSearchResults(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedStock || !form.units || !form.pricePerUnit) {
      setError('Please select a stock and fill in all fields')
      return
    }
    setSaving(true)
    setError('')
    try {
      const currency = exchange === 'NGX' ? 'NGN' : (selectedStock.currency === 'NGN' ? 'NGN' : 'USD')
      await api.post(`/w/${activeWorkspace!.id}/portfolio/trades`, {
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        exchange,
        currency,
        units: Number(form.units),
        pricePerUnit: Number(form.pricePerUnit),
        buyDate: form.buyDate,
        notes: form.notes || undefined,
      })
      reset()
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add trade')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add trade</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#10b981" size="small" />
              : <Text style={styles.save}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Exchange selector */}
          <View style={styles.field}>
            <Text style={styles.label}>Market</Text>
            <View style={styles.exchangeRow}>
              <TouchableOpacity
                style={[styles.exchangeBtn, exchange === 'INTERNATIONAL' && styles.exchangeBtnActiveBlue]}
                onPress={() => { setExchange('INTERNATIONAL'); setSelectedStock(null); setSearchResults([]); setSearchQuery('') }}
                activeOpacity={0.7}
              >
                <Text style={[styles.exchangeBtnText, exchange === 'INTERNATIONAL' && styles.exchangeBtnTextBlue]}>
                  🌍 International
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exchangeBtn, exchange === 'NGX' && styles.exchangeBtnActiveGreen]}
                onPress={() => { setExchange('NGX'); setSelectedStock(null); setSearchResults([]); setSearchQuery('') }}
                activeOpacity={0.7}
              >
                <Text style={[styles.exchangeBtnText, exchange === 'NGX' && styles.exchangeBtnTextGreen]}>
                  🇳🇬 NGX
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stock search */}
          <View style={styles.field}>
            <Text style={styles.label}>Search stock</Text>
            {!selectedStock ? (
              <>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    placeholder={exchange === 'NGX' ? 'e.g. DANGCEM, MTNN, GTCO' : 'e.g. AAPL, TSLA, MSFT'}
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    autoCapitalize="characters"
                    returnKeyType="search"
                  />
                  <TouchableOpacity
                    style={styles.searchBtn}
                    onPress={handleSearch}
                    disabled={searching}
                    activeOpacity={0.7}
                  >
                    {searching
                      ? <ActivityIndicator color="white" size="small" />
                      : <Text style={styles.searchBtnText}>Search</Text>
                    }
                  </TouchableOpacity>
                </View>

                {exchange === 'NGX' && (
                  <Text style={styles.hint}>Search by ticker or company name</Text>
                )}

                {searchResults.length === 0 && searchQuery.length > 0 && !searching && (
                  <Text style={styles.noResults}>
                    {exchange === 'NGX' ? 'No NGX stocks found. Prices update every 30 min.' : 'No results found.'}
                  </Text>
                )}

                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.symbol}
                    style={styles.resultRow}
                    onPress={() => setSelectedStock(result)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultSymbol}>{result.symbol}</Text>
                      <Text style={styles.resultName}>{result.name} · {result.region}</Text>
                    </View>
                    {result.price && (
                      <Text style={styles.resultPrice}>₦{result.price.toLocaleString()}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={styles.selectedStock}>
                <View>
                  <Text style={styles.selectedSymbol}>{selectedStock.symbol}</Text>
                  <Text style={styles.selectedName}>{selectedStock.name}</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedStock(null); setSearchResults([]) }}>
                  <Text style={styles.changeBtn}>Change</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Trade details */}
          <View style={styles.field}>
            <Text style={styles.label}>Units purchased</Text>
            <TextInput
              style={styles.input}
              value={form.units}
              onChangeText={(v) => setForm({ ...form, units: v })}
              placeholder="e.g. 100"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Price per unit ({exchange === 'NGX' ? '₦' : '$'})</Text>
            <TextInput
              style={styles.input}
              value={form.pricePerUnit}
              onChangeText={(v) => setForm({ ...form, pricePerUnit: v })}
              placeholder={exchange === 'NGX' ? 'e.g. 450' : 'e.g. 150.50'}
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Buy date</Text>
            <TextInput
              style={styles.input}
              value={form.buyDate}
              onChangeText={(v) => setForm({ ...form, buyDate: v })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
              placeholder="Any notes..."
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </View>

          {/* Cost preview */}
          {form.units && form.pricePerUnit && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Total cost</Text>
              <Text style={styles.previewValue}>
                {exchange === 'NGX' ? '₦' : '$'}
                {(Number(form.units) * Number(form.pricePerUnit)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}

          {error !== '' && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  cancel: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  title: { color: 'white', fontSize: 16, fontWeight: '600' },
  save: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  content: { padding: 20, gap: 20, paddingBottom: 60 },
  field: { gap: 8 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: 'white',
    fontSize: 15,
  },
  exchangeRow: { flexDirection: 'row', gap: 10 },
  exchangeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  exchangeBtnActiveBlue: { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)' },
  exchangeBtnActiveGreen: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  exchangeBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },
  exchangeBtnTextBlue: { color: '#3b82f6' },
  exchangeBtnTextGreen: { color: '#10b981' },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    color: 'white',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  hint: { color: 'rgba(255,255,255,0.2)', fontSize: 11 },
  noResults: { color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', paddingVertical: 12 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 6,
  },
  resultInfo: { flex: 1 },
  resultSymbol: { color: 'white', fontSize: 13, fontWeight: '600' },
  resultName: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  resultPrice: { color: '#10b981', fontSize: 13, fontWeight: '500' },
  selectedStock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  selectedSymbol: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  selectedName: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  changeBtn: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  preview: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  previewLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  previewValue: { color: 'white', fontSize: 18, fontWeight: '700' },
  error: { color: '#ef4444', fontSize: 13 },
})