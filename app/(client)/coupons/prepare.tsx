import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, TextInput, View } from 'react-native'
import { fetchCouponIssuePreview, type CouponPrepareRow } from '../../../services/clientReward'
import { Button, Page, s, useClientShop, useRewardText } from '../../../lib/client-reward-screen'
import { formTheme as c } from '../../../lib/form-theme'
export default function CouponPrepareScreen(){
  const {clientId,checking,accessFailed}=useClientShop()
  const {tr,common,locale}=useRewardText()
  const [search,setSearch]=useState('')
  const [query,setQuery]=useState('')
  const [rows,setRows]=useState<CouponPrepareRow[]>([])
  const [loading,setLoading]=useState(false)
  const [failed,setFailed]=useState(false)
  const version=useRef(0)
  const load=useCallback(async()=>{
    if(!clientId)return
    const ticket=++version.current
    setLoading(true);setFailed(false)
    try{const result=await fetchCouponIssuePreview({clientId,search:query});if(ticket===version.current)setRows(result)}
    catch(e){console.error(e);if(ticket===version.current)setFailed(true)}
    finally{if(ticket===version.current)setLoading(false)}
  },[clientId,query])
  useEffect(()=>{setRows([]);void load();return()=>{version.current++}},[load])
  return <Page title={tr('couponsTitle')} checking={checking} failed={accessFailed}>
    {clientId&&<>
      <TextInput style={s.input} value={search} onChangeText={setSearch} placeholder={tr('couponSearch')} placeholderTextColor={c.muted}
        returnKeyType="search" onSubmitEditing={()=>setQuery(search.trim())}/>
      <Button label={common('search')} disabled={loading} onPress={()=>{if(query===search.trim())void load();else setQuery(search.trim())}}/>
      {loading&&<ActivityIndicator color={c.accent}/>}
      {failed&&<Text style={s.error}>{tr('couponsFailed')}</Text>}
      {rows.map(item=><View key={item.coupon_id} style={s.card}>
        <Text style={s.text}>{item.coupon_name}</Text><Text style={s.muted}>{tr('type')}: {item.coupon_type}</Text>
        <Text style={s.text}>{tr('bonusPoints')}: {Number(item.bonus_points??0).toLocaleString(locale)}</Text>
        <Text style={s.text}>{tr('bonusStamps')}: {Number(item.bonus_stamps??0).toLocaleString(locale)}</Text>
        <Text style={s.muted}>{tr('validUntil')}: {item.valid_until?new Date(item.valid_until).toLocaleDateString(locale):tr('noExpiry')}</Text>
        <Text style={s.text}>{tr('eligible')}: {Number(item.eligible_member_count).toLocaleString(locale)}</Text>
      </View>)}
      {!loading&&!failed&&!rows.length&&<Text style={s.muted}>{tr('noCoupons')}</Text>}
      <Text style={s.muted}>{tr('previewOnly')}</Text>
      <Button label={common('refresh')} disabled={loading} onPress={()=>void load()}/>
    </>}
  </Page>
}
