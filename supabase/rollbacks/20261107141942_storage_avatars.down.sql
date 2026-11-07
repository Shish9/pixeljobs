drop policy if exists "Users can read their own avatar objects" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can replace their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;
-- The bucket must be emptied (via the Storage API) before it can be removed:
-- delete from storage.buckets where id = 'avatars';
