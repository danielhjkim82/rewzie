import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FlatList, Modal, Pressable, StyleSheet, Text, TextInput,
  useWindowDimensions, View,
} from 'react-native'
import { formTheme as c } from '../lib/form-theme'

export type SelectOption = { value: string; label: string }
type Props = {
  value: string; options: SelectOption[]; label: string
  placeholder: string; disabled?: boolean; invalid?: boolean
  onChange: (value: string) => void
}
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function AppSelect({ value, options, label, placeholder, disabled, invalid, onChange }: Props) {
  const { t } = useTranslation()
  const { height } = useWindowDimensions()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find(option => option.value === value)
  const filtered = useMemo(() => options.filter(option =>
    normalize(option.label).includes(normalize(query)) ||
    normalize(option.value).includes(normalize(query)),
  ), [options, query])

  function close() { setOpen(false); setQuery('') }

  return <>
    <Pressable disabled={disabled} onPress={() => { setQuery(''); setOpen(true) }}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, expanded: open }}
      style={[styles.trigger, invalid && styles.invalid, disabled && styles.disabled]}>
      <Text numberOfLines={1} style={[styles.value, !selected && styles.placeholder]}>
        {selected?.label ?? placeholder}
      </Text>
      <Text style={styles.arrow}>⌄</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close}
          accessibilityRole="button" accessibilityLabel={t('clientApplication.close')} />
        <View style={[styles.sheet, { maxHeight: Math.max(220, Math.min(height * 0.8, 600)) }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title}>{label}</Text>
            <Pressable onPress={close} accessibilityRole="button"
              accessibilityLabel={t('clientApplication.close')} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <TextInput value={query} onChangeText={setQuery} style={styles.search}
            placeholder={t('clientApplication.search')} placeholderTextColor={c.muted}
            accessibilityLabel={t('clientApplication.search')} autoCorrect={false} />
          <FlatList data={filtered} keyExtractor={item => item.value}
            keyboardShouldPersistTaps="handled" style={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('clientApplication.noOptions')}</Text>}
            renderItem={({ item }) => <Pressable accessibilityRole="button"
              accessibilityState={{ selected: item.value === value }}
              onPress={() => { onChange(item.value); close() }}
              style={[styles.option, item.value === value && styles.selected]}>
              <Text style={styles.optionLabel}>{item.label}</Text>
              {item.value === value && <Text style={styles.check}>✓</Text>}
            </Pressable>} />
        </View>
      </View>
    </Modal>
  </>
}
const styles = StyleSheet.create({
  trigger: { minHeight: 52, borderWidth: 1, borderColor: c.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
    gap: 8, backgroundColor: c.card },
  value: { flex: 1, fontSize: 15, color: c.text }, placeholder: { color: c.muted },
  arrow: { fontSize: 22, color: c.muted }, invalid: { borderColor: c.danger }, disabled: { opacity: 0.5 },
  overlay: { flex: 1, backgroundColor: 'rgba(40,28,20,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 500, backgroundColor: c.card, borderRadius: 20, padding: 18, flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text },
  close: { padding: 8 }, closeText: { fontSize: 25, color: c.muted },
  search: { borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, color: c.text, marginBottom: 10 },
  list: { flexGrow: 0, flexShrink: 1 },
  option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10 },
  optionLabel: { flex: 1, color: c.text, fontSize: 15 }, selected: { backgroundColor: c.accentLight },
  check: { color: c.accent }, empty: { color: c.muted, padding: 20, textAlign: 'center' },
})
