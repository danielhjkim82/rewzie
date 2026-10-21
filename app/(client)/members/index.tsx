import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, Text, TextInput } from 'react-native'
import { fetchMembers, type MemberRow } from '../../../services/clientReward'
import { Button, Page, s, useClientShop, useRewardText } from '../../../lib/client-reward-screen'
import { formTheme as c } from '../../../lib/form-theme'
export default function MemberListScreen() {
  const router=useRouter()
  const {clientId,checking,accessFailed}=useClientShop()
  const {tr,common,locale}=useRewardText()
  const [search,setSearch]=useState('')
  const [query,setQuery]=useState('')
  const [rows,setRows]=useState<MemberRow[]>([])
  const [loading,setLoading]=useState(false)
  const [failed,setFailed]=useState(false)
  const [more,setMore]=useState(false)
  const request=useRef(0)
  const lock=useRef(false)
  const load=useCallback(async (offset=0)=>{
    if (!clientId || lock.current) return
    const ticket=++request.current
    lock.current=true;setLoading(true);setFailed(false)
    try {
      const result=await fetchMembers({clientId,search:query,limit:30,offset})
      if(ticket!==request.current)return
      setRows(old=>offset?[...old,...result]:result);setMore(result.length===30)
    } catch(e){console.error(e);if(ticket===request.current)setFailed(true)}
    finally{if(ticket===request.current){lock.current=false;setLoading(false)}}
  },[clientId,query])
  useEffect(()=>{
    request.current++;lock.current=false;setRows([]);setMore(false);void load()
    return()=>{request.current++;lock.current=false}
  },[load])
  return <Page title={tr('membersTitle')} checking={checking} failed={accessFailed}>
    {clientId && <>
      <TextInput value={search} onChangeText={setSearch} style={s.input} placeholder={tr('memberSearch')} placeholderTextColor={c.muted}
        returnKeyType="search" onSubmitEditing={()=>setQuery(search.trim())}/>
      <Button label={common('search')} disabled={loading} onPress={()=>{if(query===search.trim())void load();else setQuery(search.trim())}}/>
      {failed && <Text style={s.error}>{tr('membersFailed')}</Text>}
      {rows.map(item=><Pressable key={item.card_id} style={s.card} onPress={()=>router.push({pathname:'/(client)/members/[customerId]',params:{clientId,customerId:item.customer_id,cardId:item.card_id,rewardType:item.reward_type,balance:String(item.balance)}})}>
        <Text style={s.text}>{item.customer_id}</Text><Text style={s.muted}>{item.reward_type}</Text>
        <Text style={s.balance}>{Number(item.balance).toLocaleString(locale)} {item.reward_type==='STAMP'?tr('stamps'):'P'}</Text>
        <Text style={s.muted}>{tr('earned')}: {Number(item.lifetime_earned).toLocaleString(locale)} · {tr('redeemed')}: {Number(item.lifetime_redeemed).toLocaleString(locale)}</Text>
      </Pressable>)}
      {loading && <ActivityIndicator color={c.accent}/>}
      {!loading&&!failed&&!rows.length&&<Text style={s.muted}>{tr('noMembers')}</Text>}
      {more&&<Button label={tr('more')} disabled={loading} onPress={()=>void load(rows.length)}/>}
      <Button label={common('refresh')} disabled={loading} onPress={()=>void load()}/>
    </>}
  </Page>
}
