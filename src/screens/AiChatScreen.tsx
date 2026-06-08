import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWorkspaceStore } from '../store/workspace.store'
import api from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_PROMPTS = [
  'Where am I spending the most?',
  'How is my savings rate?',
  'Am I on track with my budgets?',
  'Give me tips to save more',
  'How does my income compare to expenses?',
]

export default function AiChatScreen({ navigation }: any) {
  const { activeWorkspace } = useWorkspaceStore()
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages])

  const sendMessage = async (text?: string) => {
    const message = text ?? input.trim()
    if (!message || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setLoading(true)

    try {
      const { data } = await api.post(`/w/${activeWorkspace!.id}/ai/chat`, { message })
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSub}>Powered by Claude</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.botAvatar}>
              <Text style={{ fontSize: 24 }}>🤖</Text>
            </View>
            <Text style={styles.emptyTitle}>Hi! I'm your AI financial assistant</Text>
            <Text style={styles.emptySubtitle}>
              I can analyze your spending, income, and budgets. Ask me anything!
            </Text>

            <Text style={styles.suggestedLabel}>Suggested questions</Text>
            <View style={styles.suggestedList}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.suggestedChip}
                  onPress={() => sendMessage(prompt)}
                >
                  <Text style={styles.suggestedText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <>
            {messages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.messageRow,
                  msg.role === 'user' ? styles.messageRowUser : styles.messageRowBot,
                ]}
              >
                {msg.role === 'assistant' && (
                  <View style={styles.botAvatarSmall}>
                    <Text style={{ fontSize: 14 }}>🤖</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
                  ]}
                >
                  <Text style={[
                    styles.bubbleText,
                    msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
                  ]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}

            {loading && (
              <View style={[styles.messageRow, styles.messageRowBot]}>
                <View style={styles.botAvatarSmall}>
                  <Text style={{ fontSize: 14 }}>🤖</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleBot]}>
                  <View style={styles.typingDots}>
                    <View style={[styles.dot, { opacity: 0.3 }]} />
                    <View style={[styles.dot, { opacity: 0.6 }]} />
                    <View style={[styles.dot, { opacity: 1 }]} />
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your finances..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backText: { color: '#10b981', fontSize: 16, width: 50 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 15, fontWeight: '600' },
  headerSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: 20, paddingBottom: 8 },
  emptyState: { alignItems: 'center', paddingTop: 20 },
  botAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16,185,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  suggestedLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, alignSelf: 'flex-start' },
  suggestedList: { width: '100%', gap: 8 },
  suggestedChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
  },
  suggestedText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowBot: { justifyContent: 'flex-start' },
  botAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: 'rgba(16,185,129,0.15)', borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: '#0a0d12', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  bubbleTextUser: { color: 'rgba(255,255,255,0.85)' },
  bubbleTextBot: { color: 'rgba(255,255,255,0.7)' },
  typingDots: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0f1117',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: { color: 'white', fontSize: 20, fontWeight: '600', marginTop: -2 },
})