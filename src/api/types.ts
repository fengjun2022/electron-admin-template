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

export interface NoteImageAsset {
  second?: number
  time_label?: string
  summary?: string
  caption?: string
  score?: number
  review_reason?: string
  image_path?: string
  url?: string
  bucket?: string
  object_name?: string
  file_name?: string
  mime_type?: string
  markdown_image?: string
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
  note_images?: NoteImageAsset[]
  note_image_upload_errors?: Array<Record<string, unknown>>
  note_image_reviews?: Array<Record<string, unknown>>
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

export type AgentTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'degraded'
  | 'retrying'
  | 'blocked'
  | 'skipped'

export type AgentDecisionType =
  | 'continue_next_step'
  | 'start_parallel_tasks'
  | 'merge_partial_results'
  | 'retry_failed_step'
  | 'fallback_to_degraded_mode'
  | 'replan_workflow'
  | 'wait_for_required_dependency'
  | 'finalize_output'

export interface AgentWorkflowTask {
  task_id: string
  task_name?: string
  task_goal?: string
  task_type?: string
  inputs?: unknown[]
  expected_output?: string
  dependencies?: string[]
  can_run_in_parallel?: boolean
  priority?: number
  assigned_agent?: string
  status?: AgentTaskStatus | string
  summary_for_ui?: string
  detail?: string
  updated_at?: string
}

export interface AgentWorkflowTraceRow {
  task_id: string
  status?: AgentTaskStatus | string
  raw_result?: unknown
  compressed_result?: {
    what_was_done?: string
    key_result?: string
    success?: boolean
    has_error?: boolean
    error_summary?: string
    recoverable?: boolean
    next_step_suggestion?: string
  }
  ts?: string
}

export interface AgentWorkflowErrorRow {
  task_id?: string
  error_type?: string
  error_message?: string
  impact_scope?: string
  recovery_action?: string
  recovery_status?: string
  ts?: string
}

export interface AgentWorkflowResource {
  resource_title?: string
  resource_type?: string
  learning_stage?: string
  recommended_reason?: string
  is_playlist?: boolean
  resource_group_type?: 'single_video' | 'playlist' | 'course' | string
  fits_current_level?: boolean
  recommended_priority?: number
  url?: string
  page_url?: string
  play_url?: string
  cover?: string
  up?: string
  duration?: string
  stats?: string
  platform?: string
}

export interface AgentWorkflow {
  user_request?: string
  recognized_intent?: Record<string, unknown>
  master_plan?: {
    main_goal?: string
    workflow_status?: AgentTaskStatus | string
    current_stage?: string
    reasoning_summary?: string
  }
  task_graph?: AgentWorkflowTask[]
  execution_trace?: AgentWorkflowTraceRow[]
  parallel_branches?: Array<{
    branch_id?: string
    branch_name?: string
    included_tasks?: string[]
    status?: AgentTaskStatus | string
  }>
  error_handling?: AgentWorkflowErrorRow[]
  resource_recommendations?: {
    single_videos?: AgentWorkflowResource[]
    playlists?: AgentWorkflowResource[]
    courses?: AgentWorkflowResource[]
  }
  master_decision?: {
    decision?: AgentDecisionType | string
    reason?: string
    next_actions?: string[]
  }
  final_output?: {
    answer?: string
    notes?: string[]
    attachments?: Array<Record<string, unknown>>
  }
  updated_at?: string
}

export interface AgentWorkflowStateItem {
  scope: 'chat' | 'job' | string
  state_key: string
  user_id?: number | null
  username?: string | null
  session_uuid?: string | null
  job_id?: string | null
  request_id?: string | null
  status?: AgentTaskStatus | string
  workflow?: AgentWorkflow | null
  artifacts?: Record<string, unknown> | null
  resource_recommendations?: {
    single_videos?: AgentWorkflowResource[]
    playlists?: AgentWorkflowResource[]
    courses?: AgentWorkflowResource[]
  } | null
  created_at?: string
  updated_at?: string
  finished_at?: string | null
}

export interface AgentWorkflowStateResponse {
  ok: boolean
  item: AgentWorkflowStateItem
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
  agent_workflow?: AgentWorkflow | null
  agent_artifacts?: Record<string, unknown> | null
  resource_recommendations?: {
    single_videos?: AgentWorkflowResource[]
    playlists?: AgentWorkflowResource[]
    courses?: AgentWorkflowResource[]
  } | null
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
  | {
      type: 'agent_update'
      ts?: string
      scope?: 'chat' | 'job' | string
      workflow?: AgentWorkflow | null
      delta?: {
        kind?: 'task_status' | 'trace' | 'decision' | 'error' | 'resource' | 'final_output' | string
        task_id?: string
        status?: AgentTaskStatus | string
      }
    }
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
    agent_workflow_state_key?: string | null
    agent_workflow?: AgentWorkflow | null
    resource_recommendations?: {
      single_videos?: AgentWorkflowResource[]
      playlists?: AgentWorkflowResource[]
      courses?: AgentWorkflowResource[]
    } | null
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

export interface PlaylistSeriesResolveRequest {
  url: string
  title?: string
}

export interface PlaylistSeriesItem extends TopicSelectedVideo {
  playlist_index?: number
  playlist_title?: string
  playlist_url?: string
}

export interface PlaylistSeriesResolveResponse {
  ok: boolean
  source_url: string
  source_title?: string
  total?: number
  items: PlaylistSeriesItem[]
}

export interface ChatPlaylistPreviewMessageRequest {
  source_title?: string
  source_url?: string
  items: PlaylistSeriesItem[]
}

export interface ChatPlaylistPreviewMessageResponse {
  ok: boolean
  session_uuid: string
  message: ChatMessage
}

export interface PlaylistEpisodeNoteBindingRequest {
  playlist_source_url?: string
  playlist_title?: string
  episode_index?: number | null
  episode_title?: string
  episode_url: string
  child_job_id?: string
  note_status?: 'pending' | 'ready' | 'failed' | string
  note_file_name?: string
  note_message_id?: number | null
}

export interface PlaylistEpisodeNoteItem {
  id?: number
  playlist_message_id?: number
  playlist_source_url?: string
  playlist_title?: string
  episode_index?: number
  episode_title?: string
  episode_url?: string
  canonical_episode_url?: string
  child_job_id?: string
  note_status?: 'pending' | 'ready' | 'failed' | string
  note_file_name?: string
  note_message_id?: number | null
  knowledge_video_note_id?: number | null
  markdown_text?: string
  note_md_path?: string
  note_model?: string
  created_at?: string | null
  updated_at?: string | null
}

export interface PlaylistEpisodeNotesResponse {
  ok: boolean
  session_uuid: string
  playlist_message_id: number
  items: PlaylistEpisodeNoteItem[]
}

export interface PlaylistEpisodeNoteUpsertResponse {
  ok: boolean
  session_uuid: string
  playlist_message_id: number
  item: PlaylistEpisodeNoteItem | null
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
