import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { I18nextProvider } from 'react-i18next'

import { i18n, initializeI18n } from '../lib/i18n'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true

    initializeI18n()
      .then(() => {
        if (active) setReady(true)
      })
      .catch((error) => {
        console.error(error)
        if (active) setFailed(true)
      })

    return () => {
      active = false
    }
  }, [])

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        {failed ? (
          <Text>Unable to start Rewzie. Please restart the app.</Text>
        ) : (
          <ActivityIndicator size="large" color="#2563eb" />
        )}
      </View>
    )
  }

  return (
    <I18nextProvider i18n={i18n}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </I18nextProvider>
  )
}