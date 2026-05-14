-- The `restaurants` bucket allows MP4 plate teasers up to 10 seconds.
-- A few legacy base64 entries weigh ~6-7 MB once decoded, above the
-- default 5 MB limit. Bump to 20 MB so the backfill can complete and
-- to leave headroom for higher-quality videos in the future.

update storage.buckets
   set file_size_limit = 20971520   -- 20 MB
 where id = 'restaurants';

-- Ads stay at 5 MB (images only).
update storage.buckets
   set file_size_limit = 5242880    -- 5 MB
 where id = 'ads';
