import { useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import LanguageSelect from '../components/LanguageSelect'
import { supabase } from '../lib/supabase'
import { formTheme as c } from '../lib/form-theme'

export default function SettingsScreen() {
  const router = useRouter()
  const { t } = useTranslation()

  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [logoutFailed, setLogoutFailed] = useState(false)

  function goBack() {
    if (busy) return

    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }

  async function logout() {
    if (lock.current) return

    lock.current = true
    setBusy(true)
    setLogoutFailed(false)

    try {
      const { error } = await supabase.auth.signOut({
        scope: 'local',
      })

      if (error) throw error

      router.replace('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setLogoutFailed(true)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text style={styles.brand}>Rewzie</Text>

        <Text style={styles.title}>
          {t('common.settings')}
        </Text>

        <View style={styles.card}>
          <LanguageSelect />
        </View>

        {logoutFailed && (
          <Text style={styles.error}>
            {t('common.logoutFailed')}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void logout()}
          style={[
            styles.button,
            busy && styles.disabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={c.white} />
          ) : (
            <Text style={styles.buttonText}>
              {t('common.logout')}
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={goBack}
          style={[
            styles.button,
            styles.secondary,
            busy && styles.disabled,
          ]}
        >
          <Text style={styles.secondaryText}>
            {t('common.back')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  page: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    paddingBottom: 64,
  },
  content: {
    width: '100%',
    maxWidth: 800,
    gap: 18,
  },
  brand: {
    fontSize: 25,
    fontWeight: '800',
    color: c.text,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: c.text,
  },
  card: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  button: {
    minHeight: 52,
    padding: 16,
    borderRadius: 14,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: c.white,
    fontWeight: '700',
  },
  secondary: {
    backgroundColor: c.accentLight,
  },
  secondaryText: {
    color: c.text,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  error: {
    color: c.danger,
    lineHeight: 22,
  },
})