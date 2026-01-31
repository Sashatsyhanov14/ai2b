export type BotRow = {
  id: number
  token: string
  masked_token: string
  webhook_secret_path: string
  webhook_secret_token: string
  is_active: boolean
  created_at: string
}

export type RentalUnit = {
  id: number
  title: string | null
  city: string | null
  address?: string | null
  price: number | null
  currency: string | null
  bedrooms: number | null
  description: string | null
  available_from?: string | null
  price_month_eur?: number | null
  created_at: string
}

export type SaleProperty = {
  id: number
  title: string | null
  city: string | null
  address?: string | null
  price: number | null
  currency: string | null
  price_sale_eur?: number | null
  description: string | null
  created_at: string
}

export type PropertyPhoto = {
  id: number
  ref_type: 'rental' | 'sale'
  ref_id: number
  url: string
  created_at: string
}

// New minimal types for new schema
export type Bot = {
  id: string;
  title: string | null;
  token: string;
  platform: 'telegram' | 'whatsapp' | string;
  mode: string;
  webhook_secret: string | null;
  status: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
};

export type Session = {
  id: string;
  bot_id: string;
  external_user_id: string;
  title: string | null;
  status: string | null;
  context: any;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  session_id: string;
  bot_id: string;
  role: 'user' | 'assistant' | 'system' | string;
  content: string | null;
  payload: any;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  source_bot_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  data: any;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type RentalBooking = {
  id: number
  unit_id: number
  start_date: string
  end_date: string
  user_chat_id: string | null
  created_at?: string
}

export type LegacyLead = {
  id: number
  name: string | null
  phone: string | null
  query: string | null
  source: string | null
  created_at?: string
}
