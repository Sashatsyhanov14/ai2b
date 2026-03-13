-- Fix: Add missing DELETE Row Level Security policy for leads table
-- Without this, even authenticated users (and service role fallback) cannot delete leads via RLS
CREATE POLICY "leads delete for auth"
  ON public.leads FOR DELETE
  TO authenticated
  USING (true);
