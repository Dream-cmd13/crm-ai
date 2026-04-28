create schema if not exists wechat_raw;
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. 原始回调数据表 (Callback Raw)
-- ============================================================================

create table if not exists wechat_raw.wechat_callback_raw (
    id bigserial primary key,
    dedupe_key text not null unique,
    guid text not null,
    notify_type integer,
    event_time timestamptz,
    source_ip text,
    user_agent text,
    payload jsonb not null,
    route_status text not null default 'received',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_wechat_callback_raw_notify_type
    on wechat_raw.wechat_callback_raw (notify_type);
create index if not exists idx_wechat_callback_raw_event_time
    on wechat_raw.wechat_callback_raw (event_time);
create index if not exists idx_wechat_callback_raw_created_at
    on wechat_raw.wechat_callback_raw (created_at);


create table if not exists wechat_raw.wework_callback_raw (
    id bigserial primary key,
    dedupe_key text not null unique,
    guid text not null,
    notify_type integer,
    event_time timestamptz,
    source_ip text,
    user_agent text,
    payload jsonb not null,
    route_status text not null default 'received',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_wework_callback_raw_notify_type
    on wechat_raw.wework_callback_raw (notify_type);
create index if not exists idx_wework_callback_raw_event_time
    on wechat_raw.wework_callback_raw (event_time);
create index if not exists idx_wework_callback_raw_created_at
    on wechat_raw.wework_callback_raw (created_at);


-- ============================================================================
-- 2. 企微消息事件表 (WeWork Message Events)
-- ============================================================================

create table if not exists wechat_raw.wework_group_message_events (
    id bigserial primary key,
    dedupe_key text not null unique,
    guid text not null,
    notify_type integer not null,
    event_time timestamptz,

    seq bigint,
    msg_id text,
    appinfo text,
    sender text,
    sender_name text,
    receiver text,
    roomid text not null,
    sendtime timestamptz,

    content_type integer,
    msg_type integer,
    referid text,
    flag bigint,
    content text,
    at_list jsonb,
    quote_content text,
    quote_appinfo text,
    send_flag integer,

    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_wework_group_message_events_seq
    on wechat_raw.wework_group_message_events (seq);
create index if not exists idx_wework_group_message_events_roomid
    on wechat_raw.wework_group_message_events (roomid);
create index if not exists idx_wework_group_message_events_sender
    on wechat_raw.wework_group_message_events (sender);
create index if not exists idx_wework_group_message_events_sendtime
    on wechat_raw.wework_group_message_events (sendtime);
create index if not exists idx_wework_group_message_events_content_type
    on wechat_raw.wework_group_message_events (content_type);


create table if not exists wechat_raw.wework_private_message_events (
    id bigserial primary key,
    dedupe_key text not null unique,
    guid text not null,
    notify_type integer not null,
    event_time timestamptz,

    seq bigint,
    msg_id text,
    appinfo text,
    sender text,
    sender_name text,
    receiver text,
    roomid text not null default '0',
    sendtime timestamptz,

    content_type integer,
    msg_type integer,
    referid text,
    flag bigint,
    content text,
    at_list jsonb,
    quote_content text,
    quote_appinfo text,
    send_flag integer,

    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_wework_private_message_events_seq
    on wechat_raw.wework_private_message_events (seq);
create index if not exists idx_wework_private_message_events_sender
    on wechat_raw.wework_private_message_events (sender);
create index if not exists idx_wework_private_message_events_receiver
    on wechat_raw.wework_private_message_events (receiver);
create index if not exists idx_wework_private_message_events_sendtime
    on wechat_raw.wework_private_message_events (sendtime);
create index if not exists idx_wework_private_message_events_content_type
    on wechat_raw.wework_private_message_events (content_type);


-- ============================================================================
-- 3. 个微消息事件表 (WeChat Message Events) - 已补齐媒体字段
-- ============================================================================

create table if not exists wechat_raw.wechat_group_message_events (
    id bigserial primary key,
    dedupe_key text not null unique,
    guid text not null,
    notify_type integer not null,
    event_time timestamptz,

    seq bigint,
    msg_id text,
    appinfo text,
    sender text,
    sender_name text,
    receiver text,
    roomid text not null,
    sendtime timestamptz,

    content_type integer,
    msg_type integer,
    referid text,
    flag bigint,
    content text,
    at_list jsonb,
    quote_content text,
    quote_appinfo text,
    send_flag integer,

    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    local_media_path text,
    voice_trans_text text,
    media_task_status text,
    media_task_updated_at timestamptz,
    remote_media_url text
);

create index if not exists idx_wechat_group_message_events_seq
    on wechat_raw.wechat_group_message_events (seq);
create index if not exists idx_wechat_group_message_events_roomid
    on wechat_raw.wechat_group_message_events (roomid);
create index if not exists idx_wechat_group_message_events_sender
    on wechat_raw.wechat_group_message_events (sender);
create index if not exists idx_wechat_group_message_events_sendtime
    on wechat_raw.wechat_group_message_events (sendtime);
create index if not exists idx_wechat_group_message_events_content_type
    on wechat_raw.wechat_group_message_events (content_type);


create table if not exists wechat_raw.wechat_private_message_events (
    id bigserial primary key,
    dedupe_key text not null unique,
    guid text not null,
    notify_type integer not null,
    event_time timestamptz,

    seq bigint,
    msg_id text,
    appinfo text,
    sender text,
    sender_name text,
    receiver text,
    roomid text not null default '0',
    sendtime timestamptz,

    content_type integer,
    msg_type integer,
    referid text,
    flag bigint,
    content text,
    at_list jsonb,
    quote_content text,
    quote_appinfo text,
    send_flag integer,

    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    local_media_path text,
    voice_trans_text text,
    media_task_status text,
    media_task_updated_at timestamptz,
    remote_media_url text
);

create index if not exists idx_wechat_private_message_events_seq
    on wechat_raw.wechat_private_message_events (seq);
create index if not exists idx_wechat_private_message_events_sender
    on wechat_raw.wechat_private_message_events (sender);
create index if not exists idx_wechat_private_message_events_receiver
    on wechat_raw.wechat_private_message_events (receiver);
create index if not exists idx_wechat_private_message_events_sendtime
    on wechat_raw.wechat_private_message_events (sendtime);
create index if not exists idx_wechat_private_message_events_content_type
    on wechat_raw.wechat_private_message_events (content_type);


-- ============================================================================
-- 4. 其他事件表 (Other Events - Sync/Status)
-- ============================================================================

create table if not exists wechat_raw.wechat_other_events (
    id bigserial primary key,
    dedupe_key text not null unique,
    guid text not null,
    notify_type integer not null,
    event_time timestamptz,

    status integer,
    vid bigint,
    nickname text,
    avatar text,
    logo text,
    corp_id text,

    user_id text,
    name text,
    real_name text,
    gender integer,
    party_id text,
    corp_short_name text,
    corp_full_name text,

    error_code integer,
    error_message text,

    call_type integer,
    msgid text,
    timestamp_raw bigint,
    invite_msg jsonb,

    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_wechat_other_events_notify_type
    on wechat_raw.wechat_other_events (notify_type);
create index if not exists idx_wechat_other_events_event_time
    on wechat_raw.wechat_other_events (event_time);
create index if not exists idx_wechat_other_events_user_id
    on wechat_raw.wechat_other_events (user_id);
create index if not exists idx_wechat_other_events_msgid
    on wechat_raw.wechat_other_events (msgid);


create table if not exists wechat_raw.wework_other_events (
    id bigserial primary key,
    dedupe_key text not null unique,
    guid text not null,
    notify_type integer not null,
    event_time timestamptz,

    status integer,
    vid bigint,
    nickname text,
    avatar text,
    logo text,
    corp_id text,

    user_id text,
    name text,
    real_name text,
    gender integer,
    party_id text,
    corp_short_name text,
    corp_full_name text,

    error_code integer,
    error_message text,

    call_type integer,
    msgid text,
    timestamp_raw bigint,
    invite_msg jsonb,

    payload jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_wework_other_events_notify_type
    on wechat_raw.wework_other_events (notify_type);
create index if not exists idx_wework_other_events_event_time
    on wechat_raw.wework_other_events (event_time);
create index if not exists idx_wework_other_events_user_id
    on wechat_raw.wework_other_events (user_id);
create index if not exists idx_wework_other_events_msgid
    on wechat_raw.wework_other_events (msgid);




create table if not exists wechat_raw.message_media_jobs (
    id bigint generated always as identity primary key,
    dedupe_key text not null,
    job_type text not null check (job_type in ('download_media', 'transcribe_voice')),
    source text not null,
    guid text not null,
    msg_id text,
    msg_type integer,
    target_table text,
    username text,
    room_username text,
    status text not null default 'pending' check (status in ('pending', 'processing', 'retrying', 'success', 'failed')),
    attempt_count integer not null default 0,
    next_retry_at timestamptz,
    last_error text,
    raw_payload jsonb not null,
    raw_xml text,
    result_json jsonb,
    processing_started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (dedupe_key, job_type)
);

create index if not exists idx_message_media_jobs_poll
    on wechat_raw.message_media_jobs (status, next_retry_at, created_at);

alter table if exists wechat_raw.message_media_jobs
    add column if not exists dedupe_key text,
    add column if not exists job_type text,
    add column if not exists source text,
    add column if not exists guid text,
    add column if not exists msg_id text,
    add column if not exists msg_type integer,
    add column if not exists target_table text,
    add column if not exists username text,
    add column if not exists room_username text,
    add column if not exists status text,
    add column if not exists attempt_count integer default 0,
    add column if not exists next_retry_at timestamptz,
    add column if not exists last_error text,
    add column if not exists raw_payload jsonb,
    add column if not exists raw_xml text,
    add column if not exists result_json jsonb,
    add column if not exists processing_started_at timestamptz,
    add column if not exists completed_at timestamptz,
    add column if not exists created_at timestamptz default now(),
    add column if not exists updated_at timestamptz default now();

create unique index if not exists idx_message_media_jobs_dedupe_job_type
    on wechat_raw.message_media_jobs (dedupe_key, job_type);

create table if not exists wechat_raw.message_media_results (
    id bigint generated always as identity primary key,
    job_id bigint references wechat_raw.message_media_jobs(id) on delete set null,
    dedupe_key text not null,
    job_type text not null,
    guid text,
    msg_id text,
    target_table text,
    local_media_path text,
    remote_media_url text,
    voice_trans_text text,
    result_json jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (dedupe_key, job_type)
);

alter table if exists wechat_raw.message_media_results
    add column if not exists job_id bigint,
    add column if not exists dedupe_key text,
    add column if not exists job_type text,
    add column if not exists guid text,
    add column if not exists msg_id text,
    add column if not exists target_table text,
    add column if not exists local_media_path text,
    add column if not exists remote_media_url text,
    add column if not exists voice_trans_text text,
    add column if not exists result_json jsonb,
    add column if not exists created_at timestamptz default now(),
    add column if not exists updated_at timestamptz default now();

create unique index if not exists idx_message_media_results_dedupe_job_type
    on wechat_raw.message_media_results (dedupe_key, job_type);

create table if not exists wechat_raw.cdn_runtime_state (
    id bigint generated always as identity primary key,
    guid text not null unique,
    username text,
    cdn_info text,
    device_type text,
    client_version text,
    fetched_at timestamptz not null,
    expires_at timestamptz not null,
    updated_at timestamptz not null default now()
);

alter table if exists wechat_raw.cdn_runtime_state
    add column if not exists guid text,
    add column if not exists username text,
    add column if not exists cdn_info text,
    add column if not exists device_type text,
    add column if not exists client_version text,
    add column if not exists fetched_at timestamptz,
    add column if not exists expires_at timestamptz,
    add column if not exists updated_at timestamptz default now();

create unique index if not exists idx_cdn_runtime_state_guid
    on wechat_raw.cdn_runtime_state (guid);

alter table if exists wechat_raw.wechat_group_message_events
    add column if not exists local_media_path text,
    add column if not exists remote_media_url text,
    add column if not exists voice_trans_text text,
    add column if not exists media_task_status text,
    add column if not exists media_task_updated_at timestamptz;

alter table if exists wechat_raw.wechat_private_message_events
    add column if not exists local_media_path text,
    add column if not exists remote_media_url text,
    add column if not exists voice_trans_text text,
    add column if not exists media_task_status text,
    add column if not exists media_task_updated_at timestamptz;

-- ============================================================================
-- 5. 联系人与群组基础表 (Contacts & Chatrooms)
-- ============================================================================

create table if not exists wechat_raw.wechat_sync_state (
    guid text primary key,
    contact_seq bigint not null default 0,
    room_seq bigint not null default 0,
    updated_at timestamptz not null default now()
);

create table if not exists wechat_raw.wechat_contacts (
    guid text not null,
    username text not null,
    nickname text,
    remark text,
    alias text,
    avatar text,
    avatar_small text,
    avatar_big text,
    py_initial text,
    quan_pin text,
    remark_py_initial text,
    remark_quan_pin text,
    country text,
    province text,
    city text,
    signature text,
    encrypt_username text,
    type integer,
    wechat_contact_type integer,
    gender integer,
    personal_card integer,
    source integer,
    text_status_flag integer,
    friend_username text,
    head_img_md5 text,
    wechat_create_time bigint,
    verify_flag integer,
    bit_val integer,
    bit_mask bigint,
    bit_mask2 numeric(20,0),
    bit_value2 numeric(20,0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (guid, username)
);

create table if not exists wechat_raw.wechat_chatrooms (
    guid text not null,
    room_username text not null,
    room_name text,
    room_remark_name text,
    avatar text,
    owner_username text,
    chatroom_version integer not null default 0,
    chatroom_info_version integer not null default 0,
    member_version bigint not null default 0,
    member_count integer,
    all_member_count integer,
    admin_count integer,
    chatroom_status bigint,
    business_type text,
    announcement text,
    announcement_editor text,
    xml_announcement text,
    announcement_publish_time bigint,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (guid, room_username)
);

create table if not exists wechat_raw.wechat_chatroom_members (
    guid text not null,
    room_username text not null,
    room_name text,
    room_remark_name text,
    username text not null,
    nickname text,
    display_name text,
    inviter_username text,
    avatar_small text,
    avatar_big text,
    member_flag bigint,
    status integer,
    join_scene_xml text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (guid, room_username, username)
);


-- ============================================================================
-- 6. Contact sync queue and name snapshots
-- ============================================================================

alter table if exists wechat_raw.wechat_group_message_events
    add column if not exists sender_display_name text,
    add column if not exists sender_alias text,
    add column if not exists room_name text,
    add column if not exists room_remark_name text;

alter table if exists wechat_raw.wechat_private_message_events
    add column if not exists sender_display_name text,
    add column if not exists sender_alias text,
    add column if not exists receiver_display_name text,
    add column if not exists peer_display_name text;

alter table if exists wechat_raw.wechat_sync_state
    add column if not exists last_full_sync_at timestamptz,
    add column if not exists last_incremental_sync_at timestamptz,
    add column if not exists last_event_sync_at timestamptz;

alter table if exists wechat_raw.wechat_contacts
    add column if not exists is_deleted boolean default false,
    add column if not exists last_synced_at timestamptz default now(),
    add column if not exists raw_json jsonb;

alter table if exists wechat_raw.wechat_chatrooms
    add column if not exists is_deleted boolean default false,
    add column if not exists last_synced_at timestamptz default now(),
    add column if not exists raw_json jsonb,
    add column if not exists room_remark_name text,
    add column if not exists announcement text,
    add column if not exists announcement_editor text,
    add column if not exists xml_announcement text;

alter table if exists wechat_raw.wechat_chatroom_members
    add column if not exists room_name text,
    add column if not exists room_remark_name text,
    add column if not exists is_deleted boolean default false,
    add column if not exists last_synced_at timestamptz default now(),
    add column if not exists raw_json jsonb;

create index if not exists idx_wechat_contacts_guid_type
    on wechat_raw.wechat_contacts (guid, type);
create index if not exists idx_wechat_contacts_guid_updated_at
    on wechat_raw.wechat_contacts (guid, updated_at desc);
create index if not exists idx_wechat_chatrooms_guid_updated_at
    on wechat_raw.wechat_chatrooms (guid, updated_at desc);
create index if not exists idx_wechat_chatroom_members_guid_room_username
    on wechat_raw.wechat_chatroom_members (guid, room_username);

create table if not exists wechat_raw.wechat_contact_sync_jobs (
    id bigint generated always as identity primary key,
    dedupe_key text not null unique,
    job_type text not null check (job_type in ('incremental_sync', 'contact_change', 'room_sync')),
    guid text not null,
    username text,
    room_username text,
    notify_type integer,
    payload jsonb,
    status text not null default 'pending' check (status in ('pending', 'processing', 'retrying', 'success', 'failed')),
    attempt_count integer not null default 0,
    next_retry_at timestamptz,
    last_error text,
    processing_started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_wechat_contact_sync_jobs_poll
    on wechat_raw.wechat_contact_sync_jobs (status, next_retry_at, created_at);
create index if not exists idx_wechat_contact_sync_jobs_guid
    on wechat_raw.wechat_contact_sync_jobs (guid, created_at desc);

-- ============================================================================
-- 7. Formal CRM WeChat projection layer
-- ============================================================================

drop table if exists public.crm_wechat_group_message;
drop table if exists public.crm_wechat_group_member;
drop table if exists public.crm_wechat_group;
drop table if exists public.crm_wechat_message;
drop table if exists public.crm_wechat_session;
drop table if exists public.crm_wx_binding_candidate;

create table if not exists public.crm_wx_conversation (
    id bigint generated always as identity primary key,
    conversation_key text not null unique,
    source_guid text not null,
    conversation_type text not null check (conversation_type in ('private', 'group')),
    conversation_identity_type text not null default 'private_direct'
        check (conversation_identity_type in ('group', 'private_direct', 'private_forward_batch', 'private_internal', 'private_name')),
    is_internal_chat boolean not null default false,
    forward_batch_key text,
    my_wechat_id text,
    my_wechat_name text,
    peer_wechat_id text,
    peer_wechat_name text,
    peer_name_tokens text[] not null default '{}',
    room_username text,
    conversation_name text,
    room_name text,
    room_remark_name text,
    customer_id text,
    primary_contact_id text,
    owner_employee_id text,
    status text not null default 'active' check (status in ('active', 'archived')),
    last_message_id bigint,
    last_message_at timestamptz,
    last_message_preview text,
    message_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_crm_wx_conversation_guid_type
    on public.crm_wx_conversation (source_guid, conversation_type);
create index if not exists idx_crm_wx_conversation_guid_last_message_at
    on public.crm_wx_conversation (source_guid, last_message_at desc);
create index if not exists idx_crm_wx_conversation_private_identity
    on public.crm_wx_conversation (source_guid, conversation_type, conversation_identity_type, is_internal_chat, my_wechat_id);
create index if not exists idx_crm_wx_conversation_forward_batch_key
    on public.crm_wx_conversation (forward_batch_key);
create index if not exists idx_crm_wx_conversation_peer_name_tokens
    on public.crm_wx_conversation using gin (peer_name_tokens);
create index if not exists idx_crm_wx_conversation_customer_id
    on public.crm_wx_conversation (customer_id);
create index if not exists idx_crm_wx_conversation_primary_contact_id
    on public.crm_wx_conversation (primary_contact_id);

create table if not exists public.crm_wx_message (
    id bigint generated always as identity primary key,
    conversation_id bigint not null references public.crm_wx_conversation(id) on delete cascade,
    source_guid text not null,
    message_scope text not null check (message_scope in ('private', 'group')),
    message_origin_type text not null default 'unknown'
        check (message_origin_type in ('private_forward', 'group_forward', 'group_live', 'unknown')),
    raw_event_table text not null check (raw_event_table in (
        'wechat_raw.wechat_private_message_events',
        'wechat_raw.wechat_group_message_events',
        'wechat_raw.wework_private_message_events',
        'wechat_raw.wework_group_message_events'
    )),
    raw_event_dedupe_key text not null,
    raw_msg_id text,
    sender_wechat_id text,
    sender_display_name text,
    sender_alias text,
    receiver_wechat_id text,
    receiver_display_name text,
    peer_display_name text,
    forward_batch_key text,
    room_username text,
    room_name text,
    room_remark_name text,
    msg_type integer,
    content text,
    quote_content text,
    quote_msg_type integer,
    quote_remote_media_url text,
    quote_file_name text,
    send_time timestamptz,
    remote_media_url text,
    local_media_path text,
    voice_trans_text text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (raw_event_table, raw_event_dedupe_key)
);

create index if not exists idx_crm_wx_message_conversation_send_time
    on public.crm_wx_message (conversation_id, send_time desc);
create index if not exists idx_crm_wx_message_source_guid_send_time
    on public.crm_wx_message (source_guid, send_time desc);
create index if not exists idx_crm_wx_message_sender_wechat_id
    on public.crm_wx_message (sender_wechat_id);
create index if not exists idx_crm_wx_message_room_username
    on public.crm_wx_message (room_username);

create table if not exists public.crm_wx_conversation_member (
    id bigint generated always as identity primary key,
    conversation_id bigint not null references public.crm_wx_conversation(id) on delete cascade,
    wechat_id text not null,
    display_name text,
    member_type text not null default 'external_unknown'
        check (member_type in ('customer_contact', 'employee', 'external_unknown')),
    contact_id text,
    employee_id text,
    is_internal boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (conversation_id, wechat_id)
);

create index if not exists idx_crm_wx_conversation_member_contact_id
    on public.crm_wx_conversation_member (contact_id);
create index if not exists idx_crm_wx_conversation_member_wechat_id
    on public.crm_wx_conversation_member (wechat_id);

create table if not exists public.crm_customer_message_session (
    id text primary key,
    customer_id text not null,
    contact_id text,
    channel text not null default 'wechat_private'
        check (channel in ('wechat_private')),
    source_sender_key text not null,
    source_sender_wechat_id text,
    source_sender_display_name text,
    title text not null,
    message_count integer not null default 0,
    last_message_at timestamptz,
    last_message_preview text,
    status text not null default 'active'
        check (status in ('active', 'archived')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_crm_customer_message_session_customer_id
    on public.crm_customer_message_session (customer_id, created_at desc);
create index if not exists idx_crm_customer_message_session_contact_id
    on public.crm_customer_message_session (contact_id);
create index if not exists idx_crm_customer_message_session_sender_key
    on public.crm_customer_message_session (source_sender_key);

create table if not exists public.crm_customer_message_session_item (
    id bigint generated always as identity primary key,
    session_id text not null references public.crm_customer_message_session(id) on delete cascade,
    wx_message_id bigint not null references public.crm_wx_message(id) on delete cascade,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    unique (session_id, wx_message_id),
    unique (wx_message_id)
);

create index if not exists idx_crm_customer_message_session_item_session_id
    on public.crm_customer_message_session_item (session_id, sort_order asc, wx_message_id asc);

drop view if exists public.crm_wx_sender_inbox_v;
create view public.crm_wx_sender_inbox_v as
with private_messages as (
    select
        m.id,
        m.send_time,
        coalesce(m.content, '') as content,
        nullif(btrim(c.my_wechat_id), '') as sender_wechat_id,
        nullif(btrim(c.my_wechat_name), '') as sender_display_name,
        coalesce(
            nullif(btrim(c.my_wechat_id), ''),
            lower(nullif(btrim(c.my_wechat_name), ''))
        ) as sender_key
    from public.crm_wx_message m
    join public.crm_wx_conversation c on c.id = m.conversation_id
    where m.message_scope = 'private'
      and coalesce(nullif(btrim(c.my_wechat_id), ''), nullif(btrim(c.my_wechat_name), '')) is not null
),
latest_messages as (
    select distinct on (pm.sender_key)
        pm.sender_key,
        pm.send_time as last_message_at,
        pm.content as last_message_preview
    from private_messages pm
    order by pm.sender_key, pm.send_time desc nulls last, pm.id desc
)
select
    pm.sender_key,
    max(pm.sender_wechat_id) filter (where pm.sender_wechat_id is not null) as sender_wechat_id,
    max(pm.sender_display_name) filter (where pm.sender_display_name is not null) as sender_display_name,
    count(*)::integer as message_count,
    lm.last_message_at,
    lm.last_message_preview,
    count(cmsi.wx_message_id)::integer as archived_message_count
from private_messages pm
join latest_messages lm on lm.sender_key = pm.sender_key
left join public.crm_customer_message_session_item cmsi on cmsi.wx_message_id = pm.id
group by pm.sender_key, lm.last_message_at, lm.last_message_preview;

create table if not exists public.crm_wx_projection_jobs (
    id bigint generated always as identity primary key,
    dedupe_key text not null unique,
    source_guid text not null,
    raw_event_table text not null,
    raw_event_dedupe_key text not null,
    job_type text not null check (job_type in ('project_message')),
    status text not null default 'pending' check (status in ('pending', 'processing', 'retrying', 'success', 'failed')),
    attempt_count integer not null default 0,
    next_retry_at timestamptz,
    last_error text,
    processing_started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_crm_wx_projection_jobs_poll
    on public.crm_wx_projection_jobs (status, next_retry_at, created_at);
create index if not exists idx_crm_wx_projection_jobs_source_guid
    on public.crm_wx_projection_jobs (source_guid, created_at desc);
alter table if exists public.crm_wx_conversation
    add column if not exists last_member_sync_version bigint not null default 0,
    add column if not exists last_member_synced_at timestamptz;

alter table if exists public.crm_wx_conversation
    add column if not exists room_name text,
    add column if not exists room_remark_name text,
    add column if not exists my_wechat_name text,
    add column if not exists peer_wechat_name text,
    add column if not exists conversation_identity_type text not null default 'private_direct',
    add column if not exists is_internal_chat boolean not null default false,
    add column if not exists forward_batch_key text,
    add column if not exists peer_name_tokens text[] not null default '{}';

alter table if exists public.crm_wx_message
    add column if not exists room_remark_name text,
    add column if not exists sender_alias text,
    add column if not exists message_origin_type text,
    add column if not exists quote_content text,
    add column if not exists quote_msg_type integer,
    add column if not exists quote_remote_media_url text,
    add column if not exists quote_file_name text,
    add column if not exists forward_batch_key text;

create index if not exists idx_crm_wx_conversation_private_identity
    on public.crm_wx_conversation (source_guid, conversation_type, conversation_identity_type, is_internal_chat, my_wechat_id);
create index if not exists idx_crm_wx_conversation_forward_batch_key
    on public.crm_wx_conversation (forward_batch_key);
create index if not exists idx_crm_wx_conversation_peer_name_tokens
    on public.crm_wx_conversation using gin (peer_name_tokens);
