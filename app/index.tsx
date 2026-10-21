import { Link } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import LanguageSelect from '../components/LanguageSelect'

export default function WelcomeScreen() {
  const { t } = useTranslation()

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rewzie</Text>

        <Text style={styles.subtitle}>
          {t('welcome.subtitle')}
        </Text>

        <Link
          href={{
            pathname: '/sign-up',
            params: { role: 'CUSTOMER' },
          }}
          asChild
        >
          <Pressable
            style={StyleSheet.flatten([
              styles.button,
              styles.customer,
            ])}
          >
            <Text style={styles.buttonText}>
              {t('welcome.customer')}
            </Text>
          </Pressable>
        </Link>

        <Link
          href={{
            pathname: '/sign-up',
            params: { role: 'CLIENT' },
          }}
          asChild
        >
          <Pressable
            style={StyleSheet.flatten([
              styles.button,
              styles.client,
            ])}
          >
            <Text style={styles.buttonText}>
              {t('welcome.client')}
            </Text>
          </Pressable>
        </Link>
        <Link href="/login" asChild>
          <Pressable style={{ padding: 12 }}>
            <Text
              style={{
                color: '#2563eb',
                textAlign: 'center',
              }}
            >
              {t('login.link')}
            </Text>
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
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 17,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  customer: {
    backgroundColor: '#2563eb',
  },
  client: {
    backgroundColor: '#059669',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
})