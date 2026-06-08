import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspaceStore } from '../store/workspace.store'

const MENU_ITEMS = [
  
  { icon: '🏷️', label: 'Categories', screen: 'Categories', desc: 'Manage spending categories' },
  { icon: '🔄', label: 'Recurring', screen: 'Recurring', desc: 'View recurring transactions' },
  { icon: '📊', label: 'Budgets', screen: 'Budgets', desc: 'Monthly spending limits' },
  { icon: '🧾', label: 'Tax estimation', screen: 'Tax', desc: 'NTA 2025 tax calculator' },
  { icon: '🤖', label: 'AI Assistant', screen: 'AiChat', desc: 'Ask about your finances' },
  { icon: '👥', label: 'Team members', screen: 'TeamMembers', desc: 'Invite and manage members' },
]

export default function MoreScreen({ navigation }: any) {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const isBusiness = activeWorkspace?.type === 'BUSINESS'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>
        {activeWorkspace?.name} · {isBusiness ? 'Business' : 'Personal'}
      </Text>

      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, i) => (
          <View key={item.screen}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.6}
            >
              <View style={styles.iconBox}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            {i < MENU_ITEMS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      <Text style={styles.version}>FlowLedger Mobile v1.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { color: 'white', fontSize: 26, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginBottom: 28 },
  menuCard: {
    backgroundColor: '#0d1117',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  menuInfo: { flex: 1 },
  menuLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  menuDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  chevron: { color: 'rgba(255,255,255,0.2)', fontSize: 20 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 16 },
  version: { color: 'rgba(255,255,255,0.1)', fontSize: 12, textAlign: 'center' },
})