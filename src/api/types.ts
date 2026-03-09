export type JobStatus = 'queued' | 'running' | 'waiting_user_pick' | 'completed' | 'failed'
export type JobKind = 'single_video' | 'topic' | 'unknown'
export type UserRole = 'admin' | 'user' | 'tryuser'

export interface PromptSettings {
  user_id: number
  md_prompt_customization: string
  md_prompt_ai_generated: string | null
  updated_at: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  display_name?: string
}

export interface AuthUserProfile {
  id: number
  username: string
  display_name: string
  role: UserRole
  chat_quota_total: number
  chat_quota_used: number
  chat_quota_remaining: number
  is_active?: number
  created_at?: string
  updated_at?: string
}

export interface LoginResponse {
  token: string
  token_type: 'Bearer'
  user: AuthUserProfile
  prompt_settings: PromptSettings
}

export interface MeResponse {
  user: AuthUserProfile
  prompt_settings: PromptSettings
}

export type RegisterResponse = LoginResponse

export interface AdminUserCreateRequest {
  username: string
  password: string
  display_name?: string
  role: UserRole
  chat_quota_total?: number | null
  is_active?: boolean
}

export interface AdminUserUpdateRequest {
  display_name?: string
  password?: string
  role?: UserRole
  chat_quota_total?: number | null
  chat_quota_used?: number | null
  is_active?: boolean
}

export interface AdminUsersListResponse {
  ok: boolean
  items: AuthUserProfile[]
  total: number
}

export interface AdminUserUpsertResponse {
  ok: boolean
  item: AuthUserProfile
}

export interface PromptCurrentResponse {
  user: { id: number; username: string }
  md_prompt_customization: string
  md_prompt_ai_generated: string | null
  effective_prompt_preview: string
  note: string
}

export interface PromptUpdateRequest {
  md_prompt_customization: string
}

export interface PromptAIGenerateRequest {
  user_goal: string
  extra_preferences?: string
  auto_save?: boolean
}

export interface PromptAIGenerateResponse {
  ok: boolean
  generated_prompt: string
  model_name: string
  auto_saved: boolean
  prompt_settings: PromptSettings | null
}

export interface JobCreateRequest {
  user_input: string
  browser_mode?: 'playwright'
  search_limit?: number
  search_timeout?: number
  search_pages?: number
  search_scroll_rounds?: number
  topic_target_videos?: number
  topic_max_search_rounds?: number
  keep_intermediate_audio?: boolean
  playwright_headless?: boolean
  search_headless?: boolean
  pipeline_model_name?: string
}

export interface JobCreateResponse {
  job_id: string
  status: JobStatus
  created_at: string
}

export interface AdminJobPushLogEvent {
  type?: string
  ts?: string
  message?: string
  raw_message?: string
  public_message?: string
  [key: string]: unknown
}

export interface AdminJobPushLogsResponse {
  ok: boolean
  job_id: string
  count: number
  items: AdminJobPushLogEvent[]
}

export interface VideoRunState {
  bili_url: string
  title?: string
  status: 'pending' | 'waiting_user_pick' | 'queued' | 'running' | 'completed' | 'failed'
  index?: number
  error?: string
  child_job_id?: string
  note_preview?: string
  note_ready?: boolean
  queue_item_status?: string
  queue_runtime?: Record<string, unknown>
  pipeline_result?: {
    task_state?: string
    note_md?: string
    transcript_text_len?: number
    note_model?: string
    knowledge_reused?: boolean
  }
}

export interface QueueRuntimeInfo {
  job_id?: string
  queue_status?: string
  global_position?: number | null
  user_position?: number | null
  global_pending_count?: number
  user_pending_count?: number
  queue_group_id?: string
  parent_job_id?: string
  worker_id?: string
}

export interface TopicQueueBatchSummary {
  queue_group_id?: string
  parent_job_id?: string
  chat_session_uuid?: string
  status?: string
  all_selected_count?: number
  selected_count?: number
  queued_count?: number
  running_count?: number
  completed_count?: number
  failed_count?: number
  waiting_pick_count?: number
  global_pending_count?: number
  user_pending_count?: number
  global_position?: number | null
  user_position?: number | null
  current_processing_item?: {
    index?: number
    title?: string
    child_job_id?: string
  } | null
  completed_items?: Array<{
    index?: number
    title?: string
    bili_url?: string
    child_job_id?: string
    note_preview?: string
    knowledge_reused?: boolean
  }>
  items?: VideoRunState[]
}

export interface TopicSelectedVideo {
  index?: number
  title?: string
  url?: string
  cover?: string
  up?: string
  duration?: string
  stats?: string
  reason?: string
  from_keyword?: string
  [key: string]: unknown
}

export interface SingleVideoJobResult {
  audio_url?: string
  raw_audio?: string
  mp3?: string
  vocals_wav?: string
  transcript_text_len?: number
  note_md?: string
  note_model?: string
  task_state?: string
  queue_runtime?: QueueRuntimeInfo
  cleanup_deleted?: Record<string, string>
}

export interface TopicJobResult {
  mode: 'topic_multi_search'
  task_state?: string
  topic_session_state?: string
  merged_note_md?: string
  merged_note_model?: string
  selected_videos?: TopicSelectedVideo[]
  video_count?: number
  video_runs?: VideoRunState[]
  queue_batch?: TopicQueueBatchSummary
  queue_runtime?: QueueRuntimeInfo
}

export interface JobSnapshot {
  job_id: string
  user_input: string
  user_id: number | null
  username: string | null
  created_at: string
  updated_at: string
  status: JobStatus
  kind: JobKind
  stage: string
  detail: string
  error: string | null
  result: SingleVideoJobResult | TopicJobResult | Record<string, unknown> | null
}

export interface JobNoteLinkResponse {
  job_id: string
  download_url: string
  file_name: string
  abs_path: string
}

export interface DebugExtractRequest {
  bili_url: string
  timeout_s?: number
  headless?: boolean
}

export interface DebugExtractResponse {
  ok?: boolean
  video_url?: string
  audio_url?: string
  source?: string
  captures?: Array<Record<string, unknown>>
  errors?: Array<unknown>
  [key: string]: unknown
}

export type JobEvent =
  | { type?: 'job_created'; ts?: string; input?: string }
  | { type: 'status'; ts?: string; stage?: string; detail?: string }
  | { type: 'log'; ts?: string; message?: string }
  | { type: 'completed'; ts?: string; result?: unknown }
  | { type: 'failed'; ts?: string; error?: string; traceback?: string }
  | { ts?: string }

export interface ChatSession {
  id?: number
  session_uuid: string
  user_id?: number
  title?: string
  created_at?: string
  updated_at?: string
  last_message_at?: string | null
}

export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant' | string
  content: string
  meta?: {
    images?: ChatImageAttachment[]
    quote?: ChatQuoteReference | null
    auto_task?: boolean
    search_modes?: string[]
    model_name?: string | null
    tool_decision?: {
      should_create_job?: boolean
      reason?: string
    }
    task?: JobCreateResponse | null
    task_snapshot?: {
      job_id?: string
      kind?: string
      status?: string
      task_state?: string
      video_count?: number
      selected_videos?: TopicSelectedVideo[]
      queue_batch?: TopicQueueBatchSummary | null
      result?: Record<string, unknown> | null
    } | null
    knowledge_lookup?: {
      used?: boolean
      reason?: string
    }
    knowledge_hits?: Array<{
      id?: number
      doc_type?: 'video' | 'topic' | string
      title?: string
      source_url?: string
      up_name?: string
      duration_text?: string
      snippet?: string
      note_model?: string
      updated_at?: string
      score?: number
      [key: string]: unknown
    }>
    search_dispatch?: {
      enabled?: boolean
      kb_sufficient?: boolean
      tasks?: Array<Record<string, unknown>>
      result_count?: number
    }
    [key: string]: unknown
  }
  created_at?: string
}

export interface ChatImageAttachment {
  url: string
  file_name?: string
  mime_type?: string
  size?: number | null
  bucket?: string
  object_name?: string
}

export interface ChatQuoteReference {
  label?: string
  content?: string
}

export interface ChatModelItem {
  id?: number
  model_name: string
  display_name?: string
  provider?: string
  sort_order?: number
  is_enabled?: number
}

export interface ChatSessionCreateResponse {
  ok: boolean
  session: ChatSession
}

export interface ChatSessionsResponse {
  ok: boolean
  items: ChatSession[]
}

export interface ChatModelsResponse {
  ok: boolean
  items: ChatModelItem[]
}

export interface ChatMessagesResponse {
  ok: boolean
  items: ChatMessage[]
}

export interface ChatReplyRequest {
  content: string
  client_request_id?: string
  images?: ChatImageAttachment[]
  quote?: ChatQuoteReference | null
  model_name?: string
  auto_task?: boolean
  search_modes?: string[]
  search_limit?: number
  search_timeout?: number
  search_pages?: number
  search_scroll_rounds?: number
  topic_target_videos?: number
  topic_max_search_rounds?: number
  keep_intermediate_audio?: boolean
  playwright_headless?: boolean
  search_headless?: boolean
  pipeline_model_name?: string
}

export interface ChatImageUploadResponse {
  ok: boolean
  image: ChatImageAttachment
}

export interface ChatImageDeleteResponse {
  ok: boolean
  bucket: string
  object_name: string
}

export interface ChatReplyStopRequest {
  client_request_id: string
}

export interface ChatReplyStopResponse {
  ok: boolean
  session_uuid: string
  client_request_id: string
  stopped: boolean
}

export interface ChatReplyResponse {
  ok: boolean
  session_uuid: string
  assistant_message: ChatMessage
  task: JobCreateResponse | null
  tool_decision?: {
    should_create_job?: boolean
    reason?: string
  }
  search_dispatch?: {
    enabled?: boolean
    kb_sufficient?: boolean
    tasks?: Array<Record<string, unknown>>
    result_count?: number
  }
}

export interface ChatSelectCandidateVideoRequest {
  video_index?: number
  video_url?: string
}

export interface ChatSelectCandidateVideoResponse {
  ok: boolean
  session_uuid: string
  parent_job_id: string
  selected_video?: TopicSelectedVideo | null
  task: JobCreateResponse | null
  assistant_message?: ChatMessage | null
  queue_batch?: TopicQueueBatchSummary | null
}

export interface ChatSelectCandidateVideosBatchRequest {
  video_indexes?: number[]
  video_urls?: string[]
}

export interface ChatSelectCandidateVideosBatchResponse {
  ok: boolean
  session_uuid: string
  parent_job_id: string
  queue_group_id?: string
  enqueued_tasks?: Array<{
    job_id: string
    title?: string
    video_url?: string
    status?: string
    index?: number
  }>
  skipped_existing?: Array<Record<string, unknown>>
  assistant_message?: ChatMessage | null
  queue_batch?: TopicQueueBatchSummary | null
}

export interface ChatJobNoteMessageRequest {
  markdown_text: string
  file_name?: string
}

export interface ChatJobNoteMessageResponse {
  ok: boolean
  session_uuid: string
  job_id: string
  created: boolean
  assistant_message: ChatMessage
}
