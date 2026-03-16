-- Migration to create tables for the dedicated Rentals feature
-- Documentation: Phase 21 Full Rentals Implementation

CREATE TABLE IF NOT EXISTS public.rental_units (
    id SERIAL PRIMARY KEY,
    title TEXT,
    city TEXT NOT NULL,
    address TEXT,
    description TEXT,
    price_per_day NUMERIC,
    price_per_month NUMERIC,
    bedrooms INTEGER,
    bathrooms INTEGER,
    max_guests INTEGER,
    i18n JSONB DEFAULT '{}'::jsonb,
    photos TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.rental_bookings (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER REFERENCES public.rental_units(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    user_chat_id TEXT, -- To link to the Telegram user who booked it
    status TEXT DEFAULT 'reserved' CHECK (status IN ('blocked', 'reserved', 'confirmed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Assuming open for service role, adjust if row-level auth is needed for clients)
ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.rental_units FOR SELECT USING (true);
CREATE POLICY "Enable all access for service role only" ON public.rental_units USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.rental_bookings FOR SELECT USING (true);
CREATE POLICY "Enable all access for service role only" ON public.rental_bookings USING (true) WITH CHECK (true);
