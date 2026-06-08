import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from './src/store/auth.store'
import { useWorkspaceStore } from './src/store/workspace.store'
import api from './src/lib/api'
import AddTransactionModal from './src/components/AddtransactionModal'
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import TransactionsScreen from './src/screens/TransactionsScreen'
import AnalyticsScreen from './src/screens/AnalyticsScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import CategoriesScreen from './src/screens/CategoriesScreen'
import TaxScreen from './src/screens/TaxScreen'
import AiChatScreen from './src/screens/AiChatScreen'
import TeamMembersScreen from './src/screens/TeamMembersScreen'
import RecurringScreen from './src/screens/RecurringScreen'
import BudgetsScreen from './src/screens/BudgetsScreen'
import MoreScreen from './src/screens/MoreScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()
const AppStack = createNativeStackNavigator()

function EmptyScreen() { return null }

type TabName = 'Home' | 'Transactions' | 'More' | 'Settings'

function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const color = focused ? '#10b981' : 'rgba(255,255,255,0.35)'
  const size = 22

  const iconMap: Record<TabName, { focused: string; outline: string }> = {
    Home:         { focused: 'home',          outline: 'home-outline' },
    Transactions: { focused: 'swap-vertical', outline: 'swap-vertical-outline' },
    More:         { focused: 'grid',          outline: 'grid-outline' },
    Settings:     { focused: 'person',        outline: 'person-outline' },
  }

  const icon = iconMap[name]
  if (!icon) return null

  return (
    <Ionicons
      name={(focused ? icon.focused : icon.outline) as any}
      size={size}
      color={color}
    />
  )
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets()
  const [showModal, setShowModal] = useState(false)

  const labels: Record<string, string> = {
    Home: 'Home',
    Transactions: 'Transactions',
    More: 'More',
    Settings: 'Settings',
  }

  return (
    <>
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        {state.routes.map((route: any, index: number) => {
          if (route.name === 'Add') {
            return (
              <TouchableOpacity
                key="add"
                style={styles.addTabBtn}
                onPress={() => setShowModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.addTabCircle}>
                  <Ionicons name="add" size={28} color="white" />
                </View>
              </TouchableOpacity>
            )
          }

          const isFocused = state.index === index

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name)
                }
              }}
              activeOpacity={0.7}
            >
              <TabIcon name={route.name as TabName} focused={isFocused} />
              <Text style={[styles.tabLabel, { color: isFocused ? '#10b981' : 'rgba(255,255,255,0.35)' }]}>
                {labels[route.name]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <AddTransactionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => setShowModal(false)}
      />
    </>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Add" component={EmptyScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

function AppNavigator() {
  const { workspaces, workspacesLoaded } = useWorkspaceStore()

  if (!workspacesLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  if (workspaces.length === 0) {
    return <OnboardingScreen />
  }

  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name='Analytics' component={AnalyticsScreen} />
      <AppStack.Screen name="Tabs" component={MainTabs} />
      <AppStack.Screen name="Categories" component={CategoriesScreen} />
      <AppStack.Screen name="Tax" component={TaxScreen} />
      <AppStack.Screen name="AiChat" component={AiChatScreen} />
      <AppStack.Screen name="TeamMembers" component={TeamMembersScreen} />
      <AppStack.Screen name="Recurring" component={RecurringScreen} />
      <AppStack.Screen name="Budgets" component={BudgetsScreen} />
    </AppStack.Navigator>
  )
}

export default function App() {
  const { isAuthenticated, setAuth } = useAuthStore()
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken')
        if (refreshToken) {
          const { data } = await api.post('/auth/refresh', { refreshToken })
          const { data: userData } = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          })
          await setAuth(userData, data.accessToken, data.refreshToken)

          const { data: workspaces } = await api.get('/workspaces', {
            headers: { Authorization: `Bearer ${data.accessToken}` },
          })
          setWorkspaces(workspaces)
          const lastId = userData.lastWorkspaceId
          const active = workspaces.find((w: any) => w.id === lastId) ?? workspaces[0]
          if (active) setActiveWorkspace(active)
        }
      } catch {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken'])
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#10b981" size="large" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : (
            <Stack.Screen name="Main" component={AppNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0a0d12',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  addTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  addTabCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
})