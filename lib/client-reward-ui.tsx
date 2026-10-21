import { useCallback, useState, type ReactNode } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import LanguageSelect from '../components/LanguageSelect'
import { supabase } from './supabase'
import { formTheme as c } from './form-theme'

// Reads the owned shop, never trusts a route clientId as authorization.
export function useRewardClient() {
  const router = useRouter()
  const [clientId, setClientId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState(false)
  useFocusEffect(useCallback(() => {
    let active = true
    setChecking(true); setError(false); setClientId(null)
    void (async () => {
      try {
        const auth = await supabase.auth.getUser()
        if (!auth.data.user) { if (active) router.replace('/login'); return }
        if (auth.error) throw auth.error
        const profile = await supabase.from('profiles').select('account_type,status,deleted_at')
          .eq('id', auth.data.user.id).single()
        if (profile.error) throw profile.error
        if (profile.data.account_type !== 'CLIENT') {
          if (active) router.replace('/customer-home'); return
        }
        if (profile.data.status !== 'ACTIVE' || profile.data.deleted_at) throw new Error('ACCOUNT_NOT_ACTIVE')
        const shop = await supabase.from('clients').select('id,status,approval_status')
          .eq('owner_id', auth.data.user.id).is('deleted_at', null).maybeSingle()
        if (shop.error) throw shop.error
        if (!shop.data || shop.data.status !== 'ACTIVE' || shop.data.approval_status !== 'ACTIVE') {
          if (active) router.replace('/client-apply'); return
        }
        if (active) setClientId(shop.data.id)
      } catch (e) { console.error('Reward client load failed:', e); if (active) setError(true) }
      finally { if (active) setChecking(false) }
    })()
    return () => { active = false }
  }, [router]))
  return { clientId, checking, error }
}

export function useRewardText() {
  const { t, i18n } = useTranslation()
  return { tr: (key: string) => String(t(`clientReward.${key}`)), locale: i18n.resolvedLanguage ?? 'en' }
}
export function Page({ title, children }: { title: string; children: ReactNode }) {
  return <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={s.page}
    keyboardShouldPersistTaps="handled"><View style={s.content}>
    <View style={s.top}><Text style={s.brand}>Rewzie</Text><LanguageSelect /></View>
    <Text style={s.title}>{title}</Text>{children}</View></ScrollView>
}
export function Button({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[s.button, secondary && s.secondary, disabled && { opacity: 0.45 }]}>
    <Text style={[s.buttonText, secondary && { color: c.text }]}>{label}</Text></Pressable>
}
export function Gate({ checking, error }: { checking: boolean; error: boolean }) {
  const { tr } = useRewardText()
  return checking ? <ActivityIndicator color={c.accent} /> : error ? <Text style={s.error}>{tr('accessFailed')}</Text> : null
}
export const s = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', padding: 20, paddingBottom: 64 },
  content: { width: '100%', maxWidth: 800, gap: 18 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  brand: { color: c.text, fontSize: 25, fontWeight: '800' },
  title: { color: c.text, fontSize: 30, fontWeight: '800' },
  card: { backgroundColor: c.card, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: c.border, gap: 12 },
  text: { color: c.text, fontSize: 15, lineHeight: 23 },
  muted: { color: c.muted, fontSize: 13, lineHeight: 21 },
  balance: { color: c.accent, fontSize: 26, fontWeight: '800' },
  input: { minHeight: 52, padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12, color: c.text, backgroundColor: c.card },
  error: { color: c.danger, lineHeight: 22 },
  notice: { color: c.success, lineHeight: 22 },
  button: { padding: 16, minHeight: 52, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: c.white, fontWeight: '700', textAlign: 'center' },
  secondary: { backgroundColor: c.accentLight },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
})
