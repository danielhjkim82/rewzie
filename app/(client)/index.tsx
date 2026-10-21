import { useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Page,
  s,
  useClientShop,
  useRewardText,
} from '../../lib/client-reward-screen'

export default function ClientHomeScreen() {
  const router = useRouter()

  const {
    clientId,
    checking,
    accessFailed,
  } = useClientShop()

  const { tr, common } = useRewardText()
  const { t } = useTranslation()

  return (
    <Page
      title={tr('homeTitle')}
      checking={checking}
      failed={accessFailed}
    >
      {clientId && (
        <>
          <Text style={s.muted}>
            {common('approval.ACTIVE')}
          </Text>

          <View style={s.card}>
            <Button
              label={tr('membersTitle')}
              onPress={() => {
                router.push('/(client)/members')
              }}
            />

            <Button
              label={tr('couponsTitle')}
              onPress={() => {
                router.push('/(client)/coupons/prepare')
              }}
            />
          </View>

          <Button
            label={t('common.settings')}
            onPress={() => {
                router.push('/settings')
            }}
            />
        </>
      )}
    </Page>
  )
}