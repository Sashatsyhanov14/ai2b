-- Fix existing units: normalize city names to English canonical spelling
-- Run this ONCE in Supabase SQL Editor to clean up existing records
-- Uses ILIKE to handle Turkish İ (İstanbul) vs Latin I (Istanbul) mismatch

UPDATE public.units SET city = 'Istanbul'  WHERE city ILIKE 'istanbul' OR city ILIKE 'İstanbul' OR lower(trim(city)) IN ('стамбул','истанбул','константинополь');
UPDATE public.units SET city = 'Ankara'    WHERE city ILIKE 'ankara'    OR lower(trim(city)) = 'анкара';
UPDATE public.units SET city = 'Izmir'     WHERE city ILIKE 'izmir'     OR lower(trim(city)) IN ('измир','smyrna');
UPDATE public.units SET city = 'Antalya'   WHERE city ILIKE 'antalya'   OR lower(trim(city)) IN ('анталия','анталья','antalija');
UPDATE public.units SET city = 'Alanya'    WHERE city ILIKE 'alanya'    OR lower(trim(city)) IN ('аланья','аланія','alania');
UPDATE public.units SET city = 'Mersin'    WHERE city ILIKE 'mersin'    OR lower(trim(city)) = 'мерсин';
UPDATE public.units SET city = 'Mezitli'   WHERE city ILIKE 'mezitli'   OR lower(trim(city)) = 'мезитли';
UPDATE public.units SET city = 'Bodrum'    WHERE city ILIKE 'bodrum'    OR lower(trim(city)) = 'бодрум';
UPDATE public.units SET city = 'Marmaris'  WHERE city ILIKE 'marmaris'  OR lower(trim(city)) = 'мармарис';
UPDATE public.units SET city = 'Fethiye'   WHERE city ILIKE 'fethiye'   OR lower(trim(city)) = 'фетхие';
UPDATE public.units SET city = 'Kemer'     WHERE city ILIKE 'kemer'     OR lower(trim(city)) = 'кемер';
UPDATE public.units SET city = 'Side'      WHERE city ILIKE 'side'      OR lower(trim(city)) = 'сиде';
UPDATE public.units SET city = 'Belek'     WHERE city ILIKE 'belek'     OR lower(trim(city)) = 'белек';
UPDATE public.units SET city = 'Mahmutlar' WHERE city ILIKE 'mahmutlar' OR lower(trim(city)) = 'махмутлар';
UPDATE public.units SET city = 'Kestel'    WHERE city ILIKE 'kestel'    OR lower(trim(city)) = 'кестель';
UPDATE public.units SET city = 'Oba'       WHERE city ILIKE 'oba'       OR lower(trim(city)) = 'оба';
UPDATE public.units SET city = 'Bursa'     WHERE city ILIKE 'bursa'     OR lower(trim(city)) = 'бурса';
UPDATE public.units SET city = 'Kusadasi'  WHERE city ILIKE 'kusadasi'  OR lower(trim(city)) = 'кушадасы';
UPDATE public.units SET city = 'Trabzon'   WHERE city ILIKE 'trabzon'   OR lower(trim(city)) = 'трабзон';
UPDATE public.units SET city = 'Gaziantep' WHERE city ILIKE 'gaziantep' OR lower(trim(city)) = 'газиантеп';
UPDATE public.units SET city = 'Konya'     WHERE city ILIKE 'konya'     OR lower(trim(city)) = 'конья';
UPDATE public.units SET city = 'Tece'      WHERE city ILIKE 'tece'      OR lower(trim(city)) IN ('тесе','тесе-мерсин');
UPDATE public.units SET city = 'Erdemli'   WHERE city ILIKE 'erdemli'   OR lower(trim(city)) = 'эрдемли';

-- Confirm results
SELECT DISTINCT city FROM public.units ORDER BY city;

