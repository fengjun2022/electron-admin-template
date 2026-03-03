<template>
  <div class="p-2 h-full overflow-hidden">
    <div class="home-shell h-full">
      <div class="h-full home-main-pane">
        <n-card :bordered="false" class="h-full home-main-card">
          <div class="h-full flex flex-col">
            <div class="px-2 pb-2 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">

                <n-dropdown trigger="click" :options="modelDropdownOptions" @select="handleModelSelect">
                  <button type="button" class="model-inline-trigger" :disabled="modelsLoading">
                    <span class="model-inline-trigger__label">模型</span>
                    <span class="model-inline-trigger__value">{{ selectedModelDisplayName }}</span>
                    <n-icon :component="ChevronDownOutline" size="14" class="opacity-60" />
                  </button>
                </n-dropdown>
              </div>
              <div class="text-xs opacity-60 shrink-0">{{ modelsLoading ? '模型加载中...' : '' }}</div>
            </div>

            <div ref="messagesContainerRef" class="flex-1 min-h-0 overflow-auto px-1 py-1">
              <div class="space-y-4">
                <div v-if="loadingSessionMessages" class="h-full min-h-[220px] flex items-center justify-center">
                  <div class="flex flex-col items-center gap-3 text-sm opacity-75">
                    <n-spin size="small" />
                    <span>正在加载历史会话...</span>
                  </div>
                </div>
                <div v-else-if="messages.length === 0" class="h-full min-h-[220px] flex items-center justify-center">
                  <div class="max-w-xl px-6">
                    <div class="text-lg font-semibold mb-2 text-center">我是小知,你可以和我对话或让我为你创建一个知识检索任务</div>
                    <div class="text-sm opacity-70 whitespace-nowrap leading-6 text-left">
                      你可以先问功能、问概念、问思路。需要我去 B 站检索并整理笔记时，再打开“知识检索”发送即可。
                    </div>
                  </div>
                </div>

                <div
                  v-for="msg in messages"
                  :key="msg.localId"
                  class="flex gap-3"
                  :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
                >
                  <template v-if="msg.role !== 'user'">
                    <div class="mt-1 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ai-avatar">
                      AI
                    </div>
                  </template>

                  <div class="max-w-[86%]">
                    <div class="text-xs opacity-65 mb-1 px-1">
                      {{ msg.role === 'user' ? currentUserLabel : '小知AI' }}
                    </div>
                    <div
                      class="rounded-2xl px-4 py-3 message-bubble"
                      :class="[
                        msg.role === 'user' ? 'message-user' : 'message-assistant',
                        msg.renderAsMarkdown ? 'message-bubble--markdown' : 'whitespace-pre-wrap break-words',
                        msg.pending ? 'message-pending' : '',
                        msg.pending ? 'opacity-70' : '',
                      ]"
                    >
                      <div v-if="msg.pending" class="thinking-indicator text-sm">
                        <span class="thinking-indicator__label">思考中</span>
                        <span class="thinking-indicator__dots" aria-hidden="true">
                          <i></i><i></i><i></i>
                        </span>
                      </div>
                      <div v-else-if="msg.renderAsMarkdown">
                        <div v-if="msg.markdownLabel" class="text-[11px] opacity-60 mb-2">
                          {{ msg.markdownLabel }}
                        </div>
                        <MarkdownContent :source="msg.content" />
                      </div>
                      <div v-else>{{ msg.content }}</div>
                    </div>

                    <div
                      v-if="msg.role === 'assistant' && (msg.task || msg.toolDecisionReason)"
                      class="mt-2 px-1 flex flex-wrap items-center gap-2 text-xs"
                    >
                      <n-tag v-if="msg.task" type="info" size="small">
                        已创建任务：{{ msg.task.job_id }}
                      </n-tag>
                      <n-button
                        v-if="msg.task"
                        text
                        type="primary"
                        size="tiny"
                        @click="openJob(msg.task.job_id)"
                      >
                        查看任务详情
                      </n-button>
                    </div>

                    <div v-if="msg.role === 'assistant' && (msg.knowledgeHits || []).length" class="mt-3 px-1">
                      <div class="rounded-2xl p-3 border border-slate-200/80 bg-white/70 dark:bg-slate-900/30 dark:border-slate-700/60">
                        <div class="flex items-center justify-between gap-2 mb-2">
                          <div class="text-xs opacity-70">知识命中（全局知识库）</div>
                          <n-tag size="small" type="success">{{ (msg.knowledgeHits || []).length }}</n-tag>
                        </div>
                        <div class="space-y-2">
                          <div
                            v-for="(hit, idx) in (msg.knowledgeHits || [])"
                            :key="knowledgeHitKey(hit, idx)"
                            class="rounded-xl border border-slate-200/80 dark:border-slate-700/50 p-3 bg-white/70 dark:bg-slate-800/30"
                          >
                            <div class="flex items-start justify-between gap-3">
                              <div class="min-w-0 flex-1">
                                <div class="text-xs opacity-60 mb-1">
                                  {{ hit.doc_type === 'video' ? '视频笔记' : '主题笔记' }}
                                </div>
                                <div class="text-sm font-medium leading-5 break-words">
                                  {{ String(hit.title || '未命名知识') }}
                                </div>
                                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-70">
                                  <span v-if="hit.up_name">UP：{{ String(hit.up_name) }}</span>
                                  <span v-if="hit.duration_text">时长：{{ String(hit.duration_text) }}</span>
                                </div>
                                <div v-if="hit.snippet" class="text-xs opacity-70 mt-2 break-words">
                                  {{ String(hit.snippet) }}
                                </div>
                              </div>
                              <n-button
                                v-if="hit.source_url"
                                size="tiny"
                                secondary
                                @click="openKnowledgeHitSource(hit)"
                              >
                                查看来源
                              </n-button>
                            </div>
                          </div>
                        </div>
                        <div class="text-xs opacity-60 mt-2">
                          命中的是全局共享知识库结果；如果你仍要重新检索最新视频，可以继续让我创建任务。
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="msg.role === 'assistant' && msg.task?.job_id && shouldRenderCandidatePanel(msg)"
                      class="mt-3 px-1"
                    >
                      <div
                        v-if="jobVideoCandidates(msg.task.job_id).length"
                        class="rounded-2xl p-3 ai-candidate-panel"
                      >
                        <div class="mb-2 flex items-center justify-between gap-2">
                          <div class="text-xs ai-candidate-panel__title">AI 挑选的相关视频（可多选加入任务队列）</div>
                          <div class="flex items-center gap-2">
                            <span class="text-[11px] opacity-70">
                              已选 {{ selectedCandidateCount(msg.task.job_id) }} / {{ jobVideoCandidates(msg.task.job_id).length }}
                            </span>
                            <n-button size="tiny" secondary @click="selectAllCandidates(msg.task.job_id)">全选</n-button>
                            <n-button size="tiny" secondary @click="clearSelectedCandidates(msg.task.job_id)">清空</n-button>
                            <n-button
                              size="tiny"
                              type="primary"
                              @click="selectCandidateVideosBatch(msg.task.job_id)"
                              :loading="isBatchSelecting(msg.task.job_id)"
                              :disabled="!chatSessionUuid || selectedCandidateCount(msg.task.job_id) === 0"
                            >
                              总结选中视频
                            </n-button>
                          </div>
                        </div>

                        <div class="space-y-3">
                          <div
                            v-for="(video, idx) in jobVideoCandidates(msg.task.job_id)"
                            :key="`${msg.task.job_id}-${video.url || video.title || idx}`"
                            class="rounded-2xl p-3 ai-candidate-card"
                          >
                            <div class="flex items-start gap-3">
                              <div class="w-32 shrink-0">
                                <div class="rounded-xl overflow-hidden ai-candidate-cover">
                                  <img
                                    v-if="videoCoverUrl(video)"
                                    :src="videoCoverUrl(video) || undefined"
                                    alt="视频封面"
                                    class="w-full aspect-video object-cover"
                                    loading="lazy"
                                    referrerpolicy="no-referrer"
                                  />
                                  <div v-else class="w-full aspect-video flex items-center justify-center text-[11px] opacity-60">
                                    暂无封面
                                  </div>
                                </div>
                              </div>

                              <div class="min-w-0 flex-1">
                                <label class="inline-flex items-center gap-2 text-xs mb-1 opacity-80 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    :checked="isCandidateSelected(msg.task.job_id, video)"
                                    @change="toggleCandidateSelected(msg.task.job_id, video)"
                                  />
                                  <span>加入队列后总结笔记</span>
                                </label>
                                <div class="text-sm font-semibold leading-5 break-words ai-candidate-card__title">
                                  {{ candidateDisplayTitle(video, idx) }}
                                </div>
                                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ai-candidate-card__meta">
                                  <span v-if="video.up">UP：{{ String(video.up) }}</span>
                                  <span v-if="video.duration">时长：{{ String(video.duration) }}</span>
                                </div>
                                <div v-if="candidateStatItems(video).length" class="mt-2 flex flex-wrap gap-2">
                                  <span
                                    v-for="(it, statIdx) in candidateStatItems(video)"
                                    :key="`${statIdx}-${it.label}-${it.value}`"
                                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ai-candidate-chip"
                                  >
                                    {{ it.label }} {{ it.value }}
                                  </span>
                                </div>
                                <div v-if="video.reason" class="text-xs mt-2 break-words ai-candidate-card__reason">
                                  推荐理由：{{ String(video.reason) }}
                                </div>
                                <div v-if="video.from_keyword" class="text-xs mt-1 ai-candidate-card__keyword">
                                  关键词：{{ String(video.from_keyword) }}
                                </div>
                              </div>
                            </div>

                            <div class="mt-3 flex items-center justify-end">
                              <n-space size="small">
                                <n-button
                                  size="tiny"
                                  secondary
                                  @click="toggleVideoPreview(msg.task.job_id, video)"
                                  :disabled="!videoEmbedUrl(video)"
                                >
                                  {{ activeVideoPreviewKey(msg.task.job_id) === videoPreviewKey(video) ? '收起预览' : '预览' }}
                                </n-button>
                                <n-button
                                  size="tiny"
                                  type="primary"
                                  @click="selectCandidateVideo(msg.task.job_id, video)"
                                  :loading="isSelectingCandidateVideo(msg.task.job_id, video)"
                                  :disabled="!String(video.url || '').trim() || !chatSessionUuid"
                                >
                                  总结笔记
                                </n-button>
                              </n-space>
                            </div>

                            <div
                              v-if="activeVideoPreviewKey(msg.task.job_id) === videoPreviewKey(video) && videoEmbedUrl(video)"
                              class="mt-3 overflow-hidden rounded-lg ai-candidate-preview"
                            >
                              <iframe
                                :src="videoEmbedUrl(video) || undefined"
                                class="w-full aspect-video bg-black"
                                frameborder="0"
                                allowfullscreen
                                scrolling="no"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        v-else-if="isTopicTask(msg.task.job_id)"
                        class="text-xs opacity-60"
                      >
                        候选视频将在任务检索阶段完成后显示在这里。
                      </div>
                    </div>
                  </div>

                  <template v-if="msg.role === 'user'">
                    <div class="mt-1 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold user-avatar">
                      {{ currentUserLabel.slice(0, 1) }}
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <div class="pt-3">
              <div class="rounded-[24px] composer-shell px-4 py-3">
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="knowledge-toggle"
                      :class="{ 'knowledge-toggle--active': knowledgeRetrievalEnabled }"
                      @click="knowledgeRetrievalEnabled = !knowledgeRetrievalEnabled"
                    >
                      知识检索
                    </button>
                    <span class="text-xs opacity-65">
                      {{ knowledgeRetrievalEnabled ? '已开启：允许 AI 创建 B 站检索/转笔记任务（主题内容可直接用问句）' : '未开启：仅聊天，不创建任务；知识问答会优先尝试命中本地 MD 知识库' }}
                    </span>
                  </div>
                </div>

                <n-input
                  v-model:value="userInput"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 8 }"
                  class="chat-composer-input"
                  placeholder="先像聊天一样输入问题（如：你能帮我做什么 / 什么是LLM？）。需要执行B站检索与转笔记时，再开启上方“知识检索”（主题内容可直接用问句）。"
                  @compositionstart="onInputCompositionStart"
                  @compositionend="onInputCompositionEnd"
                  @keydown.enter.exact.prevent="handleEnterSend"
                />

                <div class="mt-3 flex items-center justify-between gap-3">
                  <div class="text-xs opacity-70">
                    Enter发送 · Shift+Enter换行 · 关闭“知识检索”时不会自动建任务
                  </div>
                  <n-space align="center">
                    <n-button @click="clearInput" quaternary>清空</n-button>
                    <button
                      type="button"
                      class="send-icon-btn"
                      :disabled="(!userInput.trim() && !sending) || sending"
                      title="发送"
                      @click="sendMessage"
                    >
                      <span v-if="sending" class="send-icon-spinner" />
                      <n-icon v-else :component="ArrowUpOutline" size="18" />
                    </button>
                  </n-space>
                </div>
              </div>
            </div>
          </div>
        </n-card>
      </div>

      <div class="h-full task-rail-shell" :class="{ 'task-rail-shell--open': showTaskRail }">
        <div class="h-full task-rail-shell__inner">
          <transition name="task-rail-drawer" appear>
            <n-card v-if="showTaskRail" :bordered="false" class="h-full right-rail-card">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">当前任务进度</span>
              <n-tag size="small" :type="tagType(currentSnapshot?.status)">
                {{ statusLabel(currentSnapshot?.status) }}
              </n-tag>
            </div>
          </template>

          <template v-if="jobsStore.currentJobId">
            <div class="h-full min-h-0 flex flex-col gap-3 overflow-auto pr-1 right-rail-scroll">
              <div class="rail-section rail-section--meta">
                <div class="text-xs opacity-70 mb-1">当前任务ID</div>
                <div class="font-mono text-xs break-all">{{ jobsStore.currentJobId }}</div>
              </div>

              <div class="rail-section rail-section--stage">
                <div class="text-xs opacity-70 mb-1">正在进行的步骤</div>
                <div class="font-medium">{{ humanizeStage(currentSnapshot?.stage || '') || '等待中' }}</div>
                <div class="text-xs opacity-70 mt-1">{{ humanizeDetail(currentSnapshot?.detail || '', currentSnapshot?.stage || '') || '系统将自动更新' }}</div>
              </div>

              <div class="rail-section rail-section--actions">
                <div class="text-xs opacity-70 mb-1">快捷操作</div>
                <n-space vertical>
                  <n-button block @click="refreshCurrentJob" :disabled="!jobsStore.currentJobId">刷新当前任务</n-button>
                  <n-button block secondary @click="openJob(jobsStore.currentJobId)">打开任务详情</n-button>
                  <n-button block secondary @click="toggleCurrentJobSse" :disabled="!jobsStore.currentJobId">
                    {{ currentSseButtonText }}
                  </n-button>
                </n-space>
                <div class="text-xs mt-2">
                  <span class="opacity-70">实时连接：</span>
                  <span :class="currentSseColorClass">{{ currentSseLabel }}</span>
                </div>
              </div>

              <div
                v-if="currentQueueBatch || currentQueueRuntime"
                class="rail-section rail-section--plain"
              >
                <div class="text-xs opacity-70 mb-2">当前队列状态</div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div class="rail-subpanel p-2">
                    <div class="opacity-60">你的队列</div>
                    <div class="font-medium">
                      {{ currentQueueBatch?.user_pending_count ?? currentQueueRuntime?.user_pending_count ?? 0 }}
                    </div>
                  </div>
                  <div class="rail-subpanel p-2">
                    <div class="opacity-60">全局队列</div>
                    <div class="font-medium">
                      {{ currentQueueBatch?.global_pending_count ?? currentQueueRuntime?.global_pending_count ?? 0 }}
                    </div>
                  </div>
                  <div class="rail-subpanel p-2">
                    <div class="opacity-60">已完成</div>
                    <div class="font-medium">
                      {{ currentQueueBatch?.completed_count ?? 0 }}
                    </div>
                  </div>
                  <div class="rail-subpanel p-2">
                    <div class="opacity-60">我的排位</div>
                    <div class="font-medium">
                      {{ currentQueueRuntime?.user_position ?? currentQueueBatch?.user_position ?? '--' }}
                    </div>
                  </div>
                  <div class="rail-subpanel p-2">
                    <div class="opacity-60">全局排位</div>
                    <div class="font-medium">
                      {{ currentQueueRuntime?.global_position ?? currentQueueBatch?.global_position ?? '--' }}
                    </div>
                  </div>
                </div>
                <div v-if="currentQueueBatch?.current_processing_item?.title" class="text-xs mt-2">
                  <span class="opacity-70">正在处理：</span>
                  <span class="font-medium">{{ currentQueueBatch?.current_processing_item?.title }}</span>
                </div>
                <div v-if="currentQueueBatchCompletedItems.length" class="mt-2 space-y-2">
                  <div class="text-xs opacity-70">已完成视频笔记（可先看）</div>
                  <div
                    v-for="(doneItem, idx) in currentQueueBatchCompletedItems.slice(-3)"
                    :key="`${doneItem.child_job_id || idx}`"
                    class="rail-subpanel p-2"
                  >
                    <div class="text-xs font-medium mb-1">{{ (!looksLikeStatsOnlyTitle(doneItem.title || '') && doneItem.title) ? doneItem.title : `视频 ${idx + 1}` }}</div>
                    <pre class="text-[11px] leading-5 whitespace-pre-wrap break-words font-sans rail-note-preview">{{ String(doneItem.note_preview || '') }}</pre>
                    <div v-if="doneItem.child_job_id" class="flex gap-1 mt-2">
                      <n-button
                        size="tiny"
                        tag="a"
                        :href="childNoteDownloadUrl(doneItem.child_job_id)"
                        target="_blank"
                        :disabled="!doneItem.child_job_id"
                      >
                        下载 MD
                      </n-button>
                      <n-button
                        size="tiny"
                        type="primary"
                        :loading="childNoteLoadingByJobId[doneItem.child_job_id]"
                        :disabled="hasJobNoteMessageInCurrentChat(doneItem.child_job_id) || childNoteLoadingByJobId[doneItem.child_job_id]"
                        @click="addChildNoteToChat(doneItem.child_job_id, (!looksLikeStatsOnlyTitle(doneItem.title || '') && doneItem.title) ? doneItem.title : `视频 ${idx + 1}`)"
                      >
                        {{ hasJobNoteMessageInCurrentChat(doneItem.child_job_id) ? '已在对话中' : '加入对话' }}
                      </n-button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="rail-section rail-section--plain">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="text-xs opacity-70">任务日志（最近）</div>
                  <n-tag size="small" type="default">{{ currentSidebarLogs.length }}</n-tag>
                </div>
                <div class="rail-subpanel p-2 max-h-[220px] overflow-auto">
                  <template v-if="currentSidebarLogs.length">
                    <div
                      v-for="(log, idx) in currentSidebarLogs"
                      :key="`${idx}-${log.ts || ''}`"
                      class="py-1.5 border-b border-slate-200/50 dark:border-slate-700/40 last:border-b-0"
                    >
                      <div class="text-[11px] opacity-60">{{ log.ts || '--:--:--' }}</div>
                      <div class="text-xs leading-5 whitespace-pre-wrap break-words">{{ log.message }}</div>
                    </div>
                  </template>
                  <div v-else class="text-xs opacity-60 py-2">暂无日志，任务开始后会显示过程记录</div>
                </div>
              </div>

              <div class="rail-section rail-section--plain">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="text-xs opacity-70">Markdown 结果</div>
                  <n-tag size="small" :type="isCurrentJobCompleted ? 'success' : 'default'">
                    {{ isCurrentJobCompleted ? '可查看' : '未完成' }}
                  </n-tag>
                </div>

                <n-space size="small" class="mb-2">
                  <n-button
                    size="small"
                    @click="() => loadCurrentJobNoteAssets()"
                    :disabled="!isCurrentJobCompleted || loadingCurrentJobNote"
                    :loading="loadingCurrentJobNote"
                  >
                    加载 MD
                  </n-button>
                  <n-button
                    size="small"
                    tag="a"
                    :href="currentNoteDownloadUrl || undefined"
                    target="_blank"
                    :disabled="!currentNoteDownloadUrl"
                  >
                    下载 MD
                  </n-button>
                </n-space>

                <div v-if="currentNoteLink" class="text-[11px] opacity-60 mb-2 truncate" :title="currentNoteLink.file_name">
                  {{ currentNoteLink.file_name }}
                </div>

                <div class="rail-subpanel p-2 max-h-[180px] overflow-auto">
                  <template v-if="currentNoteText">
                    <div class="text-[11px] opacity-60 mb-2">
                      已加载完整 Markdown。任务完成后会自动以 AI 消息形式加入当前对话。
                    </div>
                    <div class="rail-md-preview">
                      <MarkdownContent :source="currentNoteText" />
                    </div>
                  </template>
                  <div v-else class="text-xs opacity-60 py-2">
                    {{ isCurrentJobCompleted ? '任务已完成，点击“加载 MD”查看内容。' : '任务完成后可在这里预览并下载 Markdown 笔记。' }}
                  </div>
                </div>
              </div>
            </div>
          </template>
          <n-empty v-else description="先在中间聊天；开启“知识检索”并发送后，才可能创建任务" />
            </n-card>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NCard, NDropdown, NEmpty, NIcon, NInput, NSpace, NSpin, NTag, useMessage } from 'naive-ui'
import { ArrowUpOutline, ChevronDownOutline } from '@vicons/ionicons5'
import { useJobsStore } from '@/stores/modules/useJobsStore'
import { useChatStore } from '@/stores/modules/useChatStore'
import { useAuthStore } from '@/stores/modules/useAuthStore'
import { useGlobalStore } from '@/stores/global-store'
import {
  createChatSessionApi,
  listChatMessagesApi,
  listChatModelsApi,
  saveChatJobNoteMessageApi,
  selectChatCandidateVideoApi,
  selectChatCandidateVideosBatchApi,
  sendChatMessageStreamApi,
} from '@/api/chat'
import { buildJobNoteDownloadUrl, getJobNoteApi, getJobNoteLinkApi } from '@/api/jobs'
import type { ChatMessage, ChatModelItem, JobCreateResponse, TopicQueueBatchSummary, TopicSelectedVideo } from '@/api/types'
import MarkdownContent from '@/components/MarkdownContent.vue'

type UiChatMessage = {
  localId: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
  task?: JobCreateResponse | null
  toolDecisionReason?: string
  autoTask?: boolean
  knowledgeLookupUsed?: boolean
  knowledgeLookupReason?: string
  knowledgeHits?: Array<Record<string, any>>
  renderAsMarkdown?: boolean
  markdownLabel?: string
  jobNoteJobId?: string
}

const router = useRouter()
const route = useRoute()
const message = useMessage()
const jobsStore = useJobsStore()
const chatStore = useChatStore()
const authStore = useAuthStore()
const globalStore = useGlobalStore()

const CHAT_MODEL_STORAGE_KEY = 'robot_web_selected_chat_model'

const userInput = ref('')
const imeComposing = ref(false)
const messages = ref<UiChatMessage[]>([])
const sending = ref(false)
const knowledgeRetrievalEnabled = ref(false)
const chatSessionUuid = ref('')
const chatModels = ref<ChatModelItem[]>([])
const selectedModel = ref<string | null>(null)
const modelsLoading = ref(false)
const messagesContainerRef = ref<HTMLElement | null>(null)
const routeNewChatToken = ref<string>('')
const loadingSessionMessages = ref(false)
const skipNextRouteSessionHydrateUuid = ref('')
const videoPreviewState = ref<Record<string, string>>({})
const selectingVideoState = ref<Record<string, boolean>>({})
const candidateSelectionState = ref<Record<string, Record<string, boolean>>>({})
const batchSelectingJobs = ref<Record<string, boolean>>({})

const currentJobState = computed(() => (jobsStore.currentJobId ? jobsStore.jobs[jobsStore.currentJobId] : null))
const currentSnapshot = computed(() => currentJobState.value?.snapshot || null)
const currentUserLabel = computed(() => authStore.user?.display_name || authStore.user?.username || '你')
const loadingCurrentJobNote = ref(false)
const syncingJobNoteMessageByJobId = ref<Record<string, boolean>>({})
const childNoteLoadingByJobId = ref<Record<string, boolean>>({})

const currentSseButtonText = computed(() => {
  const s = currentJobState.value?.sseStatus
  return s === 'connected' ? '暂停实时连接' : '开启实时连接'
})

const currentSseLabel = computed(() => {
  const s = currentJobState.value?.sseStatus || 'idle'
  if (s === 'connected') return '已连接'
  if (s === 'connecting') return '连接中'
  if (s === 'disconnected') return '已断开'
  return '未开启'
})

const currentSseColorClass = computed(() => {
  const s = currentJobState.value?.sseStatus || 'idle'
  if (s === 'connected') return 'text-green-500 font-medium'
  if (s === 'connecting') return 'text-blue-500 font-medium'
  if (s === 'disconnected') return 'text-red-500 font-medium'
  return 'opacity-70'
})

const modelDropdownOptions = computed(() =>
  chatModels.value.map((m) => ({
    label: `${m.display_name || m.model_name}${m.provider ? ` · ${m.provider}` : ''}`,
    key: m.model_name,
  })),
)

const selectedModelDisplayName = computed(() => {
  if (modelsLoading.value) return '加载中...'
  if (!selectedModel.value) return '默认模型'
  const model = chatModels.value.find((m) => m.model_name === selectedModel.value)
  return model?.display_name || model?.model_name || selectedModel.value
})

const showTaskRail = computed(() => knowledgeRetrievalEnabled.value)

const currentSidebarLogs = computed(() => {
  const logs = currentJobState.value?.logs || []
  return logs.slice(-40).map((x) => ({
    ts: x.ts,
    message: humanizeSidebarLog(x.message || ''),
  }))
})

const isCurrentJobCompleted = computed(() => currentSnapshot.value?.status === 'completed')
const currentNoteText = computed(() => currentJobState.value?.noteText || '')
const currentNoteLink = computed(() => currentJobState.value?.noteLink || null)
const currentNoteDownloadUrl = computed(() => {
  if (!jobsStore.currentJobId || !currentNoteLink.value) return ''
  return buildJobNoteDownloadUrl(jobsStore.currentJobId)
})
const currentQueueRuntime = computed(() => ((currentSnapshot.value?.result as any)?.queue_runtime || null) as Record<string, any> | null)
const currentQueueBatch = computed(() => ((currentSnapshot.value?.result as any)?.queue_batch || null) as TopicQueueBatchSummary | null)
const currentQueueBatchCompletedItems = computed(() => Array.isArray(currentQueueBatch.value?.completed_items) ? currentQueueBatch.value!.completed_items! : [])
const firstTaskMessageLocalIdByJob = computed(() => {
  const m: Record<string, string> = {}
  for (const msg of messages.value) {
    const jobId = String(msg?.task?.job_id || '').trim()
    if (!jobId || msg.role !== 'assistant') continue
    if (!m[jobId]) m[jobId] = msg.localId
  }
  return m
})

onMounted(async () => {
  globalStore.setBreadcrumbBarVisible(false)

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CHAT_MODEL_STORAGE_KEY)
    if (cached) selectedModel.value = cached
  }

  await Promise.allSettled([bootstrapCurrentJob(), loadChatModels(), chatStore.refreshSessions().catch(() => undefined)])
  handleNewChatRouteSignal(String(route.query.newChat || ''))
  void loadSessionFromRoute(String(route.query.session || ''))
})

watch(selectedModel, (val) => {
  if (typeof window === 'undefined') return
  if (!val) localStorage.removeItem(CHAT_MODEL_STORAGE_KEY)
  else localStorage.setItem(CHAT_MODEL_STORAGE_KEY, val)
})

watch(
  () => route.query.newChat,
  (val) => {
    handleNewChatRouteSignal(String(val || ''))
  },
)

watch(
  () => route.query.session,
  (val) => {
    void loadSessionFromRoute(String(val || ''))
  },
  { flush: 'sync' },
)

watch(
  messages,
  async () => {
    await nextTick()
    const el = messagesContainerRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
  { deep: true },
)

watch(
  () => [jobsStore.currentJobId, currentSnapshot.value?.status] as const,
  async ([jobId, status]) => {
    if (!jobId || status !== 'completed') return
    await loadCurrentJobNoteAssets({ silent: true })
  },
)

async function bootstrapCurrentJob() {
  if (jobsStore.currentJobId && !currentSnapshot.value) {
    try {
      const snap = await jobsStore.fetchJob(jobsStore.currentJobId)
      const st = String(snap?.status || '')
      if (st === 'running' || st === 'queued' || st === 'waiting_user_pick') {
        jobsStore.connectJobEvents(jobsStore.currentJobId)
      }
    } catch {
      // ignore bootstrap errors
    }
    return
  }
  if (jobsStore.currentJobId && currentSnapshot.value) {
    const st = String(currentSnapshot.value.status || '')
    if ((st === 'running' || st === 'queued' || st === 'waiting_user_pick')
      && currentJobState.value?.sseStatus !== 'connected'
      && currentJobState.value?.sseStatus !== 'connecting') {
      jobsStore.connectJobEvents(jobsStore.currentJobId)
    }
  }
}

async function loadChatModels() {
  modelsLoading.value = true
  try {
    const res = await listChatModelsApi()
    chatModels.value = res.items || []
    if (!selectedModel.value && chatModels.value.length > 0) {
      const firstModel = chatModels.value[0]
      if (firstModel) selectedModel.value = firstModel.model_name
    }
  } catch {
    chatModels.value = []
  } finally {
    modelsLoading.value = false
  }
}

function handleModelSelect(key: string | number) {
  selectedModel.value = String(key || '')
}

function handleNewChatRouteSignal(token: string) {
  if (!token || token === routeNewChatToken.value) return
  routeNewChatToken.value = token
  startNewConversation()
}

function startNewConversation() {
  resetCurrentTaskState()
  chatStore.clearCurrentSession()
  chatSessionUuid.value = ''
  messages.value = []
  loadingSessionMessages.value = false
  userInput.value = ''
  knowledgeRetrievalEnabled.value = false
  videoPreviewState.value = {}
  candidateSelectionState.value = {}
  batchSelectingJobs.value = {}
}

function resetCurrentTaskState() {
  const currentId = jobsStore.currentJobId
  if (currentId) jobsStore.disconnectJobEvents(currentId)
  jobsStore.currentJobId = ''
  loadingCurrentJobNote.value = false
}

async function ensureChatSession() {
  if (chatSessionUuid.value) return chatSessionUuid.value
  const title = messages.value.find((m) => m.role === 'user')?.content || userInput.value.trim() || ''
  const res = await createChatSessionApi(title)
  chatSessionUuid.value = res.session.session_uuid
  chatStore.setCurrentSession(chatSessionUuid.value)
  chatStore.upsertSession(res.session)
  skipNextRouteSessionHydrateUuid.value = chatSessionUuid.value
  void router.replace({ path: '/home', query: { session: chatSessionUuid.value } })
  return chatSessionUuid.value
}

async function loadSessionFromRoute(sessionUuidFromRoute: string) {
  const sessionUuid = (sessionUuidFromRoute || '').trim()
  if (!sessionUuid) return
  if (route.query.newChat) return
  if (skipNextRouteSessionHydrateUuid.value && skipNextRouteSessionHydrateUuid.value === sessionUuid) {
    skipNextRouteSessionHydrateUuid.value = ''
    return
  }
  if (chatSessionUuid.value === sessionUuid && messages.value.length > 0) return
  try {
    loadingSessionMessages.value = true
    messages.value = []
    chatStore.setCurrentSession(sessionUuid)
    chatSessionUuid.value = sessionUuid
    const res = await listChatMessagesApi(sessionUuid, 100)
    const loaded = (res.items || []).map((m) => ({
      localId: `srv-${m.id || Math.random().toString(36).slice(2, 8)}`,
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: String(m.content || ''),
      pending: false,
      task: (m.meta?.task as JobCreateResponse | null) ?? null,
      toolDecisionReason: String(m.meta?.tool_decision?.reason || '').trim() || undefined,
      autoTask: Boolean(m.meta?.auto_task),
      knowledgeLookupUsed: Boolean(m.meta?.knowledge_lookup?.used),
      knowledgeLookupReason: String(m.meta?.knowledge_lookup?.reason || '').trim() || undefined,
      knowledgeHits: Array.isArray(m.meta?.knowledge_hits) ? (m.meta?.knowledge_hits as Array<Record<string, any>>) : [],
      renderAsMarkdown: Boolean(m.meta?.render_markdown) || String(m.meta?.message_kind || '') === 'job_markdown',
      markdownLabel: String((m.meta as any)?.job_note?.file_name || '').trim()
        ? `Markdown 结果 · ${String((m.meta as any)?.job_note?.file_name || '').trim()}`
        : (Boolean(m.meta?.render_markdown) || String(m.meta?.message_kind || '') === 'job_markdown')
          ? 'Markdown 结果'
          : undefined,
      jobNoteJobId: String((m.meta as any)?.job_note?.job_id || '').trim() || undefined,
    }))
    messages.value = loaded

    const taskJobIds = loaded
      .filter((m) => m.role === 'assistant' && m.task?.job_id)
      .map((m) => String(m.task?.job_id || '').trim())
      .filter(Boolean)
    const latestTaskJobId = taskJobIds[taskJobIds.length - 1] || ''
    const shouldShowKnowledgeMode = loaded.some((m) => m.autoTask || m.task)
    knowledgeRetrievalEnabled.value = shouldShowKnowledgeMode

    if (latestTaskJobId) {
      chatStore.bindJobToSession(latestTaskJobId, sessionUuid)
      jobsStore.setCurrentJob(latestTaskJobId)
      // Fetch all task jobs concurrently so per-message candidate cards are restored
      const olderJobIds = taskJobIds.slice(0, -1)
      void Promise.allSettled(olderJobIds.map((jid) => jobsStore.fetchJob(jid)))
      try {
        const snap = await jobsStore.fetchJob(latestTaskJobId)
        if (snap?.status === 'running' || snap?.status === 'queued' || snap?.status === 'waiting_user_pick') {
          jobsStore.connectJobEvents(latestTaskJobId)
        }
      } catch {
        // ignore task bootstrap errors when restoring chat history
      }
    } else {
      resetCurrentTaskState()
    }
  } catch {
    // keep current UI state if loading old session fails
  } finally {
    loadingSessionMessages.value = false
  }
}

function appendUiMessage(payload: Partial<UiChatMessage> & Pick<UiChatMessage, 'role' | 'content'>) {
  const item: UiChatMessage = {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: payload.role,
    content: payload.content,
    pending: payload.pending,
    task: payload.task ?? null,
    toolDecisionReason: payload.toolDecisionReason,
    autoTask: payload.autoTask,
    knowledgeLookupUsed: payload.knowledgeLookupUsed,
    knowledgeLookupReason: payload.knowledgeLookupReason,
    knowledgeHits: Array.isArray(payload.knowledgeHits) ? payload.knowledgeHits : [],
    renderAsMarkdown: payload.renderAsMarkdown,
    markdownLabel: payload.markdownLabel,
    jobNoteJobId: payload.jobNoteJobId,
  }
  messages.value.push(item)
  const last = messages.value[messages.value.length - 1]
  return (last || item) as UiChatMessage
}

function mapAssistantMessage(msg: ChatMessage, task: JobCreateResponse | null, toolDecision?: { reason?: string }) {
  const isMarkdownMessage = Boolean(msg?.meta?.render_markdown) || String(msg?.meta?.message_kind || '') === 'job_markdown'
  const jobNoteJobId = String((msg?.meta as any)?.job_note?.job_id || '').trim() || undefined
  const jobNoteFileName = String((msg?.meta as any)?.job_note?.file_name || '').trim()
  const effectiveTask = task ?? (msg?.meta?.task as JobCreateResponse | null) ?? null
  const fallbackText = effectiveTask?.job_id
    ? `已创建任务（${effectiveTask.job_id}），我会继续检索并实时同步进度。`
    : '抱歉，这次回复异常中断，请重试一次。'
  return appendUiMessage({
    role: 'assistant',
    content: String(msg?.content || fallbackText),
    task: effectiveTask,
    toolDecisionReason:
      String(toolDecision?.reason || msg?.meta?.tool_decision?.reason || '').trim() || undefined,
    autoTask: Boolean(msg?.meta?.auto_task),
    knowledgeLookupUsed: Boolean(msg?.meta?.knowledge_lookup?.used),
    knowledgeLookupReason: String(msg?.meta?.knowledge_lookup?.reason || '').trim() || undefined,
    knowledgeHits: Array.isArray(msg?.meta?.knowledge_hits) ? (msg?.meta?.knowledge_hits as Array<Record<string, any>>) : [],
    renderAsMarkdown: isMarkdownMessage,
    markdownLabel: isMarkdownMessage ? (jobNoteFileName ? `Markdown 结果 · ${jobNoteFileName}` : 'Markdown 结果') : undefined,
    jobNoteJobId,
  })
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text) {
    message.warning('请输入内容')
    return
  }
  if (sending.value) return

  appendUiMessage({ role: 'user', content: text })
  userInput.value = ''
  const pendingAssistant = appendUiMessage({ role: 'assistant', content: '', pending: true })
  sending.value = true

  try {
    const sessionUuid = await ensureChatSession()
    let taskInfo: JobCreateResponse | null = null
    let toolDecisionReason = ''
    let shouldCreateJob = false
    let taskHandled = false
    let gotAnyDelta = false
    let savedAssistantContent = ''
    const typewriterQueue: string[] = []
    let typewriterTimer: number | null = null
    let finalDoneText = ''

    const stopTypewriter = () => {
      if (typewriterTimer !== null && typeof window !== 'undefined') {
        window.clearInterval(typewriterTimer)
      }
      typewriterTimer = null
    }

    const typewriterTick = () => {
      if (!typewriterQueue.length) {
        stopTypewriter()
        return
      }
      const batchSize = Math.min(3, typewriterQueue.length)
      let chunk = ''
      for (let i = 0; i < batchSize; i += 1) {
        const nextChar = typewriterQueue.shift()
        if (nextChar) chunk += nextChar
      }
      if (chunk) {
        pendingAssistant.pending = false
        pendingAssistant.content = `${pendingAssistant.content || ''}${chunk}`
      }
      if (!typewriterQueue.length && finalDoneText && !String(pendingAssistant.content || '').trim()) {
        pendingAssistant.content = finalDoneText
      }
    }

    const enqueueTypewriter = (textChunk: string) => {
      if (!textChunk) return
      for (const ch of textChunk) typewriterQueue.push(ch)
      if (typewriterTimer === null && typeof window !== 'undefined') {
        typewriterTimer = window.setInterval(typewriterTick, 18)
      }
    }

    await sendChatMessageStreamApi(
      sessionUuid,
      {
        content: text,
        model_name: selectedModel.value || '',
        auto_task: knowledgeRetrievalEnabled.value,
        ...(globalStore.chatTaskParams || {}),
        pipeline_model_name: selectedModel.value || '',
      },
      {
        onMeta: (meta) => {
          taskInfo = (meta?.task as JobCreateResponse | null) || null
          shouldCreateJob = Boolean(meta?.tool_decision?.should_create_job)
          toolDecisionReason = String(meta?.tool_decision?.reason || '').trim()
          pendingAssistant.knowledgeLookupUsed = Boolean(meta?.knowledge_lookup?.used)
          pendingAssistant.knowledgeLookupReason = String(meta?.knowledge_lookup?.reason || '').trim() || undefined
          pendingAssistant.knowledgeHits = Array.isArray(meta?.knowledge_hits)
            ? (meta.knowledge_hits as Array<Record<string, any>>)
            : []
          if (taskInfo?.job_id && !taskHandled) {
            taskHandled = true
            pendingAssistant.task = taskInfo
            pendingAssistant.toolDecisionReason = toolDecisionReason || undefined
            if (chatSessionUuid.value) {
              chatStore.bindJobToSession(taskInfo.job_id, chatSessionUuid.value)
            }
            void (async () => {
              jobsStore.setCurrentJob(taskInfo!.job_id)
              try {
                await jobsStore.fetchJob(taskInfo!.job_id)
              } catch {
                // ignore
              }
              jobsStore.connectJobEvents(taskInfo!.job_id)
              message.success('已创建任务，并保留在当前对话页继续聊天')
            })()
          }
        },
        onStart: () => {
          pendingAssistant.pending = false
          if (!pendingAssistant.content) pendingAssistant.content = ''
        },
        onDelta: (deltaText) => {
          gotAnyDelta = gotAnyDelta || !!deltaText
          pendingAssistant.pending = false
          enqueueTypewriter(String(deltaText || ''))
        },
        onDone: (doneData) => {
          pendingAssistant.pending = false
          finalDoneText = String(doneData?.text || '')
          if (!gotAnyDelta && String(doneData?.text || '')) {
            pendingAssistant.content = String(doneData.text)
          }
          if (knowledgeRetrievalEnabled.value && !taskInfo && !shouldCreateJob) {
            message.info('本次未创建任务：AI 判断为普通对话/咨询')
          }
        },
        onSaved: (savedData) => {
          const msg = (savedData?.assistant_message || null) as ChatMessage | null
          savedAssistantContent = String(msg?.content || '')
          if (msg?.meta?.tool_decision?.reason && !toolDecisionReason) {
            toolDecisionReason = String(msg.meta.tool_decision.reason || '')
            pendingAssistant.toolDecisionReason = toolDecisionReason || undefined
          }
          if (msg?.meta?.task && !pendingAssistant.task) {
            pendingAssistant.task = msg.meta.task as JobCreateResponse
            if (chatSessionUuid.value && pendingAssistant.task?.job_id) {
              chatStore.bindJobToSession(pendingAssistant.task.job_id, chatSessionUuid.value)
            }
          }
          pendingAssistant.knowledgeLookupUsed = Boolean(msg?.meta?.knowledge_lookup?.used) || pendingAssistant.knowledgeLookupUsed
          pendingAssistant.knowledgeLookupReason =
            String(msg?.meta?.knowledge_lookup?.reason || '').trim() || pendingAssistant.knowledgeLookupReason
          if (Array.isArray(msg?.meta?.knowledge_hits)) {
            pendingAssistant.knowledgeHits = msg.meta.knowledge_hits as Array<Record<string, any>>
          }
        },
      },
    )

    pendingAssistant.pending = false
    pendingAssistant.toolDecisionReason = toolDecisionReason || pendingAssistant.toolDecisionReason
    if (typewriterTimer !== null) {
      // 若流结束时还有少量排队字符，快速刷完，避免“思考中”后半截丢失。
      while (typewriterQueue.length) typewriterTick()
      stopTypewriter()
    }

    if (!String(pendingAssistant.content || '').trim()) {
      const pendingTaskJobId = String((pendingAssistant.task as any)?.job_id || '').trim()
      if (String(savedAssistantContent || '').trim()) {
        pendingAssistant.content = savedAssistantContent
      } else if (pendingTaskJobId) {
        pendingAssistant.content = `已创建任务（${pendingTaskJobId}），我会继续检索并实时同步进度。`
      } else {
        try {
          const latest = await listChatMessagesApi(sessionUuid, 20)
          const items = Array.isArray(latest?.items) ? latest.items : []
          const lastAssistant = [...items].reverse().find((x) => String(x?.role || '') === 'assistant')
          const recovered = String(lastAssistant?.content || '').trim()
          if (recovered) {
            pendingAssistant.content = recovered
            if (lastAssistant?.meta?.tool_decision?.reason && !pendingAssistant.toolDecisionReason) {
              pendingAssistant.toolDecisionReason = String(lastAssistant.meta.tool_decision.reason || '').trim() || undefined
            }
            pendingAssistant.knowledgeLookupUsed = Boolean(lastAssistant?.meta?.knowledge_lookup?.used) || pendingAssistant.knowledgeLookupUsed
            pendingAssistant.knowledgeLookupReason =
              String(lastAssistant?.meta?.knowledge_lookup?.reason || '').trim() || pendingAssistant.knowledgeLookupReason
            if (Array.isArray(lastAssistant?.meta?.knowledge_hits)) {
              pendingAssistant.knowledgeHits = lastAssistant.meta.knowledge_hits as Array<Record<string, any>>
            }
          }
        } catch {
          // ignore recovery errors
        }
        if (!String(pendingAssistant.content || '').trim()) {
          pendingAssistant.content = '抱歉，这次回复异常中断，请重试一次。'
        }
      }
    }
    chatStore.upsertSession({
      session_uuid: sessionUuid,
      title: messages.value.find((m) => m.role === 'user')?.content || text,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    void chatStore.refreshSessions().catch(() => undefined)
  } catch (e: any) {
    // 若流式中断，停止打字机队列
    pendingAssistant.pending = false
    pendingAssistant.content = `发送失败：${e?.message || '未知错误'}`
    message.error(e?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

async function refreshCurrentJob() {
  if (!jobsStore.currentJobId) return
  try {
    await jobsStore.fetchJob(jobsStore.currentJobId)
    if (currentSnapshot.value?.status === 'completed') {
      await loadCurrentJobNoteAssets({ silent: true })
    }
    message.success('已刷新当前任务')
  } catch (e: any) {
    message.error(e?.message || '刷新失败')
  }
}

function toggleCurrentJobSse() {
  if (!jobsStore.currentJobId) return
  const s = currentJobState.value?.sseStatus
  if (s === 'connected') {
    jobsStore.disconnectJobEvents(jobsStore.currentJobId)
  } else {
    jobsStore.connectJobEvents(jobsStore.currentJobId)
  }
}

function openJob(id: string) {
  const session = String(chatSessionUuid.value || chatStore.getJobSourceSession(id) || '').trim()
  if (session) {
    router.push({ path: `/jobs/${id}`, query: { from: 'chat', session } })
    return
  }
  router.push(`/jobs/${id}`)
}

function jobVideoCandidates(jobId: string): TopicSelectedVideo[] {
  const result = jobsStore.jobs[jobId]?.snapshot?.result as any
  const items = result?.selected_videos
  return Array.isArray(items) ? (items as TopicSelectedVideo[]) : []
}

function jobQueueBatch(jobId: string): TopicQueueBatchSummary | null {
  const result = jobsStore.jobs[jobId]?.snapshot?.result as any
  const qb = result?.queue_batch
  return qb && typeof qb === 'object' ? (qb as TopicQueueBatchSummary) : null
}

function jobQueueCompletedItems(jobId: string) {
  const qb = jobQueueBatch(jobId)
  return Array.isArray(qb?.completed_items) ? qb!.completed_items! : []
}

function candidateQueueItem(jobId: string, video: TopicSelectedVideo) {
  const qb = jobQueueBatch(jobId)
  const items = Array.isArray(qb?.items) ? qb!.items! : []
  const url = String(video.url || '').trim()
  return (items.find((x) => String((x as any)?.bili_url || '') === url) || null) as any
}

function isTopicTask(jobId: string) {
  const kind = String(jobsStore.jobs[jobId]?.snapshot?.kind || '')
  return kind === 'topic'
}

function isJobTerminal(jobId: string) {
  const s = String(jobsStore.jobs[jobId]?.snapshot?.status || '')
  return s === 'completed' || s === 'failed'
}

function shouldRenderCandidatePanel(msg: UiChatMessage) {
  const jobId = String(msg?.task?.job_id || '').trim()
  if (!jobId) return false
  if (firstTaskMessageLocalIdByJob.value[jobId] !== msg.localId) return false
  if (isJobTerminal(jobId)) return false
  return true
}

function videoPreviewKey(video: TopicSelectedVideo) {
  return String(video.url || video.title || '').trim()
}

function activeVideoPreviewKey(jobId: string) {
  return String(videoPreviewState.value[jobId] || '')
}

function extractBvid(text: string) {
  const m = String(text || '').match(/BV[0-9A-Za-z]{10}/)
  return m ? m[0] : ''
}

function videoEmbedUrl(video: TopicSelectedVideo) {
  const bvid = extractBvid(String(video.url || '')) || extractBvid(String(video.title || ''))
  if (!bvid) return ''
  return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&page=1`
}

function toggleVideoPreview(jobId: string, video: TopicSelectedVideo) {
  const key = videoPreviewKey(video)
  if (!key) return
  if (videoPreviewState.value[jobId] === key) {
    delete videoPreviewState.value[jobId]
    videoPreviewState.value = { ...videoPreviewState.value }
    return
  }
  videoPreviewState.value = { ...videoPreviewState.value, [jobId]: key }
}

function openVideoUrl(video: TopicSelectedVideo) {
  const url = String(video.url || '').trim()
  if (!url) return
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
}

function knowledgeHitKey(hit: Record<string, any>, idx: number) {
  return String(hit.id || hit.source_url || hit.video_url || hit.title || idx)
}

function openKnowledgeHitSource(hit: Record<string, any>) {
  const url = String(hit.source_url || hit.video_url || '').trim()
  if (!url) return
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
}

function videoCoverUrl(video: TopicSelectedVideo) {
  const raw = String((video as any).cover || (video as any).pic || (video as any).cover_url || (video as any).thumbnail || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/')) return `https://i0.hdslb.com${raw}`
  if (raw.startsWith('//')) return `https:${raw}`
  if (raw.startsWith('http://')) return raw.replace(/^http:\/\//i, 'https://')
  return raw
}

function looksLikeStatsOnlyTitle(text: string) {
  const t = String(text || '').trim()
  if (!t) return true
  if (t.length > 48) return false
  return /^[0-9.\s:万亿wWkK+]+$/.test(t)
}

function candidateDisplayTitle(video: TopicSelectedVideo, idx: number) {
  const title = String(video.title || '').trim()
  if (title && !looksLikeStatsOnlyTitle(title)) return title
  const keyword = String((video as any).from_keyword || '').trim()
  return keyword ? `候选视频 ${idx + 1}（${keyword}）` : `候选视频 ${idx + 1}`
}

function candidateStatItems(video: TopicSelectedVideo) {
  const raw = String((video as any).stats || '').trim()
  if (!raw) return [] as Array<{ label: string; value: string }>
  if (/(播放|弹幕|点赞|评论|收藏)/.test(raw)) {
    return [{ label: '数据', value: raw }]
  }
  const duration = String(video.duration || '').trim()
  const tokens = raw
    .replace(/[|｜·•]/g, ' ')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => x !== duration)
  if (!tokens.length) return []
  const labels = ['播放', '弹幕', '点赞', '评论', '收藏']
  return tokens.slice(0, labels.length).map((value, i) => ({
    label: labels[i] || `数据${i + 1}`,
    value,
  }))
}

function candidateQueueStatusLabel(status?: string) {
  const s = String(status || '')
  if (s === 'waiting_user_pick') return '待选择'
  if (s === 'init') return '初始化中'
  if (s === 'queued') return '排队中'
  if (s === 'running') return '处理中'
  if (s === 'completed') return '已完成'
  if (s === 'failed') return '失败'
  return statusLabel(s)
}

function candidateSelectKey(jobId: string, video: TopicSelectedVideo) {
  return `${jobId}::${videoPreviewKey(video) || String(video.index || '')}`
}

function isSelectingCandidateVideo(jobId: string, video: TopicSelectedVideo) {
  return Boolean(selectingVideoState.value[candidateSelectKey(jobId, video)])
}

function selectedCandidateMap(jobId: string) {
  return candidateSelectionState.value[jobId] || {}
}

function isCandidateSelected(jobId: string, video: TopicSelectedVideo) {
  return Boolean(selectedCandidateMap(jobId)[candidateSelectKey(jobId, video)])
}

function toggleCandidateSelected(jobId: string, video: TopicSelectedVideo) {
  const key = candidateSelectKey(jobId, video)
  const next = { ...selectedCandidateMap(jobId) }
  next[key] = !next[key]
  if (!next[key]) delete next[key]
  candidateSelectionState.value = { ...candidateSelectionState.value, [jobId]: next }
}

function clearSelectedCandidates(jobId: string) {
  const next = { ...candidateSelectionState.value }
  delete next[jobId]
  candidateSelectionState.value = next
}

function selectAllCandidates(jobId: string) {
  const all = jobVideoCandidates(jobId)
  const next: Record<string, boolean> = {}
  for (const v of all) {
    const key = candidateSelectKey(jobId, v)
    if (key) next[key] = true
  }
  candidateSelectionState.value = { ...candidateSelectionState.value, [jobId]: next }
}

function selectedCandidates(jobId: string) {
  return jobVideoCandidates(jobId).filter((v) => isCandidateSelected(jobId, v))
}

function selectedCandidateCount(jobId: string) {
  return selectedCandidates(jobId).length
}

function isBatchSelecting(jobId: string) {
  return Boolean(batchSelectingJobs.value[jobId])
}

function applyQueueBatchToJobSnapshot(jobId: string, queueBatch: TopicQueueBatchSummary | null | undefined) {
  if (!queueBatch) return
  const jobUi = jobsStore.jobs[jobId]
  const snap = jobUi?.snapshot
  if (!snap) return
  const prevResult = (snap.result as Record<string, any> | null) || {}
  jobUi.snapshot = {
    ...snap,
    result: {
      ...prevResult,
      queue_batch: queueBatch as any,
      video_runs: (queueBatch.items as any) || prevResult.video_runs,
    } as any,
  }
}

async function selectCandidateVideosBatch(parentJobId: string) {
  const sessionUuid = String(chatSessionUuid.value || '').trim()
  if (!sessionUuid) {
    message.warning('当前会话不存在，无法提交选择')
    return
  }
  const picked = selectedCandidates(parentJobId)
  if (!picked.length) {
    message.warning('请先选择至少一个候选视频')
    return
  }
  if (batchSelectingJobs.value[parentJobId]) return
  batchSelectingJobs.value = { ...batchSelectingJobs.value, [parentJobId]: true }
  try {
    const res = await selectChatCandidateVideosBatchApi(sessionUuid, parentJobId, {
      video_indexes: picked
        .map((v) => (typeof v.index === 'number' ? v.index : undefined))
        .filter((x): x is number => typeof x === 'number'),
      video_urls: picked.map((v) => String(v.url || '').trim()).filter(Boolean),
    })
    applyQueueBatchToJobSnapshot(parentJobId, res.queue_batch || null)
    for (const t of res.enqueued_tasks || []) {
      if (t?.job_id) chatStore.bindJobToSession(String(t.job_id), sessionUuid)
    }
    const savedMsg = (res.assistant_message || null) as ChatMessage | null
    if (savedMsg) {
      mapAssistantMessage(savedMsg, (savedMsg.meta?.task as JobCreateResponse | null) ?? null, (savedMsg.meta?.tool_decision as any) || undefined)
    }
    jobsStore.setCurrentJob(parentJobId)
    try {
      await jobsStore.fetchJob(parentJobId)
    } catch {
      // ignore
    }
    jobsStore.connectJobEvents(parentJobId)
    clearSelectedCandidates(parentJobId)
    message.success(`已加入任务队列：${(res.enqueued_tasks || []).length || picked.length} 个视频`)
  } catch (e: any) {
    message.error(e?.message || '批量加入队列失败')
  } finally {
    const next = { ...batchSelectingJobs.value }
    delete next[parentJobId]
    batchSelectingJobs.value = next
  }
}

async function selectCandidateVideo(parentJobId: string, video: TopicSelectedVideo) {
  const sessionUuid = String(chatSessionUuid.value || '').trim()
  const url = String(video.url || '').trim()
  if (!sessionUuid) {
    message.warning('当前会话不存在，无法提交选择')
    return
  }
  if (!url) {
    message.warning('该候选视频缺少链接')
    return
  }
  const key = candidateSelectKey(parentJobId, video)
  if (selectingVideoState.value[key]) return
  selectingVideoState.value = { ...selectingVideoState.value, [key]: true }
  try {
    const res = await selectChatCandidateVideoApi(sessionUuid, parentJobId, {
      video_index: typeof video.index === 'number' ? video.index : undefined,
      video_url: url,
    })
    const task = res.task || null
    applyQueueBatchToJobSnapshot(parentJobId, res.queue_batch || null)
    const savedMsg = (res.assistant_message || null) as ChatMessage | null
    if (savedMsg) {
      const uiMsg = mapAssistantMessage(savedMsg, task, (savedMsg.meta?.tool_decision as any) || undefined)
      if (task?.job_id) uiMsg.task = task
    } else {
      appendUiMessage({
        role: 'assistant',
        content: `已根据你的选择开始处理视频：${String(video.title || url)}。`,
        task,
        autoTask: true,
      })
    }
    if (task?.job_id) {
      chatStore.bindJobToSession(task.job_id, sessionUuid)
      jobsStore.setCurrentJob(parentJobId)
      knowledgeRetrievalEnabled.value = true
      try {
        await jobsStore.fetchJob(parentJobId)
      } catch {
        // ignore
      }
      jobsStore.connectJobEvents(parentJobId)
    }
    await nextTick()
    const el = messagesContainerRef.value
    if (el) el.scrollTop = el.scrollHeight
    message.success('已加入任务队列，开始总结该视频笔记')
  } catch (e: any) {
    message.error(e?.message || '选择视频处理失败')
  } finally {
    const nextState = { ...selectingVideoState.value }
    delete nextState[key]
    selectingVideoState.value = nextState
  }
}

function clearInput() {
  userInput.value = ''
}

async function loadCurrentJobNoteAssets(options?: { silent?: boolean }) {
  const jobId = jobsStore.currentJobId
  if (!jobId || !isCurrentJobCompleted.value) return
  if (loadingCurrentJobNote.value) return
  loadingCurrentJobNote.value = true
  try {
    if (!currentNoteLink.value) {
      await jobsStore.fetchNoteLink(jobId)
    }
    if (!currentNoteText.value) {
      await jobsStore.fetchNote(jobId)
    }
    await syncCurrentJobNoteIntoChatIfNeeded(jobId)
    if (!options?.silent) message.success('已加载 Markdown 结果')
  } catch (e: any) {
    if (!options?.silent) message.error(e?.message || '加载 Markdown 失败')
  } finally {
    loadingCurrentJobNote.value = false
  }
}

function hasJobNoteMessageInCurrentChat(jobId: string) {
  const target = String(jobId || '').trim()
  if (!target) return false
  return messages.value.some((m) => String(m.jobNoteJobId || '').trim() === target)
}

async function syncCurrentJobNoteIntoChatIfNeeded(jobIdInput?: string) {
  const jobId = String(jobIdInput || jobsStore.currentJobId || '').trim()
  if (!jobId) return
  const sessionUuid = String(chatSessionUuid.value || chatStore.getJobSourceSession(jobId) || '').trim()
  if (!sessionUuid) return
  const md = String(currentNoteText.value || '').trim()
  if (!md) return
  if (hasJobNoteMessageInCurrentChat(jobId)) return
  if (syncingJobNoteMessageByJobId.value[jobId]) return

  syncingJobNoteMessageByJobId.value = { ...syncingJobNoteMessageByJobId.value, [jobId]: true }
  try {
    const res = await saveChatJobNoteMessageApi(sessionUuid, jobId, {
      markdown_text: md,
      file_name: String(currentNoteLink.value?.file_name || ''),
    })
    const savedMsg = (res.assistant_message || null) as ChatMessage | null
    if (savedMsg && !hasJobNoteMessageInCurrentChat(jobId)) {
      mapAssistantMessage(savedMsg, (savedMsg.meta?.task as JobCreateResponse | null) ?? null, (savedMsg.meta?.tool_decision as any) || undefined)
      await nextTick()
      const el = messagesContainerRef.value
      if (el) el.scrollTop = el.scrollHeight
    }
  } catch {
    // 不打断主流程：任务已完成，聊天同步失败可稍后重试/刷新恢复
  } finally {
    const nextState = { ...syncingJobNoteMessageByJobId.value }
    delete nextState[jobId]
    syncingJobNoteMessageByJobId.value = nextState
  }
}

async function addChildNoteToChat(childJobId: string, displayTitle: string) {
  const jobId = String(childJobId || '').trim()
  if (!jobId) return
  const sessionUuid = String(chatSessionUuid.value || '').trim()
  if (!sessionUuid) {
    message.warning('请先开启一个对话会话')
    return
  }
  if (hasJobNoteMessageInCurrentChat(jobId)) {
    message.info('该笔记已在对话中')
    return
  }
  if (childNoteLoadingByJobId.value[jobId]) return
  childNoteLoadingByJobId.value = { ...childNoteLoadingByJobId.value, [jobId]: true }
  try {
    const [noteText, noteLink] = await Promise.all([
      getJobNoteApi(jobId),
      getJobNoteLinkApi(jobId).catch(() => null),
    ])
    const md = String(noteText || '').trim()
    if (!md) {
      message.warning('笔记内容为空，无法加入对话')
      return
    }
    const fileName = String((noteLink as any)?.file_name || displayTitle || `note-${jobId}.md`).trim()
    const res = await saveChatJobNoteMessageApi(sessionUuid, jobId, {
      markdown_text: md,
      file_name: fileName,
    })
    const savedMsg = (res.assistant_message || null) as any
    if (savedMsg && !hasJobNoteMessageInCurrentChat(jobId)) {
      mapAssistantMessage(savedMsg, null)
      await nextTick()
      const el = messagesContainerRef.value
      if (el) el.scrollTop = el.scrollHeight
    }
    message.success('已加入对话，可在聊天中查看完整笔记')
  } catch (e: any) {
    message.error(e?.message || '加入对话失败，请重试')
  } finally {
    const next = { ...childNoteLoadingByJobId.value }
    delete next[jobId]
    childNoteLoadingByJobId.value = next
  }
}

function childNoteDownloadUrl(childJobId: string) {
  const jobId = String(childJobId || '').trim()
  if (!jobId) return ''
  return buildJobNoteDownloadUrl(jobId)
}

function handleEnterSend(e: KeyboardEvent) {
  if (e.shiftKey) return
  const native = e as KeyboardEvent & { keyCode?: number; isComposing?: boolean }
  const targetComposing = Boolean((e.target as any)?.composing)
  if (imeComposing.value || native.isComposing || native.keyCode === 229 || targetComposing) return
  sendMessage()
}

function onInputCompositionStart() {
  imeComposing.value = true
}

function onInputCompositionEnd() {
  imeComposing.value = false
}

function tagType(status?: string) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'success'
  if (status === 'queued') return 'info'
  if (status === 'init') return 'info'
  if (status === 'waiting_user_pick') return 'warning'
  return 'default'
}

function statusLabel(status?: string) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return '未开始'
  if (s === 'completed') return '已完成'
  if (s === 'failed') return '失败'
  if (s === 'running') return '运行中'
  if (s === 'queued') return '排队中'
  if (s === 'init') return '初始化中'
  if (s === 'waiting_user_pick') return '等待选择视频'
  return '处理中'
}

function humanizeStage(stage: string) {
  const s = (stage || '').trim()
  if (!s) return ''
  if (s === 'init') return '初始化任务'
  if (s.includes('search_round_')) return 'AI 正在检索并筛选视频'
  if (s === 'waiting_user_pick') return '等待你选择要总结的视频'
  if (s === 'queue_waiting') return '已加入全局队列，等待处理'
  if (s === 'queue_waiting_children') return '已加入队列，等待逐个处理视频'
  if (s === 'run_selected_video_pipelines') return '正在处理选中的视频'
  if (s === 'merge_multi_notes') return 'AI 正在合并多份笔记'
  if (s === 'search_candidates') return '正在搜索候选视频'
  if (s === 'ai_select_video') return 'AI 正在筛选候选视频'
  if (s === 'cleanup') return '正在清理中间文件'
  if (s === 'completed' || s === 'done') return '任务已完成'
  if (s === 'extract_audio_url') return '正在提取音频链接'
  if (s === 'download_audio') return '正在下载音频'
  if (s === 'convert_mp3') return '正在转换音频格式'
  if (s === 'demucs') return '正在分离人声'
  if (s === 'transcribe') return '正在语音转文字'
  if (s === 'generate_note') return 'AI 正在生成笔记'
  if (s.includes('failed')) return '任务执行失败'
  return s.replace(/_/g, ' ')
}

function humanizeDetail(detail: string, stage: string) {
  let d = (detail || '').trim()
  if (!d) return ''
  if ((stage || '').includes('search_round_')) {
    d = d.replace(/^search_round_\d+[:：]\s*/i, '')
  }
  return d
    .replace(/\bwaiting_user_pick\b/gi, '等待选择视频')
    .replace(/\bqueue_waiting_children\b/gi, '已入队等待逐个处理')
    .replace(/\bqueue_waiting\b/gi, '队列等待中')
    .replace(/\brun_selected_video_pipelines\b/gi, '处理已选视频')
    .replace(/\bmerge_multi_notes\b/gi, '合并多份笔记')
    .replace(/\bsearch_candidates\b/gi, '搜索候选视频')
    .replace(/\bai_select_video\b/gi, '筛选候选视频')
    .replace(/\binit\b/gi, '初始化')
}

function humanizeSidebarLog(text: string) {
  const t = (text || '').trim()
  if (!t) return ''
  if (t.includes('任务已创建')) return t.replace(/\((queued|running|completed|failed|waiting_user_pick|init)\)/ig, (_, s: string) => `（${statusLabel(s)}）`)
  return t
    .replace(/\bwaiting_user_pick\b/gi, '等待选择视频')
    .replace(/\bqueue_waiting_children\b/gi, '已入队等待逐个处理')
    .replace(/\bqueue_waiting\b/gi, '队列等待中')
    .replace(/\brun_selected_video_pipelines\b/gi, '处理已选视频')
    .replace(/\bmerge_multi_notes\b/gi, '合并多份笔记')
    .replace(/\bsearch_candidates\b/gi, '搜索候选视频')
    .replace(/\bai_select_video\b/gi, '筛选候选视频')
    .replace(/\binit\b/gi, '初始化')
}
</script>

<style scoped>
.composer-shell {
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

:global(.dark) .composer-shell {
  background: rgba(17, 24, 39, 0.55);
  border-color: rgba(148, 163, 184, 0.16);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}

.knowledge-toggle {
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 26px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #1f2937;
  transition: all 0.2s ease;
}

.knowledge-toggle:hover {
  border-color: rgba(59, 130, 246, 0.45);
}

.knowledge-toggle--active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

:global(.dark) .knowledge-toggle {
  background: rgba(31, 41, 55, 0.95);
  color: #e5e7eb;
  border-color: rgba(148, 163, 184, 0.25);
}

.home-shell {
  display: flex;
  gap: 12px;
  min-height: 0;
}

.home-main-pane {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.task-rail-shell {
  flex: 0 0 auto;
  width: 0;
  min-width: 0;
  overflow: hidden;
  transition: width 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.task-rail-shell--open {
  width: clamp(320px, 24vw, 520px);
}

.task-rail-shell__inner {
  width: clamp(320px, 24vw, 520px);
  height: 100%;
}

.task-rail-drawer-enter-active,
.task-rail-drawer-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    clip-path 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, clip-path;
}

.task-rail-drawer-enter-from,
.task-rail-drawer-leave-to {
  transform: translateX(44px);
  clip-path: inset(0 0 0 100% round 16px);
}

.task-rail-drawer-enter-to,
.task-rail-drawer-leave-from {
  transform: translateX(0);
  clip-path: inset(0 0 0 0 round 16px);
}

.model-inline-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  transition: all 0.18s ease;
  max-width: 420px;
}

.model-inline-trigger:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.2);
}

.model-inline-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.model-inline-trigger__label {
  font-size: 12px;
  opacity: 0.65;
  flex-shrink: 0;
}

.model-inline-trigger__value {
  font-size: 13px;
  font-weight: 500;
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.dark) .model-inline-trigger:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.14);
}

:deep(.right-rail-card > .n-card__content) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
  overflow: hidden;
}

:deep(.right-rail-card) {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid rgba(203, 213, 225, 0.82);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

:deep(.home-main-card > .n-card__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.rail-section {
  position: relative;
  border-radius: 14px;
  padding: 12px;
  border: 1px solid rgba(203, 213, 225, 0.72);
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.035);
  --rail-accent: rgba(148, 163, 184, 0.45);
}

.rail-section::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 14px 0 0 14px;
  background: var(--rail-accent);
}

.rail-section--meta {
  --rail-accent: rgba(148, 163, 184, 0.55);
}

.rail-section--stage {
  --rail-accent: rgba(59, 130, 246, 0.38);
}

.rail-section--actions {
  --rail-accent: rgba(100, 116, 139, 0.38);
}

.rail-section--plain {
  --rail-accent: rgba(148, 163, 184, 0.34);
}

.rail-subpanel {
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.right-rail-scroll {
  scrollbar-gutter: stable;
}

.rail-note-preview {
  max-height: 132px;
  overflow: auto;
  margin: 0;
  padding-right: 2px;
}

.candidate-queue-panel {
  border: 1px solid rgba(203, 213, 225, 0.76);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.candidate-queue-metric {
  border: 1px solid rgba(203, 213, 225, 0.78);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.candidate-queue-done-list {
  max-height: 280px;
  overflow: auto;
  padding-right: 2px;
  display: grid;
  gap: 8px;
}

.candidate-queue-note {
  border: 1px solid rgba(203, 213, 225, 0.78);
  background: rgba(255, 255, 255, 0.98);
}

.candidate-queue-note-preview {
  max-height: 140px;
  overflow: auto;
  margin: 0;
}

:global(.dark) .rail-section {
  border-color: rgba(71, 85, 105, 0.66);
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.58), rgba(15, 23, 42, 0.46));
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
}

:global(.dark) :deep(.right-rail-card) {
  background: rgba(17, 24, 39, 0.94);
  border-color: rgba(75, 85, 99, 0.72);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.3);
}

:global(.dark) .rail-section--meta {
  --rail-accent: rgba(148, 163, 184, 0.38);
}

:global(.dark) .rail-section--stage {
  --rail-accent: rgba(96, 165, 250, 0.34);
}

:global(.dark) .rail-section--actions {
  --rail-accent: rgba(148, 163, 184, 0.26);
}

:global(.dark) .rail-section--plain {
  --rail-accent: rgba(148, 163, 184, 0.22);
}

:global(.dark) .rail-subpanel {
  border-color: rgba(71, 85, 105, 0.6);
  background: rgba(15, 23, 42, 0.34);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.03);
}

:global(.dark) .candidate-queue-panel {
  border-color: rgba(71, 85, 105, 0.66);
  background: rgba(15, 23, 42, 0.46);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
}

:global(.dark) .candidate-queue-metric,
:global(.dark) .candidate-queue-note {
  border-color: rgba(71, 85, 105, 0.6);
  background: rgba(15, 23, 42, 0.34);
}

.send-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(203, 213, 225, 0.9);
  background: #fff;
  color: #0f172a;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  transition: all 0.18s ease;
}

.send-icon-btn:hover:not(:disabled) {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  transform: translateY(-1px);
}

.send-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

:global(.dark) .send-icon-btn {
  background: rgba(17, 24, 39, 0.96);
  color: #f8fafc;
  border-color: rgba(107, 114, 128, 0.65);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
}

.send-icon-spinner {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid rgba(148, 163, 184, 0.35);
  border-top-color: currentColor;
  animation: send-spin 0.8s linear infinite;
}

@keyframes send-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.message-bubble {
  border: 1px solid transparent;
}

.message-bubble--markdown {
  white-space: normal;
  overflow: hidden;
}

.message-bubble--markdown :deep(.md-content) {
  font-size: 0.92rem;
}

.rail-md-preview :deep(.md-content) {
  font-size: 0.78rem;
  line-height: 1.55;
}

.rail-md-preview :deep(.md-content h1) {
  font-size: 0.9rem;
}

.rail-md-preview :deep(.md-content h2) {
  font-size: 0.84rem;
}

.rail-md-preview :deep(.md-content h3),
.rail-md-preview :deep(.md-content h4) {
  font-size: 0.8rem;
}

.message-pending,
.message-pending * {
  cursor: default !important;
  user-select: none;
}

.thinking-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(51, 65, 85, 0.9);
  font-weight: 500;
}

.thinking-indicator__dots {
  display: inline-flex;
  align-items: flex-end;
  gap: 3px;
  transform: translateY(1px);
}

.thinking-indicator__dots i {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.32;
  animation: thinking-dot-bounce 1s ease-in-out infinite;
}

.thinking-indicator__dots i:nth-child(2) {
  animation-delay: 0.16s;
}

.thinking-indicator__dots i:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes thinking-dot-bounce {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.28;
  }
  40% {
    transform: translateY(-3px);
    opacity: 0.9;
  }
}

:global(.dark) .thinking-indicator {
  color: rgba(226, 232, 240, 0.92);
}

.message-assistant {
  background: rgba(248, 250, 252, 0.95);
  border-color: rgba(203, 213, 225, 0.65);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.ai-candidate-panel {
  background: #fff;
  border: 1px solid rgba(203, 213, 225, 0.76);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65), 0 6px 18px rgba(15, 23, 42, 0.05);
}

.ai-candidate-panel__title {
  color: rgba(51, 65, 85, 0.82);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.ai-candidate-card {
  border: 1px solid rgba(203, 213, 225, 0.78);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.85) 100%);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.ai-candidate-card:hover {
  border-color: rgba(148, 163, 184, 0.55);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
}

.ai-candidate-cover {
  border: 1px solid rgba(203, 213, 225, 0.72);
  background: rgba(241, 245, 249, 0.9);
}

.ai-candidate-card__title {
  color: #0f172a;
}

.ai-candidate-card__meta {
  color: rgba(71, 85, 105, 0.95);
}

.ai-candidate-chip {
  border: 1px solid rgba(203, 213, 225, 0.9);
  background: rgba(255, 255, 255, 0.78);
  color: rgba(71, 85, 105, 0.96);
}

.ai-candidate-card__reason {
  color: rgba(51, 65, 85, 0.84);
}

.ai-candidate-card__keyword {
  color: rgba(71, 85, 105, 0.7);
}

.ai-candidate-preview {
  border: 1px solid rgba(203, 213, 225, 0.78);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.message-user {
  background: #fff;
  border-color: rgba(203, 213, 225, 0.9);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

:global(.dark) .message-assistant {
  background: rgba(31, 41, 55, 0.92);
  border-color: rgba(75, 85, 99, 0.9);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}

:global(.dark) .ai-candidate-panel {
  background: rgba(31, 41, 55, 0.92);
  border: 1px solid rgba(75, 85, 99, 0.9);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.05), 0 8px 20px rgba(0, 0, 0, 0.24);
}

:global(.dark) .ai-candidate-panel__title {
  color: rgba(226, 232, 240, 0.86);
}

:global(.dark) .ai-candidate-card {
  border: 1px solid rgba(75, 85, 99, 0.72);
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.5) 0%, rgba(30, 41, 59, 0.5) 100%);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.22);
}

:global(.dark) .ai-candidate-card:hover {
  border-color: rgba(148, 163, 184, 0.35);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
}

:global(.dark) .ai-candidate-cover {
  border-color: rgba(75, 85, 99, 0.72);
  background: rgba(15, 23, 42, 0.52);
}

:global(.dark) .ai-candidate-card__title {
  color: rgba(241, 245, 249, 0.97);
}

:global(.dark) .ai-candidate-card__meta {
  color: rgba(203, 213, 225, 0.9);
}

:global(.dark) .ai-candidate-chip {
  border-color: rgba(75, 85, 99, 0.82);
  background: rgba(30, 41, 59, 0.65);
  color: rgba(226, 232, 240, 0.92);
}

:global(.dark) .ai-candidate-card__reason {
  color: rgba(226, 232, 240, 0.8);
}

:global(.dark) .ai-candidate-card__keyword {
  color: rgba(203, 213, 225, 0.66);
}

:global(.dark) .ai-candidate-preview {
  border-color: rgba(75, 85, 99, 0.72);
  background: rgba(15, 23, 42, 0.35);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.04);
}

:global(.dark) .message-user {
  background: rgba(17, 24, 39, 0.96);
  border-color: rgba(107, 114, 128, 0.65);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

.ai-avatar {
  background: rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.user-avatar {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

:global(.dark) .ai-avatar {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.25);
}

:global(.dark) .user-avatar {
  background: rgba(59, 130, 246, 0.16);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.26);
}

:deep(.chat-composer-input .n-input-wrapper) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.chat-composer-input .n-input__textarea-el) {
  padding-left: 2px;
  padding-right: 2px;
}

:deep(.chat-composer-input .n-input__border),
:deep(.chat-composer-input .n-input__state-border) {
  display: none !important;
}
</style>
