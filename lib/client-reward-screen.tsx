import { useCallback, useState, type ReactNode } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { supabase } from './supabase'
import { formTheme as c } from './form-theme'

export function useClientShop() {
  const router = useRouter()
  const [id, setId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  useFocusEffect(useCallback(() => {
    let active = true
    setId(null); setLoading(true); setFailed(false)
    void (async () => {
      try {
        const auth = await supabase.auth.getUser()
        if (!auth.data.user) { if (active) router.replace('/login'); return }
        if (auth.error) throw auth.error
        const profile = await supabase.from('profiles').select('account_type,status,deleted_at').eq('id',auth.data.user.id).single()
        if (profile.error) throw profile.error
        if (profile.data.account_type !== 'CLIENT') { if (active) router.replace('/customer-home'); return }
        if (profile.data.status !== 'ACTIVE' || profile.data.deleted_at) throw new Error('ACCOUNT_NOT_ACTIVE')
        const shop = await supabase.from('clients').select('id,status,approval_status').eq('owner_id',auth.data.user.id).is('deleted_at',null).maybeSingle()
        if (shop.error) throw shop.error
        if (!shop.data || shop.data.status !== 'ACTIVE' || shop.data.approval_status !== 'ACTIVE') {
          if (active) router.replace('/client-apply'); return
        }
        if (active) setId(shop.data.id)
      } catch (e) { console.error(e); if (active) setFailed(true) }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [router]))
  return { clientId:id, checking:loading, accessFailed:failed }
}
export function useRewardText() {
  const { t, i18n } = useTranslation()
  return { tr:(key:string) => String(t(`clientReward.${key}`)),
    common:(key:string) => String(t(`clientApplication.${key}`)), locale:i18n.resolvedLanguage ?? 'en' }
}
export function Page({
  title,
  checking,
  failed,
  children,
}: {
  title: string
  checking: boolean
  failed: boolean
  children: ReactNode
}) {
  const { tr } = useRewardText()

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.content}>
        <Text style={s.brand}>Rewzie</Text>

        <Text style={s.title}>{title}</Text>

        {checking ? (
          <ActivityIndicator color={c.accent} />
        ) : failed ? (
          <Text style={s.error}>
            {tr('accessFailed')}
          </Text>
        ) : (
          children
        )}
      </View>
    </ScrollView>
  )
}
export function Button({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,disabled && {opacity:0.45}]}><Text style={s.buttonText}>{label}</Text></Pressable>
}
export const s=StyleSheet.create({
  page:{flexGrow:1,padding:20,alignItems:'center',paddingBottom:64},content:{width:'100%',maxWidth:800,gap:18},
  brand:{fontSize:25,fontWeight:'800',color:c.text},title:{fontSize:30,fontWeight:'800',color:c.text},
  card:{backgroundColor:c.card,padding:20,borderRadius:22,borderWidth:1,borderColor:c.border,gap:12},
  text:{fontSize:15,color:c.text,lineHeight:23},muted:{fontSize:13,color:c.muted,lineHeight:21},
  balance:{fontSize:25,fontWeight:'800',color:c.accent},error:{color:c.danger,lineHeight:22},notice:{color:c.success,lineHeight:22},
  input:{minHeight:52,padding:14,borderWidth:1,borderColor:c.border,borderRadius:12,color:c.text,backgroundColor:c.card},
  button:{padding:16,minHeight:52,borderRadius:14,backgroundColor:c.accent,alignItems:'center'},buttonText:{color:c.white,fontWeight:'700'},
})
