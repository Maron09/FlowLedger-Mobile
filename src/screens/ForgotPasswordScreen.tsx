import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert
} from 'react-native'
import api from '../lib/api'

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>⬡</Text>
          </View>
          <Text style={styles.logoText}>FlowLedger</Text>
        </View>

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentIcon}>📬</Text>
            <Text style={styles.sentTitle}>Check your email</Text>
            <Text style={styles.sentSubtitle}>
              We sent a password reset link to {email}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Back to login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a reset link
            </Text>

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

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Send reset link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.link}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.linkText}>
                  Back to <Text style={styles.linkBold}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoBox: { width: 36, height: 36, backgroundColor: '#10b981', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  logoText: { color: 'white', fontSize: 20, fontWeight: '600' },
  title: { color: 'white', fontSize: 26, fontWeight: '600', marginBottom: 6 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32 },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: 'white',
    fontSize: 15,
  },
  button: { backgroundColor: '#10b981', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: 8 },
  linkText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  linkBold: { color: '#10b981', fontWeight: '600' },
  sentBox: { alignItems: 'center', gap: 12 },
  sentIcon: { fontSize: 48, marginBottom: 8 },
  sentTitle: { color: 'white', fontSize: 22, fontWeight: '600' },
  sentSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
})