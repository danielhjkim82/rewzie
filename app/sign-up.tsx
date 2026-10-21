import { useState } from 'react'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { supabase } from '../lib/supabase'

export default function SignUp() {
  const { role } = useLocalSearchParams<{ role?: string }>()
  const router = useRouter()
  const { t, i18n } = useTranslation()

  const accountType = role === 'CLIENT' ? 'CLIENT' : 'CUSTOMER'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [noticeKey, setNoticeKey] = useState<string | null>(null)

  async function handleSignUp() {
    if (loading || noticeKey) return

    setErrorKey(null)
    setNoticeKey(null)

    if (!email.trim() || !password || !displayName.trim()) {
      setErrorKey('signup.required')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            account_type: accountType,
            display_name: displayName.trim(),
            locale: i18n.resolvedLanguage ?? 'en',
          },
        },
      })

      if (error) throw error

      if (!data.session) {
        setNoticeKey('signup.checkEmail')
        return
      }

      if (accountType === 'CLIENT') {
        router.replace('/client-apply')
      } else {
        router.replace('/customer-home')
      }
    } catch (error) {
      console.error('Sign up failed:', error)
      setErrorKey('signup.failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          {t(
            accountType === 'CLIENT'
              ? 'signup.clientTitle'
              : 'signup.customerTitle',
          )}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={t('signup.displayName')}
          accessibilityLabel={t('signup.displayName')}
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
          editable={!loading && !noticeKey}
        />

        <TextInput
          style={styles.input}
          placeholder={t('signup.email')}
          accessibilityLabel={t('signup.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading && !noticeKey}
        />

        <TextInput
          style={styles.input}
          placeholder={t('signup.password')}
          accessibilityLabel={t('signup.password')}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          autoComplete="new-password"
          editable={!loading && !noticeKey}
        />

        {errorKey && (
          <Text style={styles.error}>{t(errorKey)}</Text>
        )}

        {noticeKey && (
          <Text style={styles.notice}>{t(noticeKey)}</Text>
        )}

        <Pressable
          style={[
            styles.button,
            (loading || !!noticeKey) && styles.disabled,
          ]}
          disabled={loading || !!noticeKey}
          onPress={() => void handleSignUp()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('signup.submit')}</Text>
          )}
        </Pressable>

        <Link href="/" asChild>
          <Pressable style={styles.back}>
            <Text style={styles.backText}>{t('signup.back')}</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#dc2626' },
  notice: { color: '#047857' },
  back: { alignItems: 'center', padding: 12 },
  backText: { color: '#2563eb' },
})