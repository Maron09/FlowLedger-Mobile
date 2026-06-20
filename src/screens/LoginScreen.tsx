import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert
} from 'react-native'
import { useAuthStore } from '../store/auth.store'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function LoginScreen({ navigation }: any) {
  const { setAuth } = useAuthStore()
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      await setAuth(data.user, data.accessToken, data.refreshToken)

      const { data: workspaces } = await api.get('/workspaces')
      setWorkspaces(workspaces)
      const lastId = data.user.lastWorkspaceId
      const active = workspaces.find((w: any) => w.id === lastId) ?? workspaces[0]
      if (active) setActiveWorkspace(active)
    } catch (err: any) {
      const msg = err.response?.data?.message
      Alert.alert('Login failed', Array.isArray(msg) ? msg[0] : msg || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
      <ScrollView contentContainerStyle={[ styles.scroll, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled" style= {{backgroundColor: '#0f1117'}}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>⬡</Text>
          </View>
          <Text style={styles.logoText}>FlowLedger</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
              style={styles.inputFlex}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.2)"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="rgba(255,255,255,0.3)"
              />
            </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkBold}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117',
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#0f1117',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 40,
  },
  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: '#10b981',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  title: {
    color: 'white',
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: 'white',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  link: {
    alignItems: 'center',
    marginTop: 8,
  },
  linkText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  linkBold: {
    color: '#10b981',
    fontWeight: '600',
  },
  forgotLink: { alignItems: 'center', marginTop: 4 },
  forgotText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  inputFlex: {
    flex: 1,
    padding: 14,
    color: 'white',
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
})