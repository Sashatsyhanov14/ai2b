-- Add content_text column to company_files for RAG context
alter table public.company_files add column if not exists content_text text;
