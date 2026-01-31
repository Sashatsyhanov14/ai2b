import crypto from 'node:crypto'

const TELEGRAM_API = 'https://api.telegram.org'

export type TelegramSendOptions = {
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML'
  reply_markup?: any
  disable_web_page_preview?: boolean
}

export const generateSecret = (bytes = 24) => crypto.randomBytes(bytes).toString('hex')

export const maskToken = (token: string) => {
  if (!token || token.length < 12) return '***'
  return `${token.slice(0, 6)}…${token.slice(-4)}`
}

async function telegramFetch<T>(token: string, method: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok || !json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description || res.statusText}`)
  }
  return json as T
}

export const setWebhook = (token: string, url: string, secretToken: string) =>
  telegramFetch(token, 'setWebhook', {
    url,
    secret_token: secretToken,
    drop_pending_updates: true,
    allowed_updates: ['message'],
  })

export const deleteWebhook = (token: string) =>
  telegramFetch(token, 'deleteWebhook', { drop_pending_updates: true })

export const sendMessage = (
  token: string,
  chatId: number | string,
  text: string,
  opts: TelegramSendOptions = {}
) =>
  telegramFetch(token, 'sendMessage', {
    chat_id: chatId,
    text,
    ...opts,
  })

export const sendPhoto = (
  token: string,
  chatId: number | string,
  photo: string,
  caption?: string,
  opts: TelegramSendOptions = {}
) =>
  telegramFetch(token, 'sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
    ...opts,
  })

export type InputMediaPhoto = {
  type: 'photo'
  media: string
  caption?: string
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML'
}

export const sendMediaGroup = (
  token: string,
  chatId: number | string,
  media: InputMediaPhoto[],
) =>
  telegramFetch(token, 'sendMediaGroup', {
    chat_id: chatId,
    media,
  })

export const sendTyping = (
  token: string,
  chatId: number | string,
) =>
  telegramFetch(token, 'sendChatAction', {
    chat_id: chatId,
    action: 'typing',
  })
