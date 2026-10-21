import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet,
  Text, TextInput, useWindowDimensions, View,
} from 'react-native'
import AppSelect from '../components/AppSelect'
import LanguageSelect from '../components/LanguageSelect'
import { supabase } from '../lib/supabase'
import { formTheme as c } from '../lib/form-theme'
import { pickAndUploadImage, signImage, type ClientPhoto, type UploadRecord } from '../lib/client-images'

type Names = Record<string, string>
type Country = { code: string; names: Names }
type Region = { id: string; code: string; country_code: string; names: Names }
type Form = {
  name: string; business_type: string; country: string; country_region_id: string
  city: string; postal_code: string; address_line1: string; address_line2: string
  phone: string; description: string
}
type Application = {
  id: string; name: string; approval_status: string; status: string
  review_reason: string | null; rejection_reason: string | null
  updated_at: string; country: string; province: string | null
} & Partial<Form>
type ErrorMap = Record<string, string>
const empty: Form = {
  name: '', business_type: 'RESTAURANT', country: 'CA', country_region_id: '', city: '',
  postal_code: '', address_line1: '', address_line2: '', phone: '', description: '',
}
const limits: Partial<Record<keyof Form, number>> = {
  name: 150, city: 100, postal_code: 20, address_line1: 250,
  address_line2: 250, phone: 40, description: 2000,
}
const types = ['RESTAURANT','CAFE','BAKERY','TAKEOUT','OTHER']
const columns = 'id,name,business_type,country,country_region_id,province,city,postal_code,address_line1,address_line2,phone,description,approval_status,status,review_reason,rejection_reason,updated_at'
const errorCodes: Record<string,string> = {
  LOGIN_REQUIRED: 'loginRequired', CLIENT_ACCOUNT_REQUIRED: 'clientRequired',
  PROFILE_REQUIRED: 'clientRequired', ACCOUNT_NOT_ACTIVE: 'accountInactive',
  CLIENT_APPLICATION_ALREADY_EXISTS: 'alreadyExists', STALE_CLIENT: 'stale',
  APPLICATION_NOT_EDITABLE: 'notEditable', CLIENT_NOT_ACTIVE: 'notEditable',
  CLIENT_NOT_FOUND_OR_NOT_OWNED: 'notEditable', OWNER_MEMBERSHIP_REQUIRED: 'notEditable',
  INVALID_NAME: 'invalidInput', INVALID_BUSINESS_TYPE: 'invalidInput',
  INVALID_COUNTRY: 'countryUnavailable', COUNTRY_NOT_AVAILABLE: 'countryUnavailable',
  REGION_REQUIRED: 'regionUnavailable', REGION_NOT_AVAILABLE: 'regionUnavailable',
  ADDRESS_REQUIRED: 'required', CITY_REQUIRED: 'required', INPUT_TOO_LONG: 'invalidInput',
  PRIMARY_PHOTO_REQUIRED: 'primaryRequired', PHOTO_PERMISSION_REQUIRED: 'photoPermission',
  PHOTO_READ_FAILED: 'photoFailed', INVALID_IMAGE_SIZE: 'photoSize',
  INVALID_IMAGE_TYPE: 'photoFailed', PHOTO_UPLOAD_NOT_COMPLETE: 'photoIncomplete',
  IMAGE_OBJECT_NOT_FOUND: 'photoIncomplete', PHOTO_NOT_FOUND_OR_NOT_OWNED: 'photoIncomplete',
  IMAGE_SIZE_MISMATCH: 'photoFailed', IMAGE_TYPE_MISMATCH: 'photoFailed',
  IMAGE_METADATA_INVALID: 'photoFailed', TOO_MANY_PHOTOS: 'photoLimit',
  DUPLICATE_PHOTO: 'photoFailed', PHOTO_ALREADY_ATTACHED: 'photoFailed',
  IMAGE_UPLOAD_RATE_LIMITED: 'photoRateLimited', TOO_MANY_UNATTACHED_IMAGES: 'photoDraftLimit',
  UPLOAD_EXPIRED: 'photoExpired', UPLOAD_NOT_FOUND_OR_NOT_OWNED: 'photoFailed',
  REQUEST_DATA_CONFLICT: 'photoFailed', REQUEST_ID_CONFLICT: 'submitFailed',
}

export default function ClientApply() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const { width } = useWindowDimensions()
  const wide = width >= 680
  const tr = (key: string) => t(`clientApplication.${key}`)
  const [form, setForm] = useState<Form>({ ...empty })
  const [application, setApplication] = useState<Application | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [photos, setPhotos] = useState<(ClientPhoto | null)[]>([null,null,null,null])
  const [errors, setErrors] = useState<ErrorMap>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState<number | null>(null)
  const lock = useRef(false)
  const userId = useRef<string | null>(null)
  const scroll = useRef<ScrollView>(null)
  const scrollY = useRef(0)
  const fieldViews = useRef<Record<string, View | null>>({})
  const disabled = loading || busy || photoBusy !== null
  const editable = application?.status === 'ACTIVE' &&
    ['PENDING','UNDER_REVIEW'].includes(application.approval_status)
  const showForm = ready && !loading && (!application || editing)
  const language = i18n.resolvedLanguage ?? 'en'
  const nameFor = (names: Names) => names[language] ?? names[language.split('-')[0]] ?? names.en ?? ''
  const availableRegions = regions.filter(region => region.country_code === form.country)

  const load = useCallback(async () => {
    setLoading(true); setReady(false); setGlobalError(null)
    try {
      const auth = await supabase.auth.getUser()
      if (auth.error || !auth.data.user) { router.replace('/login'); return false }
      userId.current = auth.data.user.id
      const profile = await supabase.from('profiles').select('account_type,status,deleted_at')
        .eq('id', auth.data.user.id).single()
      if (profile.error) throw profile.error
      if (profile.data.account_type !== 'CLIENT') { setGlobalError('clientRequired'); return false }
      if (profile.data.status !== 'ACTIVE' || profile.data.deleted_at) { setGlobalError('accountInactive'); return false }
      const [countryResult, regionResult, clientResult] = await Promise.all([
        supabase.from('app_countries').select('code,names').eq('is_active',true).order('sort_order').order('code'),
        supabase.from('app_country_regions').select('id,code,country_code,names').eq('is_active',true).order('sort_order').order('code'),
        supabase.from('clients').select(columns).eq('owner_id',auth.data.user.id).is('deleted_at',null).maybeSingle(),
      ])
      if (countryResult.error) throw countryResult.error
      if (regionResult.error) throw regionResult.error
      if (clientResult.error) throw clientResult.error
      const countryRows = (countryResult.data ?? []) as Country[]
      const regionRows = (regionResult.data ?? []) as Region[]
      const app = clientResult.data as Application | null
      if (
        app?.status === 'ACTIVE' &&
        app.approval_status === 'ACTIVE'
      ) {
        router.replace('/(client)')
        return true
      }
      const next = { ...empty }
      if (app) {
        for (const key of Object.keys(next) as (keyof Form)[]) next[key] = String(app[key] ?? '')
        // Legacy province text is not silently guessed into a region ID.
      } else if (!countryRows.some(country => country.code === next.country)) {
        next.country = countryRows[0]?.code ?? ''
      }
      const nextPhotos: (ClientPhoto | null)[] = [null,null,null,null]
      if (app) {
        const links = await supabase.from('client_photos').select('slot,upload_id').eq('client_id',app.id).order('slot')
        if (links.error) throw links.error
        if (links.data?.length) {
          const uploads = await supabase.from('client_image_uploads').select('id,bucket_id,storage_path')
            .in('id',links.data.map(link => link.upload_id)).eq('owner_id',auth.data.user.id)
          if (uploads.error) throw uploads.error
          await Promise.all(links.data.map(async link => {
            const upload = (uploads.data as UploadRecord[]).find(item => item.id === link.upload_id)
            if (!upload) throw new Error('PHOTO_NOT_FOUND_OR_NOT_OWNED')
            nextPhotos[link.slot] = await signImage(upload)
          }))
        }
      }
      setCountries(countryRows); setRegions(regionRows); setApplication(app)
      setForm(next); setPhotos(nextPhotos); setEditing(false); setErrors({}); setReady(true)
      return true
    } catch (error) {
      console.error('Load application failed:', error)
      setGlobalError('loadFailed'); return false
    } finally { setLoading(false) }
  }, [router])
  useEffect(() => { void load() }, [load])

  function validate(value: Form, images = photos): ErrorMap {
    const result: ErrorMap = {}
    if (!images[0]) result.photo0 = 'primaryRequired'
    for (const key of ['name','business_type','country','country_region_id','city','address_line1'] as (keyof Form)[]) {
      if (!value[key].trim()) result[key] = 'required'
    }
    if (value.country && !countries.some(item => item.code === value.country)) result.country = 'countryUnavailable'
    if (value.country_region_id && !regions.some(item => item.id === value.country_region_id && item.country_code === value.country)) {
      result.country_region_id = 'regionUnavailable'
    }
    if (!types.includes(value.business_type)) result.business_type = 'invalidInput'
    for (const key of Object.keys(limits) as (keyof Form)[]) {
      if (value[key].length > (limits[key] ?? Infinity)) result[key] = 'invalidInput'
    }
    return result
  }
  function setValue(key: keyof Form, value: string) {
    const next = { ...form, [key]: value }
    if (key === 'country') next.country_region_id = ''
    setForm(next)
    setErrors(previous => {
      const updated = { ...previous }
      if (previous[key]) {
        const message = validate(next)[key]
        if (message) updated[key] = message; else delete updated[key]
      }
      if (key === 'country') delete updated.country_region_id
      return updated
    })
    setNotice(null)
  }
  function blur(key: keyof Form) {
    const message = validate(form)[key]
    setErrors(previous => {
      const next = { ...previous }
      if (message) next[key] = message; else delete next[key]
      return next
    })
  }
  function reveal(key: string) {
    setTimeout(() => {
      fieldViews.current[key]?.measureInWindow((_x, y) => {
        scroll.current?.measureInWindow((_sx, top) => {
          scroll.current?.scrollTo({ y: Math.max(0,scrollY.current + y - top - 24), animated: true })
        })
      })
    }, 80)
  }
  async function changePhoto(slot: number) {
    if (lock.current) return
    lock.current = true; setPhotoBusy(slot)
    try {
      const image = await pickAndUploadImage()
      if (!image) return
      setPhotos(previous => previous.map((old,index) => index === slot ? image : old))
      setErrors(previous => { const next = { ...previous }; delete next[`photo${slot}`]; return next })
    } catch (error) {
      console.error('Image upload failed:',error)
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
      setErrors(previous => ({ ...previous, [`photo${slot}`]: errorCodes[message] ?? 'photoFailed' }))
    } finally { lock.current = false; setPhotoBusy(null) }
  }
  function removePhoto(slot: number) {
    if (disabled) return
    setPhotos(previous => previous.map((photo,index) => index === slot ? null : photo))
    setErrors(previous => {
      const next = { ...previous }
      if (slot === 0) next.photo0 = 'primaryRequired'; else delete next[`photo${slot}`]
      return next
    })
  }
  async function submit() {
    if (lock.current || !ready || !userId.current) return
    const found = validate(form)
    setErrors(found); setGlobalError(null); setNotice(null)
    const order = ['photo0','name','business_type','country','country_region_id','city','postal_code','address_line1','address_line2','phone','description']
    const first = order.find(key => found[key])
    if (first) { reveal(first); return }
    lock.current = true; setBusy(true)
    try {
      const { country_region_id, ...values } = form
      const payload = Object.fromEntries(Object.entries(values).map(([key,value]) => [key,value.trim()]))
      const photoIds = photos.filter((photo): photo is ClientPhoto => photo !== null).map(photo => photo.id)
      if (application) {
        const result = await supabase.rpc('client_resubmit_application_v2', {
          p_client_id: application.id, p_expected_updated_at: application.updated_at,
          p_data: payload, p_country_region_id: country_region_id, p_photo_ids: photoIds,
        })
        if (result.error) throw result.error
      } else {
        const key = `rewzie.application.v2.request.${userId.current}`
        let requestId = await AsyncStorage.getItem(key)
        if (!requestId) { requestId = Crypto.randomUUID(); await AsyncStorage.setItem(key,requestId) }
        const result = await supabase.rpc('client_apply_v2', {
          p_data: payload, p_request_id: requestId, p_country_region_id: country_region_id, p_photo_ids: photoIds,
        })
        if (result.error) throw result.error
      }
      const refreshed = await load()
      if (!refreshed) setGlobalError(null)
      setNotice(refreshed ? 'submitted' : 'refreshAfterSubmit')
      scroll.current?.scrollTo({ y: 0, animated: true })
    } catch (error) {
      console.error('Application submission failed:',error)
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
      const fieldFor: Record<string,string> = {
        INVALID_NAME:'name', INVALID_BUSINESS_TYPE:'business_type', COUNTRY_NOT_AVAILABLE:'country',
        INVALID_COUNTRY:'country', REGION_REQUIRED:'country_region_id', REGION_NOT_AVAILABLE:'country_region_id',
        ADDRESS_REQUIRED:'address_line1', CITY_REQUIRED:'city', PRIMARY_PHOTO_REQUIRED:'photo0',
      }
      const key = errorCodes[message] ?? 'submitFailed'
      if (fieldFor[message]) { setErrors(previous => ({ ...previous,[fieldFor[message]]: key })); reveal(fieldFor[message]) }
      else setGlobalError(key)
    } finally { lock.current = false; setBusy(false) }
  }
  async function logout() {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try {
      const result = await supabase.auth.signOut({ scope: 'local' })
      if (result.error) throw result.error
      router.replace('/login')
    } catch (error) { console.error(error); setGlobalError('logoutFailed') }
    finally { lock.current = false; setBusy(false) }
  }
  function action(label: string, onPress: () => void, secondary = false) {
    return <Pressable accessibilityRole="button" disabled={disabled}
      onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{tr(label)}</Text>
    </Pressable>
  }
  function field(key: keyof Form, required = false, content?: ReactNode, full = false) {
    return <View key={key} ref={node => { fieldViews.current[key] = node }} collapsable={false}
      style={[styles.field, wide && !full && styles.half]}>
      <Text style={styles.label}>{tr(key)}{required && <Text style={styles.star}> *</Text>}</Text>
      {content ?? <TextInput value={form[key]} editable={!disabled}
        accessibilityLabel={tr(key)} placeholderTextColor={c.muted}
        maxLength={limits[key]} onChangeText={value => setValue(key,value)} onBlur={() => blur(key)}
        multiline={key === 'description'} keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
        style={[styles.input,key === 'description' && styles.multiline,!!errors[key] && styles.invalid]} />}
      {!!errors[key] && <Text accessibilityRole="alert" style={styles.errorText}>{tr(errors[key])}</Text>}
    </View>
  }
  function photoTile(slot: number) {
    const photo = photos[slot]
    const primary = slot === 0
    return <View key={slot} ref={node => { fieldViews.current[`photo${slot}`] = node }} collapsable={false}
      style={primary ? styles.primaryPhoto : styles.promoPhoto}>
      <Pressable accessibilityRole="button" disabled={disabled}
        accessibilityLabel={tr(primary ? 'primaryPhoto' : 'promoPhotos')}
        onPress={() => void changePhoto(slot)}
        style={[styles.photoBox, primary && styles.primaryBox,!!errors[`photo${slot}`] && styles.invalid]}>
        {photo ? <Image source={{ uri: photo.uri }} resizeMode="cover" style={styles.image} /> : <>
          <Text style={styles.plus}>+</Text>
          <Text style={styles.photoHint}>{tr(primary ? 'addPrimary' : 'addPhoto')}</Text>
        </>}
        {photoBusy === slot && <View style={styles.photoOverlay}><ActivityIndicator color={c.white} /></View>}
      </Pressable>
      {photo && <View style={styles.photoActions}>
        <Pressable disabled={disabled} onPress={() => void changePhoto(slot)} style={styles.smallAction}>
          <Text style={styles.link}>{tr('replace')}</Text>
        </Pressable>
        <Pressable disabled={disabled} onPress={() => removePhoto(slot)} style={styles.smallAction}>
          <Text style={styles.errorText}>{tr('remove')}</Text>
        </Pressable>
      </View>}
      {!!errors[`photo${slot}`] && <Text accessibilityRole="alert" style={styles.errorText}>{tr(errors[`photo${slot}`])}</Text>}
    </View>
  }
  const approvalLabel = application && ['PENDING','UNDER_REVIEW','ACTIVE','REJECTED','SUSPENDED'].includes(application.approval_status)
    ? tr(`approval.${application.approval_status}`) : tr('unknown')

  return <ScrollView ref={scroll} onScroll={event => { scrollY.current = event.nativeEvent.contentOffset.y }}
    scrollEventThrottle={16} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <View style={styles.content}>
      <View style={styles.topbar}>
        <Text style={styles.brand}>Rewzie</Text>
        <Pressable disabled={disabled} onPress={() => void logout()} style={styles.smallAction}>
          <Text style={styles.link}>{tr('logout')}</Text>
        </Pressable>
      </View>
      <Text style={styles.eyebrow}>{tr('eyebrow')}</Text>
      <Text style={styles.title}>{tr('title')}</Text>
      <Text style={styles.subtitle}>{tr('subtitle')}</Text>
      {loading && <ActivityIndicator color={c.accent} size="large" />}
      {!!globalError && <Text accessibilityRole="alert" style={styles.errorBanner}>{tr(globalError)}</Text>}
      {!!notice && <Text style={styles.notice}>{tr(notice)}</Text>}
      {ready && !loading && application && <View style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.sectionTitle}>{application.name}</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{approvalLabel}</Text></View>
        </View>
        <Text style={styles.help}>{tr('accountStatus')}: {tr(`account.${['ACTIVE','INACTIVE','DELETED'].includes(application.status) ? application.status : 'unknown'}`)}</Text>
        <Text style={styles.help}>{countries.find(item => item.code === application.country)
          ? nameFor(countries.find(item => item.code === application.country)!.names) : application.country}
          {' · '}{regions.find(item => item.id === application.country_region_id)
            ? nameFor(regions.find(item => item.id === application.country_region_id)!.names) : application.province ?? ''}</Text>
        {!!(application.review_reason || application.rejection_reason) && <View style={styles.review}>
          <Text style={styles.label}>{tr('reviewReason')}</Text>
          <Text style={styles.body}>{application.review_reason || application.rejection_reason}</Text>
        </View>}
        {!editing && <View style={styles.summaryPhotos}>{photos.filter((photo): photo is ClientPhoto => !!photo).map(photo =>
          <Image key={photo.id} source={{ uri: photo.uri }} style={styles.summaryPhoto} />)}</View>}
        {!editing && editable && action('edit',() => { setEditing(true); setNotice(null); setGlobalError(null) },true)}
      </View>}
      {showForm && <>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{tr('primaryPhoto')}<Text style={styles.star}> *</Text></Text>
          <Text style={styles.help}>{tr('primaryHelp')}</Text>
          {photoTile(0)}
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{tr('businessSection')}</Text>
          <View style={styles.grid}>
            {field('name',true)}
            {field('business_type',true,<AppSelect label={tr('business_type')} value={form.business_type}
              options={types.map(type => ({ value:type,label:tr(type) }))} placeholder={tr('choose')}
              onChange={value => setValue('business_type',value)} disabled={disabled} invalid={!!errors.business_type} />)}
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{tr('locationSection')}</Text>
          <View style={styles.grid}>
            {field('country',true,<AppSelect label={tr('country')} value={form.country}
              options={countries.map(country => ({ value:country.code,label:nameFor(country.names) }))}
              placeholder={tr('chooseCountry')} onChange={value => setValue('country',value)} disabled={disabled} invalid={!!errors.country} />)}
            {field('country_region_id',true,<AppSelect label={tr('country_region_id')} value={form.country_region_id}
              options={availableRegions.map(region => ({ value:region.id,label:nameFor(region.names) }))}
              placeholder={tr('chooseRegion')} onChange={value => setValue('country_region_id',value)}
              disabled={disabled || !form.country || !availableRegions.length} invalid={!!errors.country_region_id} />)}
            {field('city',true)}
            {field('postal_code')}
          </View>
          <View style={styles.fullField}>{field('address_line1',true,undefined,true)}</View>
          <View style={styles.fullField}>{field('address_line2',false,undefined,true)}</View>
          <View style={styles.grid}>{field('phone')}</View>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{tr('aboutSection')}</Text>
          <View style={styles.fullField}>{field('description',false,undefined,true)}</View>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{tr('promoPhotos')}</Text>
          <Text style={styles.help}>{tr('promoHelp')}</Text>
          <View style={styles.promoRow}>{[1,2,3].map(photoTile)}</View>
          <Text style={styles.help}>{tr('photoRules')}</Text>
        </View>
        {busy && <ActivityIndicator color={c.accent} />}
        {action(application ? 'resubmit' : 'submit',() => void submit())}
        {application && action('cancel',() => { setNotice(null); void load() },true)}
      </>}
      {action('refresh',() => { setNotice(null); void load() },true)}
      <View style={styles.language}><LanguageSelect /></View>
    </View>
  </ScrollView>
}

const styles = StyleSheet.create({
  page:{ flexGrow:1, alignItems:'center', padding:20, paddingBottom:64, backgroundColor:c.background },
  content:{ width:'100%', maxWidth:800, gap:18 },
  topbar:{ flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10 },
  brand:{ fontSize:25,fontWeight:'800',color:c.text },
  eyebrow:{ fontSize:12,letterSpacing:2,color:c.accent,fontWeight:'700' },
  title:{ fontSize:32,fontWeight:'800',color:c.text }, subtitle:{ fontSize:15,lineHeight:23,color:c.muted,marginBottom:6 },
  card:{ backgroundColor:c.card,padding:22,borderRadius:22,borderWidth:1,borderColor:c.border,gap:16 },
  sectionTitle:{ fontSize:18,fontWeight:'700',color:c.text,flexShrink:1 },
  grid:{ flexDirection:'row',flexWrap:'wrap',columnGap:16,rowGap:18 },
  field:{ width:'100%',gap:8 },half:{ width:'48%' },
  fullField:{ width:'100%' },
  label:{ color:c.text,fontSize:14,fontWeight:'600' },star:{ color:c.danger,fontWeight:'800' },
  input:{ minHeight:52,paddingHorizontal:14,paddingVertical:13,borderWidth:1,borderColor:c.border,borderRadius:12,color:c.text,backgroundColor:c.card,fontSize:15 },
  multiline:{ minHeight:120,textAlignVertical:'top' },invalid:{ borderColor:c.danger },
  help:{ color:c.muted,fontSize:13,lineHeight:21 },body:{ color:c.text,lineHeight:22 },
  errorText:{ color:c.danger,fontSize:12,lineHeight:18 },
  errorBanner:{ backgroundColor:'#FBEAEA',color:c.danger,padding:16,borderRadius:12,lineHeight:22 },
  notice:{ backgroundColor:'#E8F0E7',color:c.success,padding:16,borderRadius:12,lineHeight:22 },
  button:{ minHeight:54,padding:16,backgroundColor:c.accent,borderRadius:14,alignItems:'center',justifyContent:'center' },
  buttonText:{ color:c.white,fontSize:16,fontWeight:'700',textAlign:'center' },
  secondary:{ backgroundColor:'#EEE6DD' },secondaryText:{ color:c.text },disabled:{ opacity:0.45 },
  smallAction:{ padding:8 },link:{ color:c.accent,fontSize:13,fontWeight:'600' },
  primaryPhoto:{ width:'100%',maxWidth:360,gap:6 },promoPhoto:{ flex:1,minWidth:76,gap:6 },
  photoBox:{ width:'100%',aspectRatio:1,borderWidth:1,borderStyle:'dashed',borderColor:c.border,borderRadius:14,overflow:'hidden',backgroundColor:'#F5EEE6',alignItems:'center',justifyContent:'center',padding:0 },
  primaryBox:{ aspectRatio:1.6 },image:{ width:'100%',height:'100%' },
  plus:{ fontSize:30,color:c.accent },photoHint:{ fontSize:12,color:c.muted,textAlign:'center',padding:8 },
  photoOverlay:{ ...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.25)',alignItems:'center',justifyContent:'center' },
  photoActions:{ flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between' },promoRow:{ flexDirection:'row',gap:12 },
  statusRow:{ flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12 },
  badge:{ backgroundColor:c.accentLight,paddingHorizontal:12,paddingVertical:7,borderRadius:20 },
  badgeText:{ color:c.accent,fontSize:12,fontWeight:'700' },review:{ backgroundColor:c.background,padding:14,borderRadius:12,gap:8 },
  summaryPhotos:{ flexDirection:'row',flexWrap:'wrap',gap:10 },summaryPhoto:{ width:90,height:90,borderRadius:12 },
  language:{ maxWidth:360,width:'100%',alignSelf:'center' },
})
