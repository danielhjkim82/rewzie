import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import AppSelect from './AppSelect'
import { getAppLanguages, setAppLanguage } from '../lib/i18n'
import { formTheme as c } from '../lib/form-theme'

export default function LanguageSelect() {
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  async function change(code: string) {
    setBusy(true); setFailed(false)
    try { await setAppLanguage(code) }
    catch (error) { console.error(error); setFailed(true) }
    finally { setBusy(false) }
  }
  return <View style={styles.container}>
    <Text style={styles.label}>{t('welcome.language')}</Text>
    <AppSelect value={i18n.resolvedLanguage ?? 'en'} label={t('welcome.language')}
      placeholder={t('welcome.language')} disabled={busy}
      options={getAppLanguages().map(language => ({ value: language.code, label: language.native_name }))}
      onChange={code => void change(code)} />
    {failed && <Text accessibilityRole="alert" style={styles.error}>{t('common.languageFailed')}</Text>}
  </View>
}
const styles = StyleSheet.create({
  container: { width: '100%', gap: 8, marginTop: 12 },
  label: { color: c.muted, fontSize: 13 }, error: { color: c.danger, fontSize: 12 },
})
