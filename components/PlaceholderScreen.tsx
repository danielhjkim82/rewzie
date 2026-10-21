import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type Props = {
  titleKey: string
  messageKey: string
}

export default function PlaceholderScreen({
  titleKey,
  messageKey,
}: Props) {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.message}>{t(messageKey)}</Text>

      <Link href="/" asChild>
        <Pressable style={styles.back}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    color: '#64748b',
    maxWidth: 420,
  },
  back: { padding: 12 },
  backText: { color: '#2563eb' },
})