ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';

-- Membuat bucket storage untuk chat files jika belum ada
insert into storage.buckets (id, name, public) 
values ('chat-files', 'chat-files', true)
on conflict (id) do nothing;
