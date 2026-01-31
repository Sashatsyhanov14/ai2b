import { supabase } from '@/lib/supabaseClient'

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'public'

export async function uploadImage(file: File, path: string){
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) { console.error(error); return null }
  return { path }
}

export function getImageUrl(path: string){
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

