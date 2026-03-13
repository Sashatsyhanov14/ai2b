-- Fix existing units: normalize city names to English canonical spelling
-- Run this ONCE in Supabase SQL Editor to clean up existing records

UPDATE public.units SET city = 'Istanbul'  WHERE lower(trim(city)) IN ('стамбул','istanbul','истанбул','константинополь');
UPDATE public.units SET city = 'Ankara'    WHERE lower(trim(city)) IN ('анкара','ankara');
UPDATE public.units SET city = 'Izmir'     WHERE lower(trim(city)) IN ('измир','izmir','smyrna');
UPDATE public.units SET city = 'Antalya'   WHERE lower(trim(city)) IN ('анталия','анталья','antalya','antalija');
UPDATE public.units SET city = 'Alanya'    WHERE lower(trim(city)) IN ('аланья','аланія','alanya','alania');
UPDATE public.units SET city = 'Mersin'    WHERE lower(trim(city)) IN ('мерсин','mersin');
UPDATE public.units SET city = 'Mezitli'   WHERE lower(trim(city)) IN ('мезитли','mezitli');
UPDATE public.units SET city = 'Bodrum'    WHERE lower(trim(city)) IN ('бодрум','bodrum');
UPDATE public.units SET city = 'Marmaris'  WHERE lower(trim(city)) IN ('мармарис','marmaris');
UPDATE public.units SET city = 'Fethiye'   WHERE lower(trim(city)) IN ('фетхие','fethiye');
UPDATE public.units SET city = 'Kemer'     WHERE lower(trim(city)) IN ('кемер','kemer');
UPDATE public.units SET city = 'Side'      WHERE lower(trim(city)) IN ('сиде','side');
UPDATE public.units SET city = 'Belek'     WHERE lower(trim(city)) IN ('белек','belek');
UPDATE public.units SET city = 'Mahmutlar' WHERE lower(trim(city)) IN ('махмутлар','mahmutlar');
UPDATE public.units SET city = 'Kestel'    WHERE lower(trim(city)) IN ('кестель','kestel');
UPDATE public.units SET city = 'Oba'       WHERE lower(trim(city)) IN ('оба','oba');
UPDATE public.units SET city = 'Bursa'     WHERE lower(trim(city)) IN ('бурса','bursa');
UPDATE public.units SET city = 'Kusadasi'  WHERE lower(trim(city)) IN ('кушадасы','kusadasi');
UPDATE public.units SET city = 'Trabzon'   WHERE lower(trim(city)) IN ('трабзон','trabzon');
UPDATE public.units SET city = 'Gaziantep' WHERE lower(trim(city)) IN ('газиантеп','gaziantep');
UPDATE public.units SET city = 'Konya'     WHERE lower(trim(city)) IN ('конья','konya');
UPDATE public.units SET city = 'Tece'      WHERE lower(trim(city)) IN ('тесе','тесе-мерсин','tece');
UPDATE public.units SET city = 'Erdemli'   WHERE lower(trim(city)) IN ('эрдемли','erdemli');

-- Confirm results
SELECT DISTINCT city FROM public.units ORDER BY city;
