import { useRef, useState } from 'react'
import { Link, useRouter } from 'expo-router'
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

import LanguageSelect from '../components/LanguageSelect'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const router = useRouter()
  const { t } = useTranslation()

  const submitting = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  async function handleLogin() {
    if (submitting.current) return

    setErrorKey(null)

    if (!email.trim() || !password) {
      setErrorKey('login.required')
      return
    }

    submitting.current = true
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        console.error('Supabase login error:', {
            code: error.code,
            status: error.status,
            message: error.message,
        })

        setErrorKey(
            error.code === 'email_not_confirmed'
            ? 'login.emailNotConfirmed'
            : 'login.failed',
        )
        return
      }

      if (!data.user || !data.session) {
        setErrorKey('login.failed')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', data.user.id)
        .single()

      if (
        profileError ||
        !profile ||
        !['CLIENT', 'CUSTOMER'].includes(profile.account_type)
      ) {
        console.error(
          'Unable to load account type:',
          profileError ?? 'Missing or unsupported account type',
        )

        setErrorKey('login.profileFailed')
        return
      }

      setPassword('')

      if (profile.account_type === 'CLIENT') {
        router.replace('/client-apply')
      } else {
        router.replace('/customer-home')
      }
    } catch (error) {
      console.error('Login failed:', error)
      setErrorKey('login.failed')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text style={styles.brand}>Rewzie</Text>
        <Text style={styles.title}>{t('login.title')}</Text>

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
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder={t('signup.password')}
          accessibilityLabel={t('signup.password')}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          secureTextEntry
          editable={!loading}
          returnKeyType="go"
          onSubmitEditing={() => void handleLogin()}
        />

        {errorKey && (
          <Text accessibilityRole="alert" style={styles.error}>
            {t(errorKey)}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          disabled={loading}
          onPress={() => void handleLogin()}
          style={[styles.button, loading && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('login.submit')}</Text>
          )}
        </Pressable>

        <Link href="/" asChild>
          <Pressable style={styles.back}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>
        </Link>

        <LanguageSelect />
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
  brand: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#334155',
    marginBottom: 16,
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
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#dc2626',
  },
  back: {
    alignItems: 'center',
    padding: 12,
  },
  backText: {
    color: '#2563eb',
  },
})