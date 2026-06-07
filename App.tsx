import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { View, Text, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from './src/store/auth.store'
import { useWorkspaceStore } from './src/store/workspace.store'
import api from './src/lib/api'

import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import TransactionsScreen from './src/screens/TransactionsScreen'
import BudgetsScreen from './src/screens/BudgetsScreen'
import AnalyticsScreen from './src/screens/AnalyticsScreen'
import SettingsScreen from './src/screens/SettingsScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '⚡',
    Transactions: '↕️',
    Budgets: '🎯',
    Analytics: '📊',
    Settings: '⚙️',
  }
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>
      {icons[name]}
    </Text>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0d12',
          borderTopColor: 'rgba(255,255,255,0.05)',
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: { fontSize: 10, marginTop: 2 },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} /> }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Transactions" focused={focused} /> }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Budgets" focused={focused} /> }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Analytics" focused={focused} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Settings" focused={focused} /> }}
      />
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

  return <MainTabs />
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