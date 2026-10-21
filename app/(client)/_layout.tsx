import { Stack } from 'expo-router'
import { formTheme as c } from '../../lib/form-theme'

export default function ClientLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: c.background,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="members/index" />
      <Stack.Screen name="members/[customerId]" />
      <Stack.Screen name="coupons/prepare" />
    </Stack>
  )
}