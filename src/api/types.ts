export type JobStatus = 'queued' | 'running' | 'completed' | 'failed'
export type JobKind = 'single_video' | 'topic' | 'unknown'

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

export interface LoginResponse {
  token: string
  token_type: 'Bearer'
  user: {
    id: number
    username: string
    display_name: string
  }
  prompt_settings: PromptSettings
}

export interface MeResponse {
  user: {
    id: number
    username: string
    display_name?: string
    is_active?: number
    created_at?: string
    updated_at?: string
  }
  prompt_settings: PromptSettings
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
}

export interface JobCreateResponse {
  job_id: string
  status: JobStatus
  created_at: string
}

export interface VideoRunState {
  bili_url: string
  title?: string
  status: 'pending' | 'completed' | 'failed'
  index?: number
  error?: string
  pipeline_result?: {
    task_state?: string
    note_md?: string
    transcript_text_len?: number
    note_model?: string
  }
}

export interface TopicSelectedVideo {
  index?: number
  title?: string
  url?: string
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
  cleanup_deleted?: Record<string, string>
}

export interface TopicJobResult {
  mode: 'topic_multi_search'
  topic_session_state?: string
  merged_note_md?: string
  merged_note_model?: string
  selected_videos?: TopicSelectedVideo[]
  video_count?: number
  video_runs?: VideoRunState[]
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

