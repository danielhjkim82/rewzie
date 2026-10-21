import { Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as Crypto from 'expo-crypto'
import { supabase } from './supabase'

export type ClientPhoto = { id: string; uri: string }
export type UploadRecord = { id: string; bucket_id: string; storage_path: string }

export async function signImage(record: UploadRecord): Promise<ClientPhoto> {
  const { data, error } = await supabase.storage.from(record.bucket_id)
    .createSignedUrl(record.storage_path, 3600)
  if (error) throw error
  return { id: record.id, uri: data.signedUrl }
}

export async function pickAndUploadImage(): Promise<ClientPhoto | null> {
  // On web the picker must open directly from the user's click.
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) throw new Error('PHOTO_PERMISSION_REQUIRED')
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1,
  })
  if (result.canceled || !result.assets?.[0]) return null
  const asset = result.assets[0]
  const context = ImageManipulator.manipulate(asset.uri)
  // Preserve PNG transparency; other formats are normalized to JPEG.
  if (asset.width > 1600 || asset.height > 1600) {
    if (asset.width >= asset.height) context.resize({ width: 1600, height: null })
    else context.resize({ width: null, height: 1600 })
  }
  const image = await context.renderAsync()
  const isPng = asset.mimeType === 'image/png' || /\.png(?:$|\?)/i.test(asset.fileName ?? asset.uri)
  const converted = await image.saveAsync({
    format: isPng ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.82,
  })
  let buffer: ArrayBuffer
  if (Platform.OS === 'web') {
    const response = await fetch(converted.uri)
    if (!response.ok) throw new Error('PHOTO_READ_FAILED')
    buffer = await response.arrayBuffer()
  } else {
    const { File } = await import('expo-file-system')
    buffer = await new File(converted.uri).arrayBuffer()
  }
  if (!buffer.byteLength || buffer.byteLength > 5242880) throw new Error('INVALID_IMAGE_SIZE')
  const mime = isPng ? 'image/png' : 'image/jpeg'
  const requestId = Crypto.randomUUID()
  const reservation = await supabase.rpc('client_image_prepare_v1', {
    p_request_id: requestId, p_mime_type: mime, p_file_size: buffer.byteLength,
  })
  if (reservation.error) throw reservation.error
  const upload = reservation.data as {
    upload_id: string; bucket_id: string; storage_path: string; status: string
  }
  const sent = await supabase.storage.from(upload.bucket_id).upload(upload.storage_path, buffer, {
    contentType: mime, upsert: false, cacheControl: '3600',
  })
  // A response can be lost after the object reached Storage. Finalize checks existence.
  const finalized = await supabase.rpc('client_image_finalize_v1', { p_upload_id: upload.upload_id })
  if (finalized.error) throw sent.error ?? finalized.error
  return { id: upload.upload_id, uri: converted.uri }
}
