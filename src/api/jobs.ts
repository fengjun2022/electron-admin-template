import { apiRequest, buildApiUrl, getAuthToken } from './client'
import type { JobCreateRequest, JobCreateResponse, JobNoteLinkResponse, JobSnapshot } from './types'

export function createJobApi(payload: JobCreateRequest) {
  return apiRequest<JobCreateResponse>('/jobs', {
    method: 'POST',
    body: payload,
    auth: true,
  })
}

export function getJobApi(jobId: string) {
  return apiRequest<JobSnapshot>(`/jobs/${jobId}`, {
    method: 'GET',
    auth: true,
  })
}

export function getJobNoteApi(jobId: string) {
  return apiRequest<string>(`/jobs/${jobId}/note`, {
    method: 'GET',
    auth: true,
  })
}

export function getJobNoteLinkApi(jobId: string) {
  return apiRequest<JobNoteLinkResponse>(`/jobs/${jobId}/note-link`, {
    method: 'GET',
    auth: true,
  })
}

export function deleteJobApi(jobId: string) {
  return apiRequest<{ ok: boolean; job_id: string }>(`/jobs/${jobId}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function buildJobEventsUrl(jobId: string) {
  const u = new URL(buildApiUrl(`/jobs/${jobId}/events`))
  const token = getAuthToken()
  if (token) u.searchParams.set('token', token)
  return u.toString()
}

export function buildJobEventsWsUrl(jobId: string) {
  const httpUrl = buildApiUrl(`/jobs/${jobId}/ws`)
  const u = new URL(httpUrl)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  const token = getAuthToken()
  if (token) u.searchParams.set('token', token)
  return u.toString()
}

export function buildJobNoteDownloadUrl(jobId: string) {
  return buildApiUrl(`/jobs/${jobId}/note/download`)
}
