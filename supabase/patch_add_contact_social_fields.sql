begin;

alter table if exists public.crm_customer_contact
  add column if not exists video_channel_profile text not null default '',
  add column if not exists douyin_profile text not null default '',
  add column if not exists xiaohongshu_profile text not null default '',
  add column if not exists social_media_behavior text not null default '';

update public.crm_customer_contact
set
  video_channel_profile = coalesce(video_channel_profile, ''),
  douyin_profile = coalesce(douyin_profile, ''),
  xiaohongshu_profile = coalesce(xiaohongshu_profile, ''),
  social_media_behavior = coalesce(social_media_behavior, '')
where
  video_channel_profile is null
  or douyin_profile is null
  or xiaohongshu_profile is null
  or social_media_behavior is null;

comment on column public.crm_customer_contact.video_channel_profile is '联系人视频号公开资料';
comment on column public.crm_customer_contact.douyin_profile is '联系人抖音公开资料';
comment on column public.crm_customer_contact.xiaohongshu_profile is '联系人小红书公开资料';
comment on column public.crm_customer_contact.social_media_behavior is '联系人社媒行为摘要';

commit;
