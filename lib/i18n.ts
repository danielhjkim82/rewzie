import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import { createInstance, type Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { supabase } from './supabase'
import clientApplicationEnglish from '../locales/client-application.en.json'

export type AppLanguage = {
  code: string; native_name: string; text_direction: 'ltr' | 'rtl'; is_default: boolean
}
type Bundle = { language_code: string; namespace: string; content: Record<string,unknown> }
type Snapshot = { languages: AppLanguage[]; bundles: Bundle[] }
const LANGUAGE_KEY = 'rewzie.language'
const CACHE_KEY = 'rewzie.translations.v1'
const fallbackEnglish = {
  welcome: {
    subtitle:'Start your rewards journey', customer:'Sign up as a customer',
    client:'Sign up as a business', language:'Language',
  },
  signup: {
    customerTitle:'Create a customer account', clientTitle:'Create a business account',
    displayName:'Display name', email:'Email', password:'Password', submit:'Sign up',
    back:'Back', required:'Please complete all fields.', failed:'Unable to sign up. Please try again.',
    checkEmail:'Check your email to confirm your account.', success:'Your account has been created.',
  },
  login: {
    link:'Already have an account? Log in', title:'Log in to Rewzie', submit:'Log in',
    required:'Enter your email and password.', failed:'Unable to log in. Check your details and try again.',
    emailNotConfirmed:'Confirm your email before logging in.',
    profileFailed:'Unable to load your account information. Please try again.',
  },
  client: { title:'Business application', pending:'The business application form will be available here.' },
  customer: { title:'My rewards', pending:'Your businesses and reward cards will appear here.' },
  common: { back:'Back', languageFailed:'Unable to change language. Please try again.' },
  clientApplication: clientApplicationEnglish,
}
export const i18n = createInstance()
let languages: AppLanguage[] = [{ code:'en',native_name:'English',text_direction:'ltr',is_default:true }]
let initialization: Promise<void> | undefined

function isObject(value: unknown): value is Record<string,unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function merge(base: Record<string,unknown>, incoming: Record<string,unknown>): Record<string,unknown> {
  const result = { ...base }
  for (const [key,value] of Object.entries(incoming)) {
    if (['__proto__','constructor','prototype'].includes(key)) continue
    result[key] = isObject(result[key]) && isObject(value)
      ? merge(result[key] as Record<string,unknown>,value) : value
  }
  return result
}
async function read(key: string) {
  try { return await AsyncStorage.getItem(key) }
  catch (error) { console.warn('Preference read failed:',error); return null }
}
async function fetchSnapshot(): Promise<Snapshot> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(),10000)
  try {
    const [a,b] = await Promise.all([
      supabase.from('app_languages').select('code,native_name,text_direction,is_default')
        .eq('is_active',true).order('sort_order').order('code').abortSignal(controller.signal),
      supabase.from('app_translation_bundles').select('language_code,namespace,content')
        .eq('namespace','translation').eq('is_published',true).abortSignal(controller.signal),
    ])
    if (a.error) throw a.error
    if (b.error) throw b.error
    const bundles = (b.data ?? []) as Bundle[]
    const available = new Set(bundles.map(item => item.language_code))
    const active = ((a.data ?? []) as AppLanguage[]).filter(item => available.has(item.code))
    if (!active.length) throw new Error('No published languages available')
    return { languages:active,bundles }
  } finally { clearTimeout(timer) }
}
export function getAppLanguages(): AppLanguage[] { return languages }
export function initializeI18n(): Promise<void> {
  if (!initialization) initialization = (async () => {
    let snapshot: Snapshot | null = null
    const cached = await read(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Snapshot
        if (Array.isArray(parsed.languages) && parsed.languages.length && Array.isArray(parsed.bundles)) snapshot=parsed
      } catch { console.warn('Invalid translation cache') }
    }
    try {
      snapshot = await fetchSnapshot()
      try { await AsyncStorage.setItem(CACHE_KEY,JSON.stringify(snapshot)) }
      catch (error) { console.warn('Translation cache write failed:',error) }
    } catch (error) { console.warn('Using cached or built-in translations:',error) }
    const resources: Resource = { en:{ translation:fallbackEnglish } }
    if (snapshot) {
      languages=snapshot.languages
      for (const bundle of snapshot.bundles) {
        resources[bundle.language_code] ??= {}
        resources[bundle.language_code][bundle.namespace] =
          bundle.language_code === 'en' && bundle.namespace === 'translation'
            ? merge(fallbackEnglish,bundle.content) : bundle.content
      }
    }
    const saved=await read(LANGUAGE_KEY)
    const deviceMatch=getLocales().map(locale => {
      const tag=locale.languageTag.toLowerCase()
      const base=locale.languageCode?.toLowerCase()
      return (languages.find(item => item.code === tag) ?? languages.find(item => item.code === base))?.code
    }).find(Boolean)
    const preferred=languages.find(item => item.code === saved)?.code ?? deviceMatch ??
      languages.find(item => item.is_default)?.code ?? languages[0].code
    await i18n.use(initReactI18next).init({
      resources,lng:preferred,fallbackLng:'en',
      supportedLngs:[...new Set(['en',...languages.map(item => item.code)])],
      interpolation:{ escapeValue:false },react:{ useSuspense:false },
    })
  })()
  return initialization
}
export async function setAppLanguage(code: string): Promise<void> {
  await initializeI18n()
  if (!languages.some(item => item.code === code)) throw new Error('Unsupported language')
  await i18n.changeLanguage(code)
  try { await AsyncStorage.setItem(LANGUAGE_KEY,code) }
  catch (error) { console.warn('Language preference write failed:',error) }
}
