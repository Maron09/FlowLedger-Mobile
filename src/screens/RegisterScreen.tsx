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


export default function RegisterScreen({ navigation }: any) {
  const { setAuth } = useAuthStore()
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleRegister = async () => {
    if (!form.firstName || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      await setAuth(data.user, data.accessToken, data.refreshToken)

      const { data: workspaces } = await api.get('/workspaces')
      setWorkspaces(workspaces)
      if (workspaces.length > 0) {
        setActiveWorkspace(workspaces[0])
      }
    } catch (err: any) {
      const msg = err.response?.data?.message
      Alert.alert('Registration failed', Array.isArray(msg) ? msg[0] : msg || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
    <KeyboardAvoidingView
      style={styles.container}
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

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start tracking your finances</Text>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={form.firstName}
                onChangeText={(v) => setForm({ ...form, firstName: v })}
                placeholder="John"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={form.lastName}
                onChangeText={(v) => setForm({ ...form, lastName: v })}
                placeholder="Doe"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
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
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
              placeholder="Min. 8 characters"
              placeholderTextColor="rgba(255,255,255,0.2)"
              secureTextEntry={!showPassword}
              autoCapitalize='none'
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
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Sign in</Text>
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
  row: {
    flexDirection: 'row',
    gap: 12,
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