-- Undo Phase 7 (trust & safety). DESTRUCTIVE: drops all conversations, messages, reviews, reports and the
-- moderation log. Run only with explicit approval and after a backup. Moderation decisions already applied to
-- profiles/services/projects/portfolio (suspensions) are NOT reverted by this script.
drop function if exists public.moderate(text, uuid, text, text, uuid);
drop function if exists public.unread_conversation_count();
drop function if exists public.mark_conversation_read(uuid);
drop view if exists public.service_review_stats;
drop view if exists public.review_stats;
drop table if exists public.moderation_actions;
drop table if exists public.reports;
drop table if exists public.reviews;
drop table if exists private.hidden_message_bodies;
drop table if exists public.conversation_reads;
drop table if exists public.messages;
drop trigger if exists service_requests_conversation on public.service_requests;
drop trigger if exists proposals_conversation on public.proposals;
drop table if exists public.conversations;
drop function if exists private.reports_before_insert();
drop function if exists private.reviews_after_insert();
drop function if exists private.reviews_before_insert();
drop function if exists private.messages_after_insert();
drop function if exists private.messages_before_insert();
drop function if exists private.open_conversation();
drop function if exists private.is_participant(uuid);
-- (20261107220207_trust_and_safety_clock only replaced two of the functions above; nothing extra to undo.)
