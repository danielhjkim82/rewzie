import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Text, TextInput, View } from 'react-native'
import { adjustPoints, awardPoints, fetchPointHistory, type PointTransactionRow } from '../../../services/clientReward'
import { Button, Page, s, useClientShop, useRewardText } from '../../../lib/client-reward-screen'
import { formTheme as c } from '../../../lib/form-theme'
export default function MemberDetailScreen(){
  const params=useLocalSearchParams<{customerId?:string|string[];rewardType?:string|string[]}>()
  const customerId=Array.isArray(params.customerId)?params.customerId[0]:params.customerId
  const rewardType=Array.isArray(params.rewardType)?params.rewardType[0]:params.rewardType
  const {clientId,checking,accessFailed}=useClientShop()
  const {tr,common,locale}=useRewardText()
  const [amount,setAmount]=useState('')
  const [reason,setReason]=useState('')
  const [balance,setBalance]=useState<number|null>(null)
  const [history,setHistory]=useState<PointTransactionRow[]>([])
  const [busy,setBusy]=useState(false)
  const [historyLoading,setHistoryLoading]=useState(false)
  const [historyFailed,setHistoryFailed]=useState(false)
  const [message,setMessage]=useState<string|null>(null)
  const [pending,setPending]=useState<'minus'|'plus'|null>(null)
  const lock=useRef(false)
  const version=useRef(0)
  const load=useCallback(async(updateBalance=true)=>{
    if(!clientId||!customerId)return
    const ticket=++version.current
    setHistoryLoading(true);setHistoryFailed(false)
    try{
      const rows=await fetchPointHistory({clientId,customerId,limit:30,offset:0})
      if(ticket!==version.current)return
      setHistory(rows)
      if(updateBalance)setBalance(rows.length?Number(rows[0].balance_after):null)
    }catch(e){console.error(e);if(ticket===version.current)setHistoryFailed(true)}
    finally{if(ticket===version.current)setHistoryLoading(false)}
  },[clientId,customerId])
  useEffect(()=>{
    setBalance(null);setHistory([]);setMessage(null);setPending(null);void load()
    return()=>{version.current++}
  },[load])
  function valid(){
    if(!Number.isFinite(Number(amount))||Number(amount)<=0){setMessage('invalidAmount');return false}
    return true
  }
  async function submit(kind:'award'|'minus'|'plus'){
    if(lock.current||!clientId||!customerId||rewardType!=='POINT'||!valid())return
    if(kind!=='award'&&!reason.trim()){setMessage('reasonRequired');return}
    lock.current=true;setBusy(true);setMessage(null);setPending(null)
    try{
      const args={clientId,customerId,amount:kind==='minus'?-Number(amount):Number(amount),reason:reason.trim()}
      const next=kind==='award'?await awardPoints(args):await adjustPoints(args)
      setBalance(next);setAmount('');setReason('');setMessage('saved');await load(false)
    }catch(e){console.error(e);setMessage('saveFailed')}
    finally{lock.current=false;setBusy(false)}
  }
  function confirm(direction:'minus'|'plus'){
    if(!valid())return
    if(!reason.trim()){setMessage('reasonRequired');return}
    setMessage(null);setPending(direction)
  }
  return <Page title={tr('detailTitle')} checking={checking} failed={accessFailed}>
    {clientId&&(!customerId?<Text style={s.error}>{tr('missingMember')}</Text>:<>
      <View style={s.card}><Text selectable style={s.text}>{customerId}</Text><Text style={s.muted}>{tr('balance')}</Text>
        <Text style={s.balance}>{balance===null?'—':balance.toLocaleString(locale)}</Text>
        {balance===null&&<Text style={s.muted}>{tr('balanceUnavailable')}</Text>}
      </View>
      {rewardType!=='POINT'?<Text style={s.muted}>{tr('pointOnly')}</Text>:<View style={s.card}>
        <TextInput style={s.input} editable={!busy} value={amount} onChangeText={v=>{setAmount(v);setPending(null)}} placeholder={tr('amount')} placeholderTextColor={c.muted} keyboardType="decimal-pad"/>
        <TextInput style={s.input} editable={!busy} value={reason} onChangeText={v=>{setReason(v);setPending(null)}} placeholder={tr('reason')} placeholderTextColor={c.muted}/>
        <Button label={tr('award')} disabled={busy} onPress={()=>void submit('award')}/>
        <Button label={tr('subtract')} disabled={busy} onPress={()=>confirm('minus')}/>
        <Button label={tr('adjustAdd')} disabled={busy} onPress={()=>confirm('plus')}/>
        {pending&&<View style={s.card}><Text style={s.text}>{tr(pending==='minus'?'confirmSubtract':'confirmAdd')} {amount}</Text>
          <Text style={s.muted}>{reason.trim()}</Text><Button label={tr('confirm')} disabled={busy} onPress={()=>void submit(pending)}/>
          <Button label={common('close')} disabled={busy} onPress={()=>setPending(null)}/></View>}
      </View>}
      {busy&&<ActivityIndicator color={c.accent}/>}
      {message&&<Text style={message==='saved'?s.notice:s.error}>{tr(message)}</Text>}
      <Text style={s.text}>{tr('history')}</Text>
      {historyLoading&&<ActivityIndicator color={c.accent}/>}
      {historyFailed&&<Text style={s.error}>{tr('historyFailed')}</Text>}
      {history.map((row,index)=><View key={`${row.created_at}-${index}`} style={s.card}>
        <Text style={s.text}>{['EARN','ADJUST','REDEEM'].includes(row.transaction_type)?tr(row.transaction_type):row.transaction_type}</Text>
        <Text style={s.balance}>{row.amount>0?'+':''}{Number(row.amount).toLocaleString(locale)}</Text>
        <Text style={s.text}>{row.reason||tr('noReason')}</Text>
        <Text style={s.muted}>{tr('balanceAfter')}: {Number(row.balance_after).toLocaleString(locale)}</Text>
        <Text style={s.muted}>{new Date(row.created_at).toLocaleString(locale)}</Text>
      </View>)}
      {!historyLoading&&!historyFailed&&!history.length&&<Text style={s.muted}>{tr('noHistory')}</Text>}
      <Text style={s.muted}>{tr('historyLimit')}</Text>
      <Button label={common('refresh')} disabled={busy||historyLoading} onPress={()=>void load()}/>
    </>)}
  </Page>
}
