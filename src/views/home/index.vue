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
              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  class="rail-toggle-btn"
                  :class="{ 'rail-toggle-btn--active': showTaskRail }"
                  :title="hasTaskRailContent ? (showTaskRail ? '收起 Agent' : '展开 Agent') : '等待 Agent 计划'"
                  :disabled="!hasTaskRailContent"
                  @click="toggleTaskRail"
                >
                  <n-icon
                    :component="ChevronForwardOutline"
                    size="14"
                    class="rail-toggle-btn__icon"
                    :class="{ 'rail-toggle-btn__icon--open': showTaskRail }"
                  />
                  <span class="text-xs">{{ showTaskRail ? '收起 Agent' : 'Agent' }}</span>
                </button>
                <div class="text-xs opacity-60 shrink-0">{{ modelsLoading ? '模型加载中...' : '' }}</div>
              </div>
            </div>

            <div
              ref="messagesContainerRef"
              class="flex-1 min-h-0 overflow-auto px-1 py-1"
              @scroll.passive="handleMessagesScroll"
            >
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

                  <div :class="msg.role === 'user' ? 'max-w-[86%]' : 'w-full max-w-[90%]'">
                    <div class="text-xs opacity-65 mb-1 px-1">
                      {{ msg.role === 'user' ? currentUserLabel : '小知AI' }}
                    </div>
                    <div
                      class="rounded-2xl px-4 py-3 message-bubble"
                      :class="[
                        msg.role === 'user' ? 'message-user' : 'message-assistant',
                        msg.role === 'assistant' && !msg.pending ? 'message-assistant--stable' : '',
                        msg.renderAsMarkdown ? 'message-bubble--markdown' : 'whitespace-pre-wrap break-words',
                        msg.role === 'assistant' && msg.renderAsMarkdown ? 'message-bubble--quotable' : '',
                        msg.pending ? 'message-pending' : '',
                        msg.pending ? 'opacity-70' : '',
                      ]"
                      @contextmenu.prevent="handleMessageContextMenu($event, msg)"
                    >
                      <div v-if="msg.pending" class="thinking-indicator text-sm">
                        <span class="thinking-indicator__label">浏览中</span>
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
                      <div
                        v-else-if="msg.content"
                        :class="msg.role === 'assistant' ? 'message-plain-text' : 'whitespace-pre-wrap break-words'"
                      >
                        {{ msg.content }}
                      </div>
                      <div v-if="msg.quote?.content" class="message-quote-chip mt-3">
                        <div class="message-quote-chip__label">{{ msg.quote.label || '引用内容' }}</div>
                        <div class="message-quote-chip__body">{{ summarizeQuote(msg.quote.content) }}</div>
                      </div>
                      <div v-if="(msg.images || []).length" class="mt-3 flex flex-wrap gap-2">
                        <button
                          v-for="(img, imgIdx) in (msg.images || [])"
                          :key="`${msg.localId}-img-${img.url}-${imgIdx}`"
                          type="button"
                          class="message-image-thumb"
                          @click="openImagePreview(img.url, img.file_name || `图片${imgIdx + 1}`)"
                        >
                          <img :src="img.url" :alt="img.file_name || `图片${imgIdx + 1}`" class="message-image-thumb__img" loading="lazy" />
                        </button>
                      </div>
                    </div>

                    <div
                      v-if="msg.role === 'assistant' && msg.searchProgressVisible"
                      class="mt-2 px-1"
                    >
                      <div class="rounded-xl p-2 search-progress-panel">
                        <div class="text-[11px] opacity-70 mb-1">访问站点</div>
                        <div
                          v-if="assistantProgressLine(msg)"
                          class="text-[11px] leading-4 search-focus-line truncate"
                          :title="assistantProgressLine(msg)"
                        >
                          <a
                            v-if="isHttpUrl(assistantProgressLine(msg))"
                            :href="assistantProgressLine(msg)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="underline"
                          >
                            {{ assistantProgressLine(msg) }}
                          </a>
                          <span v-else>{{ assistantProgressLine(msg) }}</span>
                        </div>
                      </div>
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

                    <div v-if="shouldRenderWorkflowLearningPathSections(msg)" class="mt-3 px-1">
                      <div class="rounded-2xl p-3 knowledge-hit-panel">
                        <div class="text-xs opacity-70 mb-2">按学习步骤推荐的视频</div>
                        <div
                          v-for="section in messageWorkflowLearningPathSections(msg)"
                          :key="`${msg.localId}-${section.stageId}`"
                          class="mb-4 last:mb-0"
                        >
                          <div class="flex items-start justify-between gap-3 mb-2">
                            <div class="min-w-0">
                              <div class="text-sm font-semibold">
                                第{{ section.stepIndex }}步：{{ section.title }}
                              </div>
                              <div v-if="section.goal" class="text-xs opacity-80 mt-1">
                                {{ section.goal }}
                              </div>
                              <div v-if="section.why" class="text-[11px] opacity-65 mt-1">
                                为什么先学：{{ section.why }}
                              </div>
                              <div v-if="section.practiceHint" class="text-[11px] opacity-65 mt-1">
                                练习建议：{{ section.practiceHint }}
                              </div>
                            </div>
                            <n-tag size="small" type="info">
                              {{ Array.isArray(section.items) ? section.items.length : 0 }} 个视频
                            </n-tag>
                          </div>
                          <div v-if="Array.isArray(section.items) && section.items.length" class="grid grid-cols-2 gap-2">
                            <div
                              v-for="(video, idx) in section.items"
                              :key="`${section.stageId}-${video.url || video.title || idx}`"
                              class="rounded-xl p-2 ai-candidate-card flex flex-col"
                            >
                              <div class="rounded-lg overflow-hidden ai-candidate-cover mb-2 relative">
                                <button
                                  type="button"
                                  class="ai-candidate-cover__trigger"
                                  @click="openCandidateFullscreen(video)"
                                >
                                  <img
                                    v-if="videoCoverUrl(video)"
                                    :src="videoCoverUrl(video) || undefined"
                                    alt="视频封面"
                                    class="w-full aspect-video object-cover"
                                    loading="lazy"
                                    referrerpolicy="no-referrer"
                                  />
                                  <div v-else class="w-full aspect-video flex items-center justify-center text-xs opacity-60">
                                    暂无封面
                                  </div>
                                  <div
                                    v-if="videoEmbedUrl(video) || videoPlayableUrl(video)"
                                    class="ai-candidate-cover__overlay"
                                  >
                                    <span class="ai-candidate-cover__play" title="播放视频">
                                      <n-icon :component="Play" size="22" />
                                    </span>
                                  </div>
                                </button>
                                <button
                                  v-if="canPreviewCandidate(video)"
                                  type="button"
                                  class="ai-candidate-cover__fullscreen"
                                  title="全屏预览"
                                  @click.stop="openCandidateFullscreen(video)"
                                >
                                  全屏
                                </button>
                              </div>
                              <div class="min-w-0 flex-1 flex flex-col">
                                <div class="text-xs font-semibold leading-[1.45] break-words ai-candidate-card__title line-clamp-2">
                                  {{ candidateDisplayTitle(video, idx) }}
                                </div>
                                <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ai-candidate-card__meta">
                                  <span v-if="video.up">{{ String(video.up) }}</span>
                                  <span v-if="video.duration">{{ String(video.duration) }}</span>
                                </div>
                                <div v-if="candidateStatItems(video).length" class="mt-1 flex flex-wrap gap-1">
                                  <span
                                    v-for="(it, statIdx) in candidateStatItems(video)"
                                    :key="`${section.stageId}-${idx}-${statIdx}-${it.label}-${it.value}`"
                                    class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ai-candidate-chip"
                                  >
                                    {{ it.label }} {{ it.value }}
                                  </span>
                                </div>
                              </div>
                              <div class="mt-2 flex items-center justify-end">
                                <n-space size="small">
                                  <n-button
                                    size="tiny"
                                    secondary
                                    @click="openVideoUrl(video)"
                                    :disabled="!canOpenVideoUrl(video)"
                                  >
                                    打开原视频
                                  </n-button>
                                  <n-button
                                    size="tiny"
                                    secondary
                                    @click="openCandidateFullscreen(video)"
                                    :disabled="!canPreviewCandidate(video)"
                                  >
                                    全屏预览
                                  </n-button>
                                  <n-button
                                    size="tiny"
                                    type="primary"
                                    @click="summarizeWorkflowResource(video)"
                                    :loading="isSelectingWorkflowResource(video)"
                                    :disabled="!String(video.url || '').trim() || !chatSessionUuid"
                                  >
                                    总结笔记
                                  </n-button>
                                </n-space>
                              </div>
                            </div>
                          </div>
                          <div v-else class="text-xs opacity-60 rounded-xl px-3 py-3 border border-slate-200/70">
                            这一阶段本轮还没有筛到足够匹配的视频，可继续补检索。
                          </div>
                        </div>
                        <div
                          v-for="group in workflowSupplementalResourceCardGroups(msg.agentWorkflow)"
                          :key="`supplement-${group.label}`"
                          class="mt-4"
                        >
                          <div class="text-[11px] font-medium mb-1">{{ group.label }}</div>
                          <div class="grid grid-cols-2 gap-2">
                            <div
                              v-for="(video, idx) in group.items"
                              :key="`${group.label}-${video.url || video.title || idx}`"
                              class="rounded-xl p-2 ai-candidate-card flex flex-col"
                            >
                              <div class="rounded-lg overflow-hidden ai-candidate-cover mb-2 relative">
                                <button
                                  type="button"
                                  class="ai-candidate-cover__trigger"
                                  @click="openCandidateFullscreen(video)"
                                >
                                  <img
                                    v-if="videoCoverUrl(video)"
                                    :src="videoCoverUrl(video) || undefined"
                                    alt="视频封面"
                                    class="w-full aspect-video object-cover"
                                    loading="lazy"
                                    referrerpolicy="no-referrer"
                                  />
                                  <div v-else class="w-full aspect-video flex items-center justify-center text-xs opacity-60">
                                    暂无封面
                                  </div>
                                </button>
                                <button
                                  v-if="canPreviewCandidate(video)"
                                  type="button"
                                  class="ai-candidate-cover__fullscreen"
                                  title="全屏预览"
                                  @click.stop="openCandidateFullscreen(video)"
                                >
                                  全屏
                                </button>
                              </div>
                              <div class="text-xs font-semibold leading-[1.45] break-words ai-candidate-card__title line-clamp-2">
                                {{ candidateDisplayTitle(video, idx) }}
                              </div>
                              <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ai-candidate-card__meta">
                                <span v-if="video.up">{{ String(video.up) }}</span>
                                <span v-if="video.duration">{{ String(video.duration) }}</span>
                              </div>
                              <div v-if="candidateStatItems(video).length" class="mt-1 flex flex-wrap gap-1">
                                <span
                                  v-for="(it, statIdx) in candidateStatItems(video)"
                                  :key="`${group.label}-${idx}-${statIdx}-${it.label}-${it.value}`"
                                  class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ai-candidate-chip"
                                >
                                  {{ it.label }} {{ it.value }}
                                </span>
                              </div>
                              <div class="mt-2 flex items-center justify-end">
                                <n-space size="small">
                                  <n-button size="tiny" secondary :disabled="!canOpenVideoUrl(video)" @click="openVideoUrl(video)">
                                    打开原视频
                                  </n-button>
                                  <n-button size="tiny" secondary :disabled="!canPreviewCandidate(video)" @click="openCandidateFullscreen(video)">
                                    全屏预览
                                  </n-button>
                                  <n-button
                                    size="tiny"
                                    type="primary"
                                    @click="summarizeWorkflowResource(video)"
                                    :loading="isSelectingWorkflowResource(video)"
                                    :disabled="!String(video.url || '').trim() || !chatSessionUuid"
                                  >
                                    总结笔记
                                  </n-button>
                                </n-space>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-else-if="shouldRenderWorkflowResourceCards(msg)" class="mt-3 px-1">
                      <div class="rounded-2xl p-3 knowledge-hit-panel">
                        <div class="text-xs opacity-70 mb-2">推荐资源</div>
                        <div
                          v-for="group in workflowResourceCardGroups(msg.agentWorkflow)"
                          :key="group.label"
                          class="mb-3"
                        >
                          <div class="text-[11px] font-medium mb-1">{{ group.label }}</div>
                          <div class="grid grid-cols-2 gap-2">
                            <div
                              v-for="(video, idx) in group.items"
                              :key="`${group.label}-${video.url || video.title || idx}`"
                              class="rounded-xl p-2 ai-candidate-card flex flex-col"
                            >
                              <div class="rounded-lg overflow-hidden ai-candidate-cover mb-2 relative">
                                <button
                                  type="button"
                                  class="ai-candidate-cover__trigger"
                                  @click="openCandidateFullscreen(video)"
                                >
                                  <img
                                    v-if="videoCoverUrl(video)"
                                    :src="videoCoverUrl(video) || undefined"
                                    alt="视频封面"
                                    class="w-full aspect-video object-cover"
                                    loading="lazy"
                                    referrerpolicy="no-referrer"
                                  />
                                  <div v-else class="w-full aspect-video flex items-center justify-center text-xs opacity-60">
                                    暂无封面
                                  </div>
                                </button>
                                <button
                                  v-if="canPreviewCandidate(video)"
                                  type="button"
                                  class="ai-candidate-cover__fullscreen"
                                  title="全屏预览"
                                  @click.stop="openCandidateFullscreen(video)"
                                >
                                  全屏
                                </button>
                              </div>
                              <div class="text-xs font-semibold leading-[1.45] break-words ai-candidate-card__title line-clamp-2">
                                {{ candidateDisplayTitle(video, idx) }}
                              </div>
                              <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ai-candidate-card__meta">
                                <span v-if="video.up">{{ String(video.up) }}</span>
                                <span v-if="video.duration">{{ String(video.duration) }}</span>
                              </div>
                              <div v-if="candidateStatItems(video).length" class="mt-1 flex flex-wrap gap-1">
                                <span
                                  v-for="(it, statIdx) in candidateStatItems(video)"
                                  :key="`${group.label}-${idx}-${statIdx}-${it.label}-${it.value}`"
                                  class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ai-candidate-chip"
                                >
                                  {{ it.label }} {{ it.value }}
                                </span>
                              </div>
                              <div class="mt-2 flex items-center justify-end gap-1">
                                <n-button size="tiny" secondary :disabled="!canOpenVideoUrl(video)" @click="openVideoUrl(video)">
                                  打开原视频
                                </n-button>
                                <n-button size="tiny" secondary :disabled="!canPreviewCandidate(video)" @click="openCandidateFullscreen(video)">
                                  全屏预览
                                </n-button>
                                <n-button
                                  size="tiny"
                                  type="primary"
                                  @click="summarizeWorkflowResource(video)"
                                  :loading="isSelectingWorkflowResource(video)"
                                  :disabled="!String(video.url || '').trim() || !chatSessionUuid"
                                >
                                  总结笔记
                                </n-button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="msg.role === 'assistant' && (msg.knowledgeHits || []).length" class="mt-3 px-1">
                      <div class="rounded-2xl p-3 knowledge-hit-panel">
                        <div class="flex items-center justify-between gap-2 mb-2">
                          <div class="text-xs knowledge-hit-panel__title">知识命中（全局知识库）</div>
                          <n-tag size="small" type="success">{{ (msg.knowledgeHits || []).length }}</n-tag>
                        </div>
                        <div class="space-y-2">
                          <div
                            v-for="(hit, idx) in (msg.knowledgeHits || [])"
                            :key="knowledgeHitKey(hit, idx)"
                            class="rounded-xl p-3 knowledge-hit-card"
                          >
                            <div class="flex items-start justify-between gap-3">
                              <div class="min-w-0 flex-1">
                                <div class="text-xs knowledge-hit-card__type mb-1">
                                  {{ hit.doc_type === 'video' ? '视频笔记' : '主题笔记' }}
                                </div>
                                <div class="text-sm font-medium leading-5 break-words knowledge-hit-card__title">
                                  {{ knowledgeHitDisplayTitle(hit) }}
                                </div>
                                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs knowledge-hit-card__meta">
                                  <span v-if="hit.up_name">UP：{{ String(hit.up_name) }}</span>
                                  <span v-if="hit.duration_text">时长：{{ String(hit.duration_text) }}</span>
                                </div>
                                <div v-if="hit.snippet" class="text-xs knowledge-hit-card__snippet mt-2 break-words">
                                  {{ String(hit.snippet) }}
                                </div>
                              </div>
                              <div class="flex flex-col gap-1 shrink-0">
                                <n-button
                                  v-if="hit.note_md_path"
                                  size="tiny"
                                  type="primary"
                                  @click="downloadKnowledgeNote(hit)"
                                >
                                  查看笔记
                                </n-button>
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
                        </div>
                        <div class="text-xs knowledge-hit-panel__footer mt-2">
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

                        <div class="grid grid-cols-3 gap-2">
                          <div
                            v-for="(video, idx) in pagedJobVideoCandidates(msg.task.job_id)"
                            :key="`${msg.task.job_id}-${video.url || video.title || idx}`"
                            class="rounded-xl p-2 ai-candidate-card flex flex-col"
                          >
                            <!-- Thumbnail / Inline Player -->
                            <div class="rounded-lg overflow-hidden ai-candidate-cover mb-2">
                              <template v-if="activeVideoPreviewKey(msg.task.job_id) === videoPreviewKey(video) && videoPlayableUrl(video)">
                                <video
                                  :src="videoPlayableUrl(video) || undefined"
                                  class="w-full aspect-video bg-black"
                                  controls
                                  playsinline
                                  preload="auto"
                                />
                                <div class="ai-candidate-cover__actions">
                                  <button
                                    type="button"
                                    class="ai-candidate-cover__action"
                                    title="全屏预览"
                                    @click.stop="openCandidateFullscreen(video)"
                                  >
                                    全屏
                                  </button>
                                  <button
                                    type="button"
                                    class="ai-candidate-cover__action"
                                    title="收起播放"
                                    @click.stop="toggleVideoPreview(msg.task.job_id, video)"
                                  >
                                    收起
                                  </button>
                                </div>
                              </template>
                              <template v-else-if="activeVideoPreviewKey(msg.task.job_id) === videoPreviewKey(video) && videoEmbedUrl(video)">
                                <iframe
                                  :src="videoEmbedUrl(video) || undefined"
                                  class="w-full aspect-video bg-black"
                                  frameborder="0"
                                  allow="autoplay; fullscreen"
                                  allowfullscreen
                                  scrolling="no"
                                />
                                <div class="ai-candidate-cover__actions">
                                  <button
                                    type="button"
                                    class="ai-candidate-cover__action"
                                    title="全屏预览"
                                    @click.stop="openCandidateFullscreen(video)"
                                  >
                                    全屏
                                  </button>
                                  <button
                                    type="button"
                                    class="ai-candidate-cover__action"
                                    title="收起播放"
                                    @click.stop="toggleVideoPreview(msg.task.job_id, video)"
                                  >
                                    收起
                                  </button>
                                </div>
                              </template>
                              <template v-else>
                                <button
                                  type="button"
                                  class="ai-candidate-cover__trigger"
                                  @click="handleCandidateCoverClick(msg.task.job_id, video)"
                                >
                                  <img
                                    v-if="videoCoverUrl(video)"
                                    :src="videoCoverUrl(video) || undefined"
                                    alt="视频封面"
                                    class="w-full aspect-video object-cover"
                                    loading="lazy"
                                    referrerpolicy="no-referrer"
                                  />
                                  <div v-else class="w-full aspect-video flex items-center justify-center text-xs opacity-60">
                                    暂无封面
                                  </div>
                                  <div
                                    v-if="videoEmbedUrl(video) || videoPlayableUrl(video)"
                                    class="ai-candidate-cover__overlay"
                                  >
                                    <span class="ai-candidate-cover__play" title="播放视频">
                                      <n-icon :component="Play" size="22" />
                                    </span>
                                  </div>
                                </button>
                                <button
                                  v-if="videoEmbedUrl(video) || videoPlayableUrl(video)"
                                  type="button"
                                  class="ai-candidate-cover__fullscreen"
                                  title="全屏预览"
                                  @click.stop="openCandidateFullscreen(video)"
                                >
                                  全屏
                                </button>
                              </template>
                            </div>

                            <!-- Content -->
                            <div class="min-w-0 flex-1 flex flex-col">
                              <label class="inline-flex items-center gap-1.5 text-xs mb-1 opacity-75 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  :checked="isCandidateSelected(msg.task.job_id, video)"
                                  @change="toggleCandidateSelected(msg.task.job_id, video)"
                                />
                                <span>加入队列总结</span>
                              </label>
                              <div class="text-xs font-semibold leading-[1.45] break-words ai-candidate-card__title line-clamp-2">
                                {{ candidateDisplayTitle(video, idx) }}
                              </div>
                              <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ai-candidate-card__meta">
                                <span v-if="video.up">{{ String(video.up) }}</span>
                                <span v-if="video.duration">{{ String(video.duration) }}</span>
                              </div>
                              <div v-if="candidateStatItems(video).length" class="mt-1 flex flex-wrap gap-1">
                                <span
                                  v-for="(it, statIdx) in candidateStatItems(video)"
                                  :key="`${statIdx}-${it.label}-${it.value}`"
                                  class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ai-candidate-chip"
                                >
                                  {{ it.label }} {{ it.value }}
                                </span>
                              </div>
                            </div>

                            <div class="mt-2 flex items-center justify-end">
                              <n-space size="small">
                                <n-button
                                  size="tiny"
                                  secondary
                                  @click="openVideoUrl(video)"
                                  :disabled="!canOpenVideoUrl(video)"
                                >
                                  打开原视频
                                </n-button>
                                <n-button
                                  size="tiny"
                                  secondary
                                  @click="openCandidateFullscreen(video)"
                                  :disabled="!canPreviewCandidate(video)"
                                >
                                  全屏预览
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

                          </div>
                        </div>
                        <div v-if="jobVideoCandidates(msg.task.job_id).length > candidatePageSize()" class="mt-3 flex items-center justify-end gap-2 text-xs">
                          <n-button size="tiny" secondary :disabled="candidateCurrentPage(msg.task.job_id) <= 1" @click="setCandidatePage(msg.task.job_id, candidateCurrentPage(msg.task.job_id) - 1)">
                            上一页
                          </n-button>
                          <span class="opacity-70">
                            第 {{ candidateCurrentPage(msg.task.job_id) }} / {{ candidateTotalPages(msg.task.job_id) }} 页
                          </span>
                          <n-button size="tiny" secondary :disabled="candidateCurrentPage(msg.task.job_id) >= candidateTotalPages(msg.task.job_id)" @click="setCandidatePage(msg.task.job_id, candidateCurrentPage(msg.task.job_id) + 1)">
                            下一页
                          </n-button>
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
              <div class="rounded-[24px] composer-shell px-4 py-3" @paste.capture="handleComposerPaste">
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="search-mode-chip"
                      :class="{ 'search-mode-chip--active': retrievalModeNetwork }"
                      :disabled="!knowledgeRetrievalEnabled"
                      @click="retrievalModeNetwork = !retrievalModeNetwork"
                    >
                      联网检索
                    </button>
                    <button
                      type="button"
                      class="search-mode-chip"
                      :class="{ 'search-mode-chip--active': retrievalModeBili }"
                      :disabled="!knowledgeRetrievalEnabled"
                      @click="retrievalModeBili = !retrievalModeBili"
                    >
                      B站检索
                    </button>
                    <button
                      type="button"
                      class="search-mode-chip"
                      :class="{ 'search-mode-chip--active': retrievalModeDouyin }"
                      :disabled="!knowledgeRetrievalEnabled"
                      @click="retrievalModeDouyin = !retrievalModeDouyin"
                    >
                      抖音检索
                    </button>

                  </div>
                </div>

                <div v-if="composerQuote?.content" class="composer-quote mb-3">
                  <div class="composer-quote__head">
                    <span>{{ composerQuote.label || '引用内容' }}</span>
                    <button type="button" class="composer-quote__remove" @click="clearComposerQuote">移除</button>
                  </div>
                </div>

                <div v-if="composerImages.length" class="mb-3 flex flex-wrap gap-2">
                  <div
                    v-for="(img, idx) in composerImages"
                    :key="img.localId || `${img.url}-${idx}`"
                    class="composer-image-chip"
                  >
                    <button
                      type="button"
                      class="composer-image-chip__button"
                      @click="openImagePreview(img.previewUrl || img.url, img.file_name || `图片${idx + 1}`)"
                    >
                      <img :src="img.previewUrl || img.url" :alt="img.file_name || `图片${idx + 1}`" class="composer-image-chip__img" />
                    </button>
                    <div
                      v-if="img.uploadStatus === 'uploading' || img.uploadStatus === 'failed'"
                      class="composer-image-chip__overlay"
                      :class="{ 'composer-image-chip__overlay--error': img.uploadStatus === 'failed' }"
                    >
                      <div
                        v-if="img.uploadStatus === 'uploading'"
                        class="composer-image-chip__progress"
                        :style="{ '--progress': `${Math.max(0, Math.min(100, Number(img.uploadProgress || 0)))}%` }"
                      >
                        <span>{{ Math.max(0, Math.min(100, Number(img.uploadProgress || 0))) }}%</span>
                      </div>
                      <button
                        v-else
                        type="button"
                        class="composer-image-chip__retry"
                        :title="img.errorMessage || '重新上传'"
                        @click.stop="retryComposerImage(img.localId || '')"
                      >
                        <n-icon :component="RefreshOutline" size="18" />
                      </button>
                    </div>
                    <button type="button" class="composer-image-chip__remove" @click.stop="removeComposerImage(idx)">×</button>
                  </div>
                </div>

                <n-input
                  ref="composerInputRef"
                  v-model:value="userInput"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 8 }"
                  class="chat-composer-input"
                  placeholder="像聊天一样输入问题（如：你能帮我做什么 / 什么是LLM？）"
                  @compositionstart="onInputCompositionStart"
                  @compositionend="onInputCompositionEnd"
                  @keydown.enter.exact.prevent="handleEnterSend"
                />

                <div class="mt-3 flex items-center justify-between gap-3">
                  <div class="text-xs opacity-70">
                    Enter发送 · Shift+Enter换行 · 支持上传图片与 {{ pasteShortcutLabel }} 粘贴图片
                  </div>
                  <n-space align="center">
                    <input
                      ref="composerImageInputRef"
                      type="file"
                      accept="image/*"
                      multiple
                      class="hidden"
                      @change="handleComposerFileInputChange"
                    />
                    <n-button quaternary :loading="uploadingComposerImages" @click="openComposerImagePicker">上传图片</n-button>
                    <n-button @click="clearInput" quaternary>清空</n-button>
                    <button
                      type="button"
                      class="knowledge-toggle"
                      :class="{ 'knowledge-toggle--active': knowledgeRetrievalEnabled }"
                      @click="toggleKnowledgeRetrieval"
                    >
                      知识检索
                    </button>
                    <button
                      type="button"
                      class="send-icon-btn"
                      :class="{ 'send-icon-btn--stopping': sending }"
                      :disabled="sending ? stoppingReply : ((!userInput.trim() && !composerImages.length && !composerQuote) || uploadingComposerImages || hasFailedComposerImages)"
                      :title="sending ? '停止回复' : '发送'"
                      @click="sending ? stopCurrentReply() : sendMessage()"
                    >
                      <n-icon :component="sending ? StopOutline : ArrowUpOutline" size="18" />
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
              <span class="font-semibold">Agent</span>
              <n-tag v-if="jobsStore.currentJobId" size="small" :type="tagType(currentSnapshot?.status)">
                {{ statusLabel(currentSnapshot?.status) }}
              </n-tag>
              <n-tag v-else-if="currentRailWorkflow" size="small" type="info">
                {{ workflowStatusLabel(currentRailWorkflow?.master_plan?.workflow_status) }}
              </n-tag>
            </div>
          </template>

          <template v-if="jobsStore.currentJobId || currentRailWorkflow">
            <div class="h-full min-h-0 flex flex-col gap-3 overflow-auto pr-1 right-rail-scroll">
              <div v-if="jobsStore.currentJobId" class="rail-section rail-section--meta">
                <div class="text-xs opacity-70 mb-1">当前任务ID</div>
                <div class="font-mono text-xs break-all">{{ jobsStore.currentJobId }}</div>
              </div>

              <div v-if="jobsStore.currentJobId" class="rail-section rail-section--stage">
                <div class="text-xs opacity-70 mb-1">正在进行的步骤</div>
                <div class="font-medium">{{ humanizeStage(currentSnapshot?.stage || '') || '等待中' }}</div>
                <div class="text-xs opacity-70 mt-1">{{ humanizeDetail(currentSnapshot?.detail || '', currentSnapshot?.stage || '') || '系统将自动更新' }}</div>
              </div>

              <div v-if="jobsStore.currentJobId" class="rail-section rail-section--actions">
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

              <div v-if="currentRailWorkflow" class="rail-section rail-section--plain">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="text-xs opacity-70">Agent 工作流</div>
                  <div class="flex items-center gap-2">
                    <n-button
                      v-if="jobsStore.currentJobId"
                      size="tiny"
                      quaternary
                      type="primary"
                      :loading="workflowReplayLoading('job', jobsStore.currentJobId)"
                      @click="toggleCurrentJobWorkflowReplay"
                    >
                      {{ workflowReplayOpen('job', jobsStore.currentJobId) ? '收起完整回放' : '回放完整任务链' }}
                    </n-button>
                    <n-tag size="small" type="info">
                      {{ workflowStatusLabel(currentRailWorkflow?.master_plan?.workflow_status) }}
                    </n-tag>
                  </div>
                </div>
                <div class="rail-subpanel p-2 space-y-3">
                  <div v-if="workflowCurrentStage(currentRailWorkflow)" class="text-xs">
                    <span class="opacity-60">当前阶段：</span>
                    <span class="font-medium">{{ workflowCurrentStage(currentRailWorkflow) }}</span>
                  </div>
                  <div v-if="workflowDecisionText(currentRailWorkflow)" class="text-xs leading-5 break-words">
                    <span class="opacity-60">主决策：</span>
                    <span>{{ workflowDecisionText(currentRailWorkflow) }}</span>
                  </div>
                  <div>
                    <div class="text-xs opacity-70 mb-2">任务图</div>
                    <div class="space-y-2">
                      <div
                        v-for="task in workflowTaskPreview(currentRailWorkflow)"
                        :key="task.task_id"
                        class="rounded-xl border border-slate-200/60 px-2 py-2"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <div class="text-xs font-medium break-words">{{ workflowTaskDisplayName(task) }}</div>
                          <n-tag size="tiny" :type="String(task.status || '') === 'completed' ? 'success' : String(task.status || '') === 'failed' ? 'error' : 'default'">
                            {{ workflowStatusLabel(task.status) }}
                          </n-tag>
                        </div>
                        <div class="text-[11px] opacity-70 mt-1 break-words">
                          {{ task.summary_for_ui || task.task_goal || '等待执行' }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="workflowRecentTrace(currentRailWorkflow).length">
                    <div class="text-xs opacity-70 mb-2">最近执行</div>
                    <div class="space-y-2">
                      <div
                        v-for="trace in workflowRecentTrace(currentRailWorkflow)"
                        :key="`${trace.task_id}-${trace.ts || ''}`"
                        class="rounded-xl border border-slate-200/60 px-2 py-2"
                      >
                        <div class="text-xs font-medium">{{ workflowIdentifierLabel(trace.task_id) || '执行步骤' }}</div>
                        <div class="text-[11px] opacity-70 break-words mt-1">
                          {{ trace.compressed_result?.key_result || trace.compressed_result?.what_was_done || workflowStatusLabel(trace.status) }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="workflowErrorPreview(currentRailWorkflow).length">
                    <div class="text-xs opacity-70 mb-2">错误恢复</div>
                    <div
                      v-for="row in workflowErrorPreview(currentRailWorkflow)"
                      :key="`${row.task_id || 'err'}-${row.ts || ''}`"
                      class="rounded-xl border border-red-200/70 px-2 py-2"
                    >
                      <div class="text-xs font-medium">{{ workflowIdentifierLabel(row.task_id) || '系统错误' }}</div>
                      <div class="text-[11px] opacity-80 break-words mt-1">{{ row.error_message || row.error_type || '未知错误' }}</div>
                      <div v-if="row.recovery_action" class="text-[11px] opacity-70 mt-1">恢复：{{ row.recovery_action }}</div>
                    </div>
                  </div>
                  <div v-if="jobsStore.currentJobId && workflowReplayOpen('job', jobsStore.currentJobId)">
                    <n-spin :show="workflowReplayLoading('job', jobsStore.currentJobId)">
                      <div
                        v-if="workflowReplayRecord('job', jobsStore.currentJobId)"
                        class="rounded-xl border border-slate-200/70 px-2 py-3 bg-white/70 space-y-3"
                      >
                        <div class="text-[11px] opacity-70 break-words">
                          记录键：{{ workflowReplayRecord('job', jobsStore.currentJobId)?.state_key }}
                        </div>
                        <div class="grid grid-cols-1 gap-1 text-[11px] opacity-80">
                          <div v-if="workflowReplayRecord('job', jobsStore.currentJobId)?.updated_at">
                            更新时间：{{ workflowReplayRecord('job', jobsStore.currentJobId)?.updated_at }}
                          </div>
                          <div v-if="workflowReplayRecord('job', jobsStore.currentJobId)?.finished_at">
                            结束时间：{{ workflowReplayRecord('job', jobsStore.currentJobId)?.finished_at }}
                          </div>
                        </div>
                        <div v-if="workflowReplayArtifactsPreview(workflowReplayRecord('job', jobsStore.currentJobId)).length">
                          <div class="text-xs opacity-70 mb-1">运行态摘要</div>
                          <div
                            v-for="row in workflowReplayArtifactsPreview(workflowReplayRecord('job', jobsStore.currentJobId))"
                            :key="`job-${jobsStore.currentJobId}-${row.label}`"
                            class="text-[11px] leading-5 break-words"
                          >
                            <span class="font-medium">{{ row.label }}：</span>{{ row.value }}
                          </div>
                        </div>
                        <div>
                          <div class="text-xs opacity-70 mb-2">完整任务图</div>
                          <div class="space-y-2 max-h-72 overflow-auto pr-1">
                            <div
                              v-for="task in workflowAllTasks(workflowReplayRecord('job', jobsStore.currentJobId)?.workflow)"
                              :key="`job-${jobsStore.currentJobId}-${task.task_id}`"
                              class="rounded-xl border border-slate-200/70 px-2 py-2"
                            >
                              <div class="flex items-center justify-between gap-2">
                                <div class="text-xs font-medium break-words">{{ workflowTaskDisplayName(task) }}</div>
                                <n-tag size="tiny" :type="String(task.status || '') === 'completed' ? 'success' : String(task.status || '') === 'failed' ? 'error' : 'default'">
                                  {{ workflowStatusLabel(task.status) }}
                                </n-tag>
                              </div>
                              <div class="text-[11px] opacity-70 mt-1 break-words">
                                {{ task.summary_for_ui || task.task_goal || '等待执行' }}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-if="workflowAllTraces(workflowReplayRecord('job', jobsStore.currentJobId)?.workflow).length">
                          <div class="text-xs opacity-70 mb-2">完整执行轨迹</div>
                          <div class="space-y-2 max-h-72 overflow-auto pr-1">
                            <div
                              v-for="trace in workflowAllTraces(workflowReplayRecord('job', jobsStore.currentJobId)?.workflow)"
                              :key="`job-${jobsStore.currentJobId}-${trace.task_id}-${trace.ts || ''}`"
                              class="rounded-xl border border-slate-200/70 px-2 py-2"
                            >
                              <div class="text-xs font-medium">{{ workflowIdentifierLabel(trace.task_id) || '执行步骤' }}</div>
                              <div class="text-[11px] opacity-70 mt-1 break-words">
                                {{ trace.compressed_result?.key_result || trace.compressed_result?.what_was_done || workflowStatusLabel(trace.status) }}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div v-if="workflowAllErrors(workflowReplayRecord('job', jobsStore.currentJobId)?.workflow).length">
                          <div class="text-xs opacity-70 mb-2">错误恢复</div>
                          <div class="space-y-2 max-h-56 overflow-auto pr-1">
                            <div
                              v-for="row in workflowAllErrors(workflowReplayRecord('job', jobsStore.currentJobId)?.workflow)"
                              :key="`job-${jobsStore.currentJobId}-${row.task_id || 'err'}-${row.ts || ''}`"
                              class="rounded-xl border border-red-200/70 px-2 py-2"
                            >
                              <div class="text-xs font-medium">{{ workflowIdentifierLabel(row.task_id) || '系统错误' }}</div>
                              <div class="text-[11px] opacity-80 break-words mt-1">{{ row.error_message || row.error_type || '未知错误' }}</div>
                              <div v-if="row.recovery_action" class="text-[11px] opacity-70 mt-1">恢复：{{ row.recovery_action }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </n-spin>
                  </div>
                </div>
              </div>

              <div class="rail-section rail-section--plain">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="text-xs opacity-70">任务/检索线程日志（最近）</div>
                  <div class="flex items-center gap-2">
                    <n-space v-if="isAdminUser" size="small">
                      <n-button
                        size="tiny"
                        quaternary
                        :type="sidebarLogViewMode === 'normal' ? 'primary' : 'default'"
                        @click="setSidebarLogViewMode('normal')"
                      >
                        普通
                      </n-button>
                      <n-button
                        size="tiny"
                        quaternary
                        :type="sidebarLogViewMode === 'detail' ? 'primary' : 'default'"
                        @click="setSidebarLogViewMode('detail')"
                      >
                        详细
                      </n-button>
                    </n-space>
                    <n-tag size="small" type="default">{{ currentSidebarLogs.length }}</n-tag>
                  </div>
                </div>
                <div ref="sidebarLogRef" class="rail-subpanel p-2 max-h-[220px] overflow-auto">
                  <div v-if="isSidebarDetailMode && sidebarDetailedLogsLoading" class="text-xs opacity-60 py-2">
                    正在加载详细日志...
                  </div>
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
                    <div class="rail-md-preview" @contextmenu.prevent="handleRailMarkdownContextMenu($event)">
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
    <div
      v-if="quoteContextMenu.visible"
      ref="quoteContextMenuRef"
      class="quote-context-menu"
      :style="{
        left: `${quoteContextMenu.x}px`,
        top: `${quoteContextMenu.y}px`,
      }"
      @click.stop
    >
      <button type="button" class="quote-context-menu__item" @click="applyContextQuote">
        引用到输入框
      </button>
    </div>
    <div
      v-if="imagePreview.visible"
      class="image-preview-layer"
      @click="closeImagePreview"
    >
      <button type="button" class="image-preview-layer__close" @click.stop="closeImagePreview">×</button>
      <div class="image-preview-layer__body" @click.stop>
        <img
          :src="imagePreview.url"
          :alt="imagePreview.label || '图片预览'"
          class="image-preview-layer__img"
        />
        <div v-if="imagePreview.label" class="image-preview-layer__caption">
          {{ imagePreview.label }}
        </div>
      </div>
    </div>
    <div
      v-if="candidateFullscreenPreview.visible"
      class="video-preview-layer"
      @click="closeCandidateFullscreen"
    >
      <button type="button" class="video-preview-layer__close" @click.stop="closeCandidateFullscreen">×</button>
      <div class="video-preview-layer__body" @click.stop>
        <div class="video-preview-layer__header">
          <div class="video-preview-layer__title">
            {{ candidateFullscreenPreview.title || '视频预览' }}
          </div>
          <button
            v-if="candidateFullscreenPreview.pageUrl"
            type="button"
            class="video-preview-layer__link"
            @click.stop="openCandidateFullscreenSource"
          >
            打开原视频
          </button>
        </div>
        <video
          v-if="candidateFullscreenPreview.playableUrl"
          :src="candidateFullscreenPreview.playableUrl"
          class="video-preview-layer__player"
          controls
          autoplay
          playsinline
          preload="auto"
        />
        <iframe
          v-else-if="candidateFullscreenPreview.embedUrl"
          :src="candidateFullscreenPreview.embedUrl"
          class="video-preview-layer__player"
          frameborder="0"
          allow="autoplay; fullscreen"
          allowfullscreen
          scrolling="no"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NCard, NDropdown, NEmpty, NIcon, NInput, NSpace, NSpin, NTag, useMessage } from 'naive-ui'
import { ArrowUpOutline, ChevronDownOutline, ChevronForwardOutline, Play, RefreshOutline, StopOutline } from '@vicons/ionicons5'
import { useJobsStore } from '@/stores/modules/useJobsStore'
import { useChatStore } from '@/stores/modules/useChatStore'
import { useAuthStore } from '@/stores/modules/useAuthStore'
import { useUserStore } from '@/stores/modules/useUserStore'
import { useGlobalStore } from '@/stores/global-store'
import {
  createChatSessionApi,
  getAgentWorkflowStateApi,
  listActiveSearchTasksApi,
  listChatMessagesApi,
  listChatModelsApi,
  saveChatJobNoteMessageApi,
  selectChatCandidateVideoApi,
  selectChatCandidateVideosBatchApi,
  deleteChatImageApi,
  sendChatMessageStreamApi,
  stopChatMessageStreamApi,
  uploadChatImageApi,
} from '@/api/chat'
import { buildJobNoteDownloadUrl, getAdminJobPushLogsApi, getJobNoteApi, getJobNoteLinkApi } from '@/api/jobs'
import { buildApiUrl, getAuthToken } from '@/api/client'
import type { AgentWorkflow, AgentWorkflowStateItem, ChatImageAttachment, ChatMessage, ChatModelItem, ChatQuoteReference, JobCreateResponse, TopicQueueBatchSummary, TopicSelectedVideo } from '@/api/types'
import MarkdownContent from '@/components/MarkdownContent.vue'

type UiComposerImage = ChatImageAttachment & {
  localId?: string
  previewUrl?: string
  uploadStatus?: 'uploading' | 'uploaded' | 'failed'
  uploadProgress?: number
  errorMessage?: string
  sourceFile?: File | null
}

type UiChatMessage = {
  localId: string
  role: 'user' | 'assistant'
  content: string
  images?: UiComposerImage[]
  quote?: ChatQuoteReference | null
  pending?: boolean
  task?: JobCreateResponse | null
  taskSnapshot?: Record<string, any> | null
  toolDecisionReason?: string
  autoTask?: boolean
  knowledgeLookupUsed?: boolean
  knowledgeLookupReason?: string
  knowledgeHits?: Array<Record<string, any>>
  renderAsMarkdown?: boolean
  markdownLabel?: string
  jobNoteJobId?: string
  searchProgressLogs?: Array<{ ts?: string; message: string }>
  searchFocusLine?: string
  searchProgressVisible?: boolean
  streaming?: boolean
  preferMarkdown?: boolean
  agentWorkflowStateKey?: string
  agentWorkflow?: AgentWorkflow | null
}

type WorkflowLearningPathSection = {
  stepIndex: number
  stageId: string
  title: string
  goal: string
  why: string
  practiceHint: string
  items: TopicSelectedVideo[]
}

const router = useRouter()
const route = useRoute()
const message = useMessage()
const jobsStore = useJobsStore()
const chatStore = useChatStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const globalStore = useGlobalStore()

const CHAT_MODEL_STORAGE_KEY = 'robot_web_selected_chat_model'

const userInput = ref('')
const composerQuote = ref<ChatQuoteReference | null>(null)
const composerImages = ref<UiComposerImage[]>([])
const composerInputRef = ref<any>(null)
const composerImageInputRef = ref<HTMLInputElement | null>(null)
const quoteContextMenuRef = ref<HTMLElement | null>(null)
const imeComposing = ref(false)
const messages = ref<UiChatMessage[]>([])
const sending = ref(false)
const stoppingReply = ref(false)
const isMacLikePlatform = ref(false)
const knowledgeRetrievalEnabled = ref(false)
const retrievalModeNetwork = ref(true)
const retrievalModeBili = ref(false)
const retrievalModeDouyin = ref(false)
const chatSessionUuid = ref('')
const chatModels = ref<ChatModelItem[]>([])
const selectedModel = ref<string | null>(null)
const modelsLoading = ref(false)
const messagesContainerRef = ref<HTMLElement | null>(null)
const sidebarLogRef = ref<HTMLElement | null>(null)
const assistantReplyStreaming = ref(false)
const autoFollowMessages = ref(false)
const routeNewChatToken = ref<string>('')
const loadingSessionMessages = ref(false)
const skipNextRouteSessionHydrateUuid = ref('')
const videoPreviewState = ref<Record<string, string>>({})
const selectingVideoState = ref<Record<string, boolean>>({})
const candidateSelectionState = ref<Record<string, Record<string, boolean>>>({})
const batchSelectingJobs = ref<Record<string, boolean>>({})
const candidatePageState = ref<Record<string, number>>({})
const workflowReplayOpenState = ref<Record<string, boolean>>({})
const workflowReplayLoadingState = ref<Record<string, boolean>>({})
const workflowReplayRecords = ref<Record<string, AgentWorkflowStateItem | null>>({})
const taskRailOpen = ref(false)
const taskRailAutoOpened = ref(false)
const quoteContextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  content: '',
  label: '',
})
const imagePreview = ref({
  visible: false,
  url: '',
  label: '',
})
const candidateFullscreenPreview = ref({
  visible: false,
  title: '',
  playableUrl: '',
  embedUrl: '',
  pageUrl: '',
})

const currentJobState = computed(() => (jobsStore.currentJobId ? jobsStore.jobs[jobsStore.currentJobId] : null))
const currentSnapshot = computed(() => currentJobState.value?.snapshot || null)
const currentJobWorkflow = computed(() =>
  (currentJobState.value?.agentWorkflow
    || currentSnapshot.value?.agent_workflow
    || ((currentSnapshot.value?.result as any)?.agent_workflow ?? null)
    || null) as AgentWorkflow | null,
)
const latestChatAgentWorkflow = computed(() => {
  for (let idx = messages.value.length - 1; idx >= 0; idx -= 1) {
    const msg = messages.value[idx]
    if (!msg || msg.role !== 'assistant') continue
    if (workflowHasPlan(msg.agentWorkflow)) return msg.agentWorkflow || null
  }
  return null
})
const currentRailWorkflow = computed(() =>
  workflowHasPlan(currentJobWorkflow.value)
    ? currentJobWorkflow.value
    : (workflowHasPlan(latestChatAgentWorkflow.value) ? latestChatAgentWorkflow.value : null),
)
const uploadingComposerImages = computed(() =>
  composerImages.value.some((img) => img.uploadStatus === 'uploading'),
)
const hasFailedComposerImages = computed(() =>
  composerImages.value.some((img) => img.uploadStatus === 'failed'),
)
const currentUserLabel = computed(() => authStore.user?.display_name || authStore.user?.username || '你')
const loadingCurrentJobNote = ref(false)
const syncingJobNoteMessageByJobId = ref<Record<string, boolean>>({})
const childNoteLoadingByJobId = ref<Record<string, boolean>>({})
const activeSearchTaskLogs = ref<Array<{ ts?: string; message: string }>>([])
const sidebarLogViewMode = ref<'normal' | 'detail'>('normal')
const sidebarDetailedLogsLoading = ref(false)
const sidebarDetailedLogs = ref<Array<{ ts?: string; message: string }>>([])
const activeChatRequestId = ref('')
const sessionMessageCache = ref<Record<string, UiChatMessage[]>>({})
let searchTaskPollTimer: number | null = null
let messagesScrollFrame: number | null = null
let lastResumeSyncAt = 0
let searchTaskPollFailureCount = 0
let searchTaskPollPausedUntil = 0

const SEARCH_TASK_POLL_INTERVAL_MS = 8000
const SEARCH_TASK_POLL_MAX_FAILURES = 3
const SEARCH_TASK_POLL_PAUSE_MS = 60_000

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

const hasTaskRailContent = computed(() => workflowHasPlan(currentRailWorkflow.value))
const showTaskRail = computed(() => taskRailOpen.value && hasTaskRailContent.value)
const pasteShortcutLabel = computed(() => (isMacLikePlatform.value ? '⌘V' : 'Ctrl+V'))

const selectedSearchModes = computed(() => {
  const modes: string[] = []
  if (retrievalModeNetwork.value) modes.push('network')
  if (retrievalModeBili.value) modes.push('bili')
  if (retrievalModeDouyin.value) modes.push('douyin')
  return modes
})

const isAdminUser = computed(() => String(authStore.user?.role || '') === 'admin')
const isSidebarDetailMode = computed(
  () => isAdminUser.value && sidebarLogViewMode.value === 'detail',
)

const currentSidebarLogs = computed(() => {
  if (isSidebarDetailMode.value) {
    return [...sidebarDetailedLogs.value].slice(-80)
  }
  const jobLogs = (currentJobState.value?.logs || []).slice(-40).map((x) => ({
    ts: x.ts,
    message: humanizeSidebarLog(x.message || ''),
  }))
  const taskLogs = (activeSearchTaskLogs.value || []).slice(-80).map((x) => ({
    ts: x.ts,
    message: humanizeSidebarLog(x.message || ''),
  }))
  return [...jobLogs, ...taskLogs]
    .sort((a, b) => String(a.ts || '').localeCompare(String(b.ts || '')))
    .slice(-80)
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
const taskSnapshotByJob = computed(() => {
  const out: Record<string, Record<string, any>> = {}
  for (const msg of messages.value) {
    const jobId = String(msg?.task?.job_id || '').trim()
    if (!jobId) continue
    const snap = msg.taskSnapshot
    if (snap && typeof snap === 'object') out[jobId] = snap
  }
  return out
})

function workflowStatusLabel(status?: string) {
  const s = String(status || '').trim().toLowerCase()
  if (s === 'completed') return '已完成'
  if (s === 'running') return '进行中'
  if (s === 'failed') return '失败'
  if (s === 'degraded') return '降级'
  if (s === 'retrying') return '重试中'
  if (s === 'blocked') return '阻塞'
  if (s === 'skipped') return '已跳过'
  return '待执行'
}

const WORKFLOW_IDENTIFIER_LABELS: Record<string, string> = {
  T_ANALYZE_INTENT: '识别用户意图',
  T_BUILD_PLAN: '生成任务计划',
  T_CREATE_LONG_TASK: '创建长任务',
  T_SEARCH_NETWORK: '联网检索',
  T_SEARCH_BILI: '检索 B站资源',
  T_SEARCH_DOUYIN: '检索抖音资源',
  T_GROUP_RESOURCES: '整理推荐资源',
  T_FINALIZE_OUTPUT: '生成最终输出',
  T_BUILD_LEARNING_PATH: '构建学习路径',
  T_SEARCH_STAGE_RESOURCES_BILI: '分阶段检索 B站资源',
  T_SEARCH_STAGE_RESOURCES_NETWORK: '分阶段联网检索',
  T_CLARIFY_REQUIREMENTS: '澄清关键信息',
  T_PREPARE_MEDIA: '准备媒体素材',
  T_SPLIT_AUDIO: '拆分音频',
  T_ASR_PIPELINE: '语音转写',
  T_NOTE_PIPELINE: '生成笔记',
  T_FINAL_MERGE: '合并最终结果',
  AWAITING_CLARIFICATION: '等待澄清信息',
  FINALIZE_OUTPUT: '生成最终输出',
  JOB_STARTED: '任务已启动',
  BUILD_LEARNING_PATH: '构建学习路径',
  GROUP_RESOURCES: '整理推荐资源',
  COMPLETED: '已完成',
  RUNNING: '进行中',
  FAILED: '失败',
  RETRYING: '重试中',
  BLOCKED: '阻塞',
  DEGRADED: '降级执行',
  PENDING: '待执行',
}

function hasChineseText(text?: string) {
  return /[\u3400-\u9fff]/.test(String(text || ''))
}

function workflowIdentifierLabel(identifier?: string) {
  const raw = String(identifier || '').trim()
  if (!raw) return ''
  if (hasChineseText(raw)) return raw
  const normalized = raw.toUpperCase()
  if (WORKFLOW_IDENTIFIER_LABELS[normalized]) return WORKFLOW_IDENTIFIER_LABELS[normalized]

  let match = normalized.match(/^ASR_CHUNK_(\d+)$/)
  if (match?.[1]) return `第 ${Number(match[1])} 段语音转写`
  match = normalized.match(/^TERM_FIX_CHUNK_(\d+)$/)
  if (match?.[1]) return `第 ${Number(match[1])} 段术语修正`
  match = normalized.match(/^VISION_DECIDE_CHUNK_(\d+)$/)
  if (match?.[1]) return `第 ${Number(match[1])} 段画面判断`
  match = normalized.match(/^NOTE_CHUNK_(\d+)$/)
  if (match?.[1]) return `第 ${Number(match[1])} 段笔记生成`
  match = normalized.match(/^MERGE_CONTIGUOUS_(\d+)_(\d+)$/)
  if (match?.[1] && match?.[2]) return `合并第 ${Number(match[1])}-${Number(match[2])} 段结果`

  if (/^T_[A-Z0-9_]+$/.test(normalized)) return '任务步骤'
  if (/^[A-Z0-9_]+$/.test(normalized)) return '执行步骤'
  return raw
}

function workflowTaskDisplayName(task?: { task_name?: string; task_id?: string } | null) {
  const taskName = String(task?.task_name || '').trim()
  if (hasChineseText(taskName)) return taskName
  const mappedName = workflowIdentifierLabel(taskName)
  if (mappedName && mappedName !== '执行步骤' && mappedName !== '任务步骤') return mappedName
  return workflowIdentifierLabel(task?.task_id) || '任务步骤'
}

function workflowHasPlan(workflow?: AgentWorkflow | null) {
  if (!workflow || typeof workflow !== 'object') return false
  const taskCount = Array.isArray(workflow.task_graph) ? workflow.task_graph.filter(Boolean).length : 0
  if (taskCount > 0) return true
  const traceCount = Array.isArray(workflow.execution_trace) ? workflow.execution_trace.filter(Boolean).length : 0
  if (traceCount > 0) return true
  if (String(workflow.master_plan?.current_stage || '').trim()) return true
  if (String(workflow.master_decision?.decision || workflow.master_decision?.reason || '').trim()) return true
  return false
}

function maybeAutoOpenTaskRail(workflow?: AgentWorkflow | null) {
  if (taskRailAutoOpened.value) return
  if (!workflowHasPlan(workflow)) return
  taskRailOpen.value = true
  taskRailAutoOpened.value = true
}

function workflowTaskPreview(workflow?: AgentWorkflow | null) {
  const rows = Array.isArray(workflow?.task_graph) ? workflow!.task_graph! : []
  return rows.slice(0, 8)
}

function workflowRecentTrace(workflow?: AgentWorkflow | null) {
  const rows = Array.isArray(workflow?.execution_trace) ? workflow!.execution_trace! : []
  return rows.slice(-5).reverse()
}

function workflowErrorPreview(workflow?: AgentWorkflow | null) {
  const rows = Array.isArray(workflow?.error_handling) ? workflow!.error_handling! : []
  return rows.slice(-3).reverse()
}

function workflowResourceToVideo(item: Record<string, any>): TopicSelectedVideo | null {
  if (!item || typeof item !== 'object') return null
  const title = String(item.resource_title || item.title || '').trim()
  const url = String(item.page_url || item.url || '').trim()
  if (!title && !url) return null
  return {
    title,
    url: String(item.url || item.page_url || '').trim(),
    page_url: String(item.page_url || item.url || '').trim(),
    play_url: String(item.play_url || '').trim(),
    cover: String(item.cover || item.pic || item.thumbnail || '').trim(),
    up: String(item.up || '').trim(),
    duration: String(item.duration || '').trim(),
    stats: String(item.stats || '').trim(),
    platform: String(item.platform || '').trim(),
    learning_stage: String(item.learning_stage || '').trim(),
    recommended_reason: String(item.recommended_reason || '').trim(),
    resource_group_type: String(item.resource_group_type || '').trim(),
    resource_type: String(item.resource_type || '').trim(),
    recommended_priority: Number(item.recommended_priority || 0) || 0,
    is_playlist: Boolean(item.is_playlist),
  } as TopicSelectedVideo
}

function normalizeWorkflowStageLabel(raw: unknown) {
  const text = String(raw || '').trim()
  if (!text) return ''
  return text
    .replace(/^第\s*[0-9一二三四五六七八九十百千两]+步\s*[：:]\s*/u, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

function workflowTraceStageVideos(workflow?: AgentWorkflow | null) {
  const traces = Array.isArray(workflow?.execution_trace) ? workflow.execution_trace : []
  const out: TopicSelectedVideo[] = []
  const seen = new Set<string>()
  for (const trace of traces) {
    if (!trace || typeof trace !== 'object') continue
    const taskId = String((trace as any).task_id || '').trim()
    if (!taskId.includes('SEARCH_STAGE_RESOURCES')) continue
    const rawResult = (trace as any).raw_result
    const results = Array.isArray(rawResult?.results) ? rawResult.results : []
    for (const result of results) {
      if (!result || typeof result !== 'object') continue
      const learningStage = String((result as any).learning_stage || '').trim()
      const platform = String((result as any).mode || '').trim().toLowerCase()
      const candidates = Array.isArray((result as any).candidates) ? (result as any).candidates : []
      for (const row of candidates) {
        if (!row || typeof row !== 'object') continue
        const video = workflowResourceToVideo({
          ...row,
          learning_stage: String((row as any).learning_stage || learningStage || '').trim(),
          platform: String((row as any).platform || platform || '').trim(),
          page_url: String((row as any).page_url || (row as any).url || '').trim(),
          url: String((row as any).url || (row as any).page_url || '').trim(),
          play_url: String((row as any).play_url || '').trim(),
          cover: String((row as any).cover || (row as any).pic || (row as any).thumbnail || '').trim(),
          resource_type: String((row as any).resource_type || 'video').trim(),
        })
        if (!video) continue
        const key = [
          String((video as any).page_url || video.url || video.title || '').trim().toLowerCase(),
          normalizeWorkflowStageLabel((video as any).learning_stage),
        ].join('@@')
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push(video)
      }
    }
  }
  return out
}

function mergeWorkflowStageVideos(...groups: TopicSelectedVideo[][]) {
  const out: TopicSelectedVideo[] = []
  const seen = new Set<string>()
  for (const rows of groups) {
    for (const video of rows || []) {
      if (!video || typeof video !== 'object') continue
      const key = [
        String((video as any).page_url || video.url || video.title || '').trim().toLowerCase(),
        normalizeWorkflowStageLabel((video as any).learning_stage),
      ].join('@@')
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(video)
    }
  }
  return out
}

function workflowLearningPath(workflow?: AgentWorkflow | null) {
  const attachments = Array.isArray(workflow?.final_output?.attachments) ? workflow!.final_output!.attachments! : []
  for (const row of attachments) {
    if (!row || typeof row !== 'object') continue
    if (String((row as any).kind || '').trim() !== 'learning_path') continue
    const value = (row as any).value
    if (value && typeof value === 'object') return value as Record<string, any>
  }
  return null
}

function workflowAllResourceVideos(workflow?: AgentWorkflow | null) {
  const grouped = workflow?.resource_recommendations || {}
  const out: TopicSelectedVideo[] = []
  const seen = new Set<string>()
  const appendRows = (rows: unknown[]) => {
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const v = workflowResourceToVideo(row as Record<string, any>)
      if (!v) continue
      const key = [
        String((v as any).page_url || v.url || v.title || '').trim().toLowerCase(),
        String((v as any).learning_stage || '').trim().toLowerCase(),
        String((v as any).resource_group_type || '').trim().toLowerCase(),
      ].join('@@')
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(v)
    }
  }
  appendRows(Array.isArray((grouped as any).playlists) ? (grouped as any).playlists : [])
  appendRows(Array.isArray((grouped as any).single_videos) ? (grouped as any).single_videos : [])
  appendRows(Array.isArray((grouped as any).courses) ? (grouped as any).courses : [])
  return out.sort((a, b) => {
    const pa = Number((a as any).recommended_priority || 999)
    const pb = Number((b as any).recommended_priority || 999)
    if (pa !== pb) return pa - pb
    const ga = String((a as any).resource_group_type || '').trim()
    const gb = String((b as any).resource_group_type || '').trim()
    if (ga !== gb) {
      const order = { playlist: 1, course: 2, single_video: 3 } as Record<string, number>
      return (order[ga] || 99) - (order[gb] || 99)
    }
    return String(a.title || '').localeCompare(String(b.title || ''), 'zh-Hans-CN')
  })
}

function workflowLearningPathSections(workflow?: AgentWorkflow | null): WorkflowLearningPathSection[] {
  const learningPath = workflowLearningPath(workflow)
  const stages = Array.isArray(learningPath?.stages) ? learningPath!.stages : []
  if (!stages.length) return []
  const videos = workflowAllResourceVideos(workflow)
  const traceVideos = workflowTraceStageVideos(workflow)
  const out: WorkflowLearningPathSection[] = []
  for (const [idx, stage] of stages.entries()) {
    if (!stage || typeof stage !== 'object') continue
    const title = String((stage as any).title || '').trim()
    if (!title) continue
    const normalizedTitle = normalizeWorkflowStageLabel(title)
    const stageTraceVideos = traceVideos.filter(
      (video) => normalizeWorkflowStageLabel((video as any).learning_stage) === normalizedTitle,
    )
    const stageResourceVideos = videos.filter(
      (video) => normalizeWorkflowStageLabel((video as any).learning_stage) === normalizedTitle,
    )
    const items = mergeWorkflowStageVideos(stageTraceVideos, stageResourceVideos).slice(0, 6)
    out.push({
        stepIndex: idx + 1,
        stageId: String((stage as any).stage_id || `LP${idx + 1}`).trim(),
        title,
        goal: String((stage as any).goal || '').trim(),
        why: String((stage as any).why || '').trim(),
        practiceHint: String((stage as any).practice_hint || '').trim(),
        items,
      })
  }
  return out
}

function canRenderWorkflowMessageContent(msg?: UiChatMessage | null) {
  if (!msg || msg.role !== 'assistant') return false
  if (msg.pending || msg.streaming) return false
  return Boolean(String(msg.content || '').trim())
}

function messageWorkflowLearningPathSections(msg?: UiChatMessage | null) {
  if (!canRenderWorkflowMessageContent(msg)) return [] as WorkflowLearningPathSection[]
  return workflowLearningPathSections(msg?.agentWorkflow)
}

function shouldRenderWorkflowLearningPathSections(msg?: UiChatMessage | null) {
  return messageWorkflowLearningPathSections(msg).length > 0
}

function shouldRenderWorkflowResourceCards(msg?: UiChatMessage | null) {
  if (!canRenderWorkflowMessageContent(msg)) return false
  return workflowResourceCardGroups(msg?.agentWorkflow).length > 0
}

function workflowSupplementalResourceCardGroups(workflow?: AgentWorkflow | null) {
  const sections = workflowLearningPathSections(workflow)
  const used = new Set<string>()
  for (const section of sections) {
    for (const item of Array.isArray(section.items) ? section.items : []) {
      const key = [
        String((item as any).page_url || item.url || item.title || '').trim().toLowerCase(),
        String((item as any).learning_stage || '').trim().toLowerCase(),
        String((item as any).resource_group_type || '').trim().toLowerCase(),
      ].join('@@')
      if (key) used.add(key)
    }
  }
  const extras = workflowAllResourceVideos(workflow).filter((video) => {
    const key = [
      String((video as any).page_url || video.url || video.title || '').trim().toLowerCase(),
      String((video as any).learning_stage || '').trim().toLowerCase(),
      String((video as any).resource_group_type || '').trim().toLowerCase(),
    ].join('@@')
    return key && !used.has(key)
  })
  const grouped = {
    playlists: extras.filter((video) => String((video as any).resource_group_type || '').trim() === 'playlist'),
    single_videos: extras.filter((video) => String((video as any).resource_group_type || '').trim() === 'single_video'),
    courses: extras.filter((video) => String((video as any).resource_group_type || '').trim() === 'course'),
  }
  return [
    { label: '补充视频合集', items: grouped.playlists.slice(0, 4) },
    { label: '补充单视频', items: grouped.single_videos.slice(0, 6) },
    { label: '补充课程专题', items: grouped.courses.slice(0, 4) },
  ].filter((row) => row.items.length)
}

function workflowResourceCardGroups(workflow?: AgentWorkflow | null) {
  const grouped = workflow?.resource_recommendations || {}
  const toVideos = (rows: unknown[]) => {
    const out: TopicSelectedVideo[] = []
    const seen = new Set<string>()
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const v = workflowResourceToVideo(row as Record<string, any>)
      if (!v) continue
      const key = [
        String((v as any).page_url || v.url || v.title || '').trim().toLowerCase(),
        String((v as any).learning_stage || '').trim().toLowerCase(),
      ].join('@@')
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(v)
    }
    return out
  }
  return [
    { label: '推荐视频合集', items: toVideos(Array.isArray((grouped as any).playlists) ? (grouped as any).playlists : []).slice(0, 4) },
    { label: '推荐单视频', items: toVideos(Array.isArray((grouped as any).single_videos) ? (grouped as any).single_videos : []).slice(0, 6) },
    { label: '推荐课程专题', items: toVideos(Array.isArray((grouped as any).courses) ? (grouped as any).courses : []).slice(0, 4) },
  ].filter((row) => row.items.length)
}

function workflowDecisionText(workflow?: AgentWorkflow | null) {
  const d = workflow?.master_decision || {}
  return String(d.reason || d.decision || '').trim()
}

function workflowCurrentStage(workflow?: AgentWorkflow | null) {
  return workflowIdentifierLabel(workflow?.master_plan?.current_stage) || ''
}

function workflowAllTasks(workflow?: AgentWorkflow | null) {
  return Array.isArray(workflow?.task_graph) ? workflow!.task_graph! : []
}

function workflowAllTraces(workflow?: AgentWorkflow | null) {
  return Array.isArray(workflow?.execution_trace) ? workflow!.execution_trace! : []
}

function workflowAllErrors(workflow?: AgentWorkflow | null) {
  return Array.isArray(workflow?.error_handling) ? workflow!.error_handling! : []
}

function workflowReplayCacheKey(scope: string, stateKey: string) {
  return `${String(scope || '').trim()}:${String(stateKey || '').trim()}`
}

function workflowReplayRecord(scope: string, stateKey: string) {
  return workflowReplayRecords.value[workflowReplayCacheKey(scope, stateKey)] || null
}

function workflowReplayOpen(scope: string, stateKey: string) {
  return Boolean(workflowReplayOpenState.value[workflowReplayCacheKey(scope, stateKey)])
}

function workflowReplayLoading(scope: string, stateKey: string) {
  return Boolean(workflowReplayLoadingState.value[workflowReplayCacheKey(scope, stateKey)])
}

function workflowReplayArtifactsPreview(record?: AgentWorkflowStateItem | null) {
  const artifacts = (record?.artifacts || {}) as Record<string, any>
  const rows: Array<{ label: string; value: string }> = []
  const searchQuerySeed = String(artifacts?.search_query_seed || '').trim()
  if (searchQuerySeed) rows.push({ label: '检索种子', value: searchQuerySeed })
  const dispatchCount = Number(artifacts?.dispatch_result_count || 0)
  if (dispatchCount > 0) rows.push({ label: '结果数', value: String(dispatchCount) })
  const progressEvents = Array.isArray(artifacts?.progress_events) ? artifacts.progress_events.length : 0
  if (progressEvents > 0) rows.push({ label: '进度事件', value: String(progressEvents) })
  const learningPath = artifacts?.learning_path as Record<string, any> | undefined
  if (learningPath && Array.isArray(learningPath?.stages) && learningPath.stages.length) {
    rows.push({ label: '学习阶段', value: String(learningPath.stages.length) })
  }
  const assistantPreview = String(artifacts?.assistant_text_preview || '').trim()
  if (assistantPreview) rows.push({ label: '答复预览', value: assistantPreview })
  return rows
}

async function ensureWorkflowReplay(scope: 'chat' | 'job', stateKey: string) {
  const normalizedScope = String(scope || '').trim() as 'chat' | 'job'
  const normalizedKey = String(stateKey || '').trim()
  if (!normalizedScope || !normalizedKey) return null
  const cacheKey = workflowReplayCacheKey(normalizedScope, normalizedKey)
  if (workflowReplayRecords.value[cacheKey]) return workflowReplayRecords.value[cacheKey]
  workflowReplayLoadingState.value = { ...workflowReplayLoadingState.value, [cacheKey]: true }
  try {
    const res = await getAgentWorkflowStateApi(normalizedScope, normalizedKey)
    const item = (res?.item || null) as AgentWorkflowStateItem | null
    workflowReplayRecords.value = { ...workflowReplayRecords.value, [cacheKey]: item }
    return item
  } finally {
    workflowReplayLoadingState.value = { ...workflowReplayLoadingState.value, [cacheKey]: false }
  }
}

async function toggleMessageWorkflowReplay(msg: UiChatMessage) {
  const stateKey = String(msg.agentWorkflowStateKey || '').trim()
  if (!stateKey) return
  const cacheKey = workflowReplayCacheKey('chat', stateKey)
  const nextOpen = !workflowReplayOpenState.value[cacheKey]
  workflowReplayOpenState.value = { ...workflowReplayOpenState.value, [cacheKey]: nextOpen }
  if (!nextOpen) return
  try {
    await ensureWorkflowReplay('chat', stateKey)
  } catch (e: any) {
    workflowReplayOpenState.value = { ...workflowReplayOpenState.value, [cacheKey]: false }
    message.error(e?.message || '加载任务链回放失败')
  }
}

async function toggleCurrentJobWorkflowReplay() {
  const stateKey = String(jobsStore.currentJobId || '').trim()
  if (!stateKey) return
  const cacheKey = workflowReplayCacheKey('job', stateKey)
  const nextOpen = !workflowReplayOpenState.value[cacheKey]
  workflowReplayOpenState.value = { ...workflowReplayOpenState.value, [cacheKey]: nextOpen }
  if (!nextOpen) return
  try {
    await ensureWorkflowReplay('job', stateKey)
  } catch (e: any) {
    workflowReplayOpenState.value = { ...workflowReplayOpenState.value, [cacheKey]: false }
    message.error(e?.message || '加载任务链回放失败')
  }
}

function setSidebarLogViewMode(mode: 'normal' | 'detail') {
  if (mode === 'detail' && !isAdminUser.value) {
    sidebarLogViewMode.value = 'normal'
    return
  }
  sidebarLogViewMode.value = mode
}

function formatAdminDetailLogMessage(row: any) {
  const type = String(row?.type || '').trim().toLowerCase()
  const rawMessage = String(row?.raw_message || '').trim()
  const message = String(row?.message || '').trim()
  const publicMessage = String(row?.public_message || '').trim()
  const text = rawMessage || message || publicMessage
  if (text) return text
  if (type === 'status') {
    const stage = String(row?.stage || '').trim()
    const detail = String(row?.detail || '').trim()
    return [stage, detail].filter(Boolean).join(' · ') || '状态更新'
  }
  return type ? `[${type}]` : '日志事件'
}

async function refreshSidebarDetailedLogs() {
  const jobId = String(jobsStore.currentJobId || '').trim()
  if (!jobId || !isSidebarDetailMode.value) {
    sidebarDetailedLogs.value = []
    return
  }
  sidebarDetailedLogsLoading.value = true
  try {
    const res = await getAdminJobPushLogsApi(jobId, { limit: 500, includeNonLog: true })
    const items = Array.isArray((res as any)?.items) ? ((res as any).items as any[]) : []
    sidebarDetailedLogs.value = items
      .map((row) => ({
        ts: String((row as any)?.ts || ''),
        message: formatAdminDetailLogMessage(row),
      }))
      .filter((x) => String(x.message || '').trim())
      .slice(-240)
  } catch (e: any) {
    sidebarDetailedLogs.value = []
    message.error(e?.message || '加载详细日志失败')
  } finally {
    sidebarDetailedLogsLoading.value = false
  }
}

onMounted(async () => {
  globalStore.setBreadcrumbBarVisible(false)
  syncUserSignatureFromAuth()
  if (typeof window !== 'undefined') {
    const uaPlatform = String((navigator as any)?.userAgentData?.platform || navigator.platform || navigator.userAgent || '').toLowerCase()
    isMacLikePlatform.value = /mac|iphone|ipad|ipod/.test(uaPlatform)
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CHAT_MODEL_STORAGE_KEY)
    if (cached) selectedModel.value = cached
  }

  await Promise.allSettled([bootstrapCurrentJob(), loadChatModels(), chatStore.refreshSessions().catch(() => undefined)])
  handleNewChatRouteSignal(String(route.query.newChat || ''))
  void loadSessionFromRoute(String(route.query.session || ''))
  startSearchTaskPolling()
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', handleGlobalPointerDown)
    window.addEventListener('scroll', closeQuoteContextMenu, true)
    window.addEventListener('keydown', handleGlobalKeydown)
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleDocumentVisibilityChange)
  }
})

onUnmounted(() => {
  stopSearchTaskPolling()
  closeQuoteContextMenu()
  if (typeof window !== 'undefined' && messagesScrollFrame !== null) {
    window.cancelAnimationFrame(messagesScrollFrame)
    messagesScrollFrame = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointerdown', handleGlobalPointerDown)
    window.removeEventListener('scroll', closeQuoteContextMenu, true)
    window.removeEventListener('keydown', handleGlobalKeydown)
    window.removeEventListener('focus', handleWindowFocus)
    document.removeEventListener('visibilitychange', handleDocumentVisibilityChange)
  }
  for (const img of composerImages.value) {
    revokeComposerImagePreview(img.previewUrl)
  }
})

function revokeComposerImagePreview(url?: string) {
  const target = String(url || '').trim()
  if (!target || !target.startsWith('blob:') || typeof window === 'undefined') return
  try {
    window.URL.revokeObjectURL(target)
  } catch {
    // ignore
  }
}

function isMessagesNearBottom(el?: HTMLElement | null, threshold = 48) {
  const node = el || messagesContainerRef.value
  if (!node) return true
  return node.scrollHeight - node.scrollTop - node.clientHeight <= threshold
}

function queueMessagesScrollToBottom(force = false) {
  if (!force && !autoFollowMessages.value) return
  if (typeof window === 'undefined') return
  if (messagesScrollFrame !== null) return
  messagesScrollFrame = window.requestAnimationFrame(() => {
    messagesScrollFrame = null
    const el = messagesContainerRef.value
    if (!el) return
    if (!force && !autoFollowMessages.value) return
    el.scrollTop = el.scrollHeight
  })
}

function beginAssistantReplyAutoFollow() {
  assistantReplyStreaming.value = true
  autoFollowMessages.value = true
  queueMessagesScrollToBottom(true)
}

function endAssistantReplyAutoFollow() {
  assistantReplyStreaming.value = false
  autoFollowMessages.value = false
}

function handleMessagesScroll() {
  if (!assistantReplyStreaming.value) return
  autoFollowMessages.value = isMessagesNearBottom()
}

function makeComposerImageLocalId() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeClientRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function cacheSessionMessages(sessionUuid: string, items: UiChatMessage[]) {
  const sid = String(sessionUuid || '').trim()
  if (!sid) return
  sessionMessageCache.value = {
    ...sessionMessageCache.value,
    [sid]: items,
  }
}

function summarizeQuote(text: string) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= 160) return clean
  return `${clean.slice(0, 160)}...`
}

function closeQuoteContextMenu() {
  quoteContextMenu.value.visible = false
}

function openQuoteContextMenu(event: MouseEvent, content: string, label: string) {
  const clean = String(content || '').trim()
  if (!clean) return
  const menuWidth = 168
  const menuHeight = 48
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0
  const maxX = viewportWidth > 0 ? Math.max(12, viewportWidth - menuWidth - 12) : event.clientX
  const maxY = viewportHeight > 0 ? Math.max(12, viewportHeight - menuHeight - 12) : event.clientY
  quoteContextMenu.value = {
    visible: true,
    x: Math.min(Math.max(12, event.clientX), maxX),
    y: Math.min(Math.max(12, event.clientY), maxY),
    content: clean,
    label: String(label || '').trim() || '知识整合文档',
  }
}

function handleGlobalPointerDown(event: PointerEvent) {
  if (!quoteContextMenu.value.visible) return
  const target = event.target as Node | null
  if (target && quoteContextMenuRef.value?.contains(target)) return
  closeQuoteContextMenu()
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  closeQuoteContextMenu()
  closeImagePreview()
  closeCandidateFullscreen()
}

function openImagePreview(url: string, label = '') {
  const target = String(url || '').trim()
  if (!target) return
  imagePreview.value = {
    visible: true,
    url: target,
    label: String(label || '').trim(),
  }
}

function closeImagePreview() {
  imagePreview.value.visible = false
}

function closeCandidateFullscreen() {
  candidateFullscreenPreview.value = {
    visible: false,
    title: '',
    playableUrl: '',
    embedUrl: '',
    pageUrl: '',
  }
}

function clearComposerQuote() {
  composerQuote.value = null
}

function patchComposerImage(localId: string, patch: Partial<UiComposerImage>) {
  composerImages.value = composerImages.value.map((img) => (
    img.localId === localId ? { ...img, ...patch } : img
  ))
}

async function removeComposerImage(index: number) {
  const current = composerImages.value[index]
  if (!current) return
  const isUploaded = current.uploadStatus === 'uploaded' && String(current.object_name || '').trim()
  if (isUploaded) {
    try {
      await deleteChatImageApi(String(current.bucket || ''), String(current.object_name || ''))
    } catch (e: any) {
      message.error(e?.message || '删除图片失败')
      return
    }
  }
  const next = [...composerImages.value]
  const [removed] = next.splice(index, 1)
  revokeComposerImagePreview(removed?.previewUrl)
  composerImages.value = next
}

function openComposerImagePicker() {
  composerImageInputRef.value?.click()
}

async function uploadComposerFiles(files: File[]) {
  const imageFiles = files.filter((file) => String(file.type || '').startsWith('image/'))
  if (!imageFiles.length) return
  const pendingItems: UiComposerImage[] = imageFiles.map((file) => ({
    localId: makeComposerImageLocalId(),
    url: '',
    file_name: file.name,
    mime_type: file.type,
    size: file.size,
    bucket: '',
    object_name: '',
    previewUrl: typeof window !== 'undefined' ? window.URL.createObjectURL(file) : '',
    uploadStatus: 'uploading',
    uploadProgress: 0,
    errorMessage: '',
    sourceFile: file,
  }))
  composerImages.value = [...composerImages.value, ...pendingItems]
  await Promise.allSettled(pendingItems.map((img) => retryComposerImage(img.localId || '')))
}

async function retryComposerImage(localId: string) {
  const target = composerImages.value.find((img) => img.localId === localId)
  const file = target?.sourceFile
  if (!target || !(file instanceof File)) return
  patchComposerImage(localId, {
    uploadStatus: 'uploading',
    uploadProgress: 0,
    errorMessage: '',
  })
  try {
    const res = await uploadChatImageApi(file, {
      onProgress: (percent) => {
        patchComposerImage(localId, { uploadProgress: percent })
      },
    })
    patchComposerImage(localId, {
      ...(res.image || {}),
      uploadStatus: 'uploaded',
      uploadProgress: 100,
      errorMessage: '',
      sourceFile: null,
    })
  } catch (e: any) {
    const errText = String(e?.message || '上传图片失败')
    patchComposerImage(localId, {
      uploadStatus: 'failed',
      errorMessage: errText,
    })
    message.error(errText)
  }
}

async function handleComposerFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement | null
  const files = Array.from(target?.files || [])
  if (target) target.value = ''
  await uploadComposerFiles(files)
}

async function handleComposerPaste(event: ClipboardEvent) {
  const items = Array.from(event.clipboardData?.items || [])
  const files = items
    .filter((item) => item.kind === 'file' && String(item.type || '').startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file instanceof File)
  if (!files.length) return
  event.preventDefault()
  await uploadComposerFiles(files)
}

function handleMessageContextMenu(event: MouseEvent, msg: UiChatMessage) {
  if (msg.role !== 'assistant' || !msg.renderAsMarkdown) return
  openQuoteContextMenu(event, String(msg.content || ''), msg.markdownLabel || '知识整合文档')
}

function quoteMarkdownIntoComposer(content: string, label: string) {
  const clean = String(content || '').trim()
  if (!clean) return
  composerQuote.value = {
    label: String(label || '').trim() || '知识整合文档',
    content: clean,
  }
  nextTick(() => {
    composerInputRef.value?.focus?.()
  })
  message.success('已引用到输入区，可继续补充要求')
}

function handleRailMarkdownContextMenu(event: MouseEvent) {
  openQuoteContextMenu(event, currentNoteText.value, currentNoteLink.value?.file_name || 'Markdown 结果')
}

function applyContextQuote() {
  const payload = quoteContextMenu.value
  closeQuoteContextMenu()
  quoteMarkdownIntoComposer(payload.content, payload.label)
}

function sanitizeEvidenceTagText(v: string) {
  return String(v || '')
}

function sanitizeFirstStreamChunk(v: string) {
  return String(v || '')
}

function looksLikeMarkdownContent(v: string) {
  const s = String(v || '').trim()
  if (!s) return false
  if (/(^|\n)\s*#{2,6}\s+\S/m.test(s)) return true
  if (/(^|\n)\s*[-*]\s+\S/m.test(s)) return true
  if (/(^|\n)\s*\d+\.\s+\S/m.test(s)) return true
  if (/\[[^\]]+\]\(https?:\/\/[^\s)]+\)/.test(s)) return true
  if (/(^|\n)\s*>\s+\S/m.test(s)) return true
  if (/```[\s\S]*```/.test(s)) return true
  return false
}

function syncUserSignatureFromAuth() {
  const user = authStore.user
  if (!user) return
  userStore.userName = user.display_name || user.username || userStore.userName
  const role = String(user.role || 'tryuser')
  if (role === 'admin') {
    userStore.personalizedSignature = '管理员'
    return
  }
  if (role === 'user') {
    userStore.personalizedSignature = '正式用户'
    return
  }
  const remain = Number(user.chat_quota_remaining ?? 0)
  userStore.personalizedSignature = remain < 0 ? '试用用户（不限次数）' : `试用用户（剩余 ${remain} 次）`
}

function applyChatQuota(meta: any) {
  const user = authStore.user
  if (!user) return
  const quota = meta?.chat_quota
  if (!quota || typeof quota !== 'object') return
  const total = Number((quota as any).chat_quota_total)
  const used = Number((quota as any).chat_quota_used)
  const remaining = Number((quota as any).chat_quota_remaining)
  authStore.user = {
    ...user,
    chat_quota_total: Number.isFinite(total) ? total : user.chat_quota_total,
    chat_quota_used: Number.isFinite(used) ? used : user.chat_quota_used,
    chat_quota_remaining: Number.isFinite(remaining) ? remaining : user.chat_quota_remaining,
  }
  syncUserSignatureFromAuth()
}

function isHttpUrl(v: string) {
  return /^https?:\/\/\S+$/i.test(String(v || '').trim())
}

function isRetryNotice(v: string) {
  const s = String(v || '').trim()
  return s.includes('网络超时重试中')
}

function extractFirstUrl(text: string) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  const m = raw.match(/https?:\/\/[^\s)"'<>]+/i)
  return String(m?.[0] || '').replace(/[),.;!?]+$/g, '')
}

function pickUrlFromLogRow(row: any) {
  if (row && typeof row === 'object') {
    const direct = extractFirstUrl(String((row as any)?.url || ''))
    if (direct) return direct
    const fromExtra = extractFirstUrl(String((row as any)?.extra?.url || ''))
    if (fromExtra) return fromExtra
    const fromMsg = extractFirstUrl(String((row as any)?.message || ''))
    if (fromMsg) return fromMsg
    const fromResult = extractFirstUrl(String((row as any)?.result?.url || ''))
    if (fromResult) return fromResult
    const msgText = String((row as any)?.message || '').trim()
    if (isRetryNotice(msgText)) return msgText
    const detailText = String((row as any)?.detail || '').trim()
    if (isRetryNotice(detailText)) return detailText
    return ''
  }
  const raw = String(row || '')
  const asUrl = extractFirstUrl(raw)
  if (asUrl) return asUrl
  if (isRetryNotice(raw)) return raw.trim()
  return ''
}

async function refreshActiveSearchTaskLogs() {
  if (!knowledgeRetrievalEnabled.value) {
    activeSearchTaskLogs.value = []
    searchTaskPollFailureCount = 0
    searchTaskPollPausedUntil = 0
    return
  }
  if (searchTaskPollPausedUntil > Date.now()) {
    return
  }
  try {
    const res = await listActiveSearchTasksApi(80)
    const items = Array.isArray(res.items) ? res.items : []
    const logs: Array<{ ts?: string; message: string }> = []
    for (const item of items) {
      const taskLogs = Array.isArray((item as any)?.logs) ? ((item as any)?.logs as any[]) : []
      for (const row of taskLogs.slice(-20)) {
        const ts = String((row as any)?.ts || '')
        const message = pickUrlFromLogRow(row)
        if (!message) continue
        logs.push({ ts, message })
      }
    }
    activeSearchTaskLogs.value = logs.slice(-240)
    searchTaskPollFailureCount = 0
    searchTaskPollPausedUntil = 0
  } catch (e: any) {
    searchTaskPollFailureCount += 1
    if (searchTaskPollFailureCount >= SEARCH_TASK_POLL_MAX_FAILURES) {
      searchTaskPollPausedUntil = Date.now() + SEARCH_TASK_POLL_PAUSE_MS
      searchTaskPollFailureCount = 0
      const ts = new Date().toISOString()
      const reason = String(e?.message || '服务暂不可用')
      const line = `搜索任务日志轮询已暂停 60 秒（${reason}）`
      activeSearchTaskLogs.value = [...activeSearchTaskLogs.value, { ts, message: line }].slice(-240)
    }
  }
}

function startSearchTaskPolling() {
  stopSearchTaskPolling()
  searchTaskPollFailureCount = 0
  searchTaskPollPausedUntil = 0
  void refreshActiveSearchTaskLogs()
  if (typeof window === 'undefined') return
  searchTaskPollTimer = window.setInterval(() => {
    void refreshActiveSearchTaskLogs()
  }, SEARCH_TASK_POLL_INTERVAL_MS)
}

function stopSearchTaskPolling() {
  if (searchTaskPollTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(searchTaskPollTimer)
  }
  searchTaskPollTimer = null
}

function assistantProgressLine(msg: UiChatMessage) {
  const focus = String(msg.searchFocusLine || '').trim()
  if (focus) return focus
  const logs = Array.isArray(msg.searchProgressLogs) ? msg.searchProgressLogs : []
  const tail = logs.length ? String(logs[logs.length - 1]?.message || '').trim() : ''
  return tail
}

function toggleTaskRail() {
  if (!hasTaskRailContent.value) return
  taskRailOpen.value = !taskRailOpen.value
}

function toggleKnowledgeRetrieval() {
  const next = !knowledgeRetrievalEnabled.value
  knowledgeRetrievalEnabled.value = next
  if (next) {
    retrievalModeNetwork.value = true
    retrievalModeBili.value = false
    retrievalModeDouyin.value = false
  }
}

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
  knowledgeRetrievalEnabled,
  () => {
    void refreshActiveSearchTaskLogs()
  },
  { immediate: true },
)

watch(
  () => [isAdminUser.value, sidebarLogViewMode.value, jobsStore.currentJobId] as const,
  async ([isAdmin, mode, jobId]) => {
    if (!isAdmin && mode !== 'normal') {
      sidebarLogViewMode.value = 'normal'
      sidebarDetailedLogs.value = []
      return
    }
    if (mode === 'detail' && jobId) {
      await refreshSidebarDetailedLogs()
      return
    }
    sidebarDetailedLogs.value = []
  },
  { immediate: true },
)

// Auto-scroll task log panel to bottom on new log entries
watch(
  () => currentSidebarLogs.value.length,
  async () => {
    await nextTick()
    const el = sidebarLogRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
)

watch(
  () => [jobsStore.currentJobId, currentSnapshot.value?.status] as const,
  async ([jobId, status]) => {
    if (!jobId || status !== 'completed') return
    await loadCurrentJobNoteAssets({ silent: true })
  },
)

watch(
  () => currentRailWorkflow.value,
  (workflow) => {
    maybeAutoOpenTaskRail(workflow)
  },
  { immediate: true },
)

function isActiveJobStatus(status: string) {
  const s = String(status || '').trim()
  return s === 'running' || s === 'queued' || s === 'waiting_user_pick'
}

async function syncCurrentJobRuntime(options: { forceReconnect?: boolean; silent?: boolean } = {}) {
  const jobId = String(jobsStore.currentJobId || '').trim()
  if (!jobId) return
  const forceReconnect = Boolean(options.forceReconnect)
  const silent = options.silent !== false
  try {
    const snap = await jobsStore.fetchJob(jobId)
    const st = String(snap?.status || '')
    if (isActiveJobStatus(st)) {
      jobsStore.connectJobEvents(jobId, forceReconnect || currentJobState.value?.sseStatus !== 'connected')
    } else if (st === 'completed') {
      await loadCurrentJobNoteAssets({ silent: true })
    } else if (currentJobState.value?.sseStatus === 'connected' || currentJobState.value?.sseStatus === 'connecting') {
      jobsStore.disconnectJobEvents(jobId, false)
    }
  } catch (e: any) {
    if (!silent) {
      message.error(e?.message || '同步任务状态失败')
    }
  }
}

function scheduleResumeSync(forceReconnect = true) {
  const now = Date.now()
  if (now - lastResumeSyncAt < 1200) return
  lastResumeSyncAt = now
  void syncCurrentJobRuntime({ forceReconnect, silent: true })
}

function resumeSearchTaskPollingNow() {
  if (!knowledgeRetrievalEnabled.value) return
  searchTaskPollFailureCount = 0
  searchTaskPollPausedUntil = 0
  void refreshActiveSearchTaskLogs()
}

function handleWindowFocus() {
  scheduleResumeSync(true)
  resumeSearchTaskPollingNow()
}

function handleDocumentVisibilityChange() {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'visible') {
    scheduleResumeSync(true)
    resumeSearchTaskPollingNow()
  }
}

async function bootstrapCurrentJob() {
  if (!jobsStore.currentJobId) return
  await syncCurrentJobRuntime({ forceReconnect: true, silent: true })
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
  retrievalModeNetwork.value = true
  retrievalModeBili.value = false
  retrievalModeDouyin.value = false
  taskRailOpen.value = false
  taskRailAutoOpened.value = false
  activeSearchTaskLogs.value = []
  videoPreviewState.value = {}
  closeCandidateFullscreen()
  candidateSelectionState.value = {}
  batchSelectingJobs.value = {}
  candidatePageState.value = {}
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
  if (!sessionUuid) {
    resetCurrentTaskState()
    chatStore.clearCurrentSession()
    chatSessionUuid.value = ''
    messages.value = []
    loadingSessionMessages.value = false
    candidatePageState.value = {}
    taskRailOpen.value = false
    taskRailAutoOpened.value = false
    return
  }
  if (route.query.newChat) return
  if (skipNextRouteSessionHydrateUuid.value && skipNextRouteSessionHydrateUuid.value === sessionUuid) {
    skipNextRouteSessionHydrateUuid.value = ''
    return
  }
  if (chatSessionUuid.value === sessionUuid && messages.value.length > 0) {
    await syncCurrentJobRuntime({ forceReconnect: true, silent: true })
    return
  }
  try {
    const cachedMessages = sessionMessageCache.value[sessionUuid]
    if (Array.isArray(cachedMessages) && cachedMessages.some((m) => Boolean(m.pending || m.streaming))) {
      const previousJobId = String(jobsStore.currentJobId || '').trim()
      if (previousJobId) jobsStore.disconnectJobEvents(previousJobId, false)
      jobsStore.currentJobId = ''
      chatStore.setCurrentSession(sessionUuid)
      chatSessionUuid.value = sessionUuid
      messages.value = cachedMessages
      candidatePageState.value = {}
      taskRailOpen.value = false
      taskRailAutoOpened.value = false
      maybeAutoOpenTaskRail(latestChatAgentWorkflow.value)
      await syncCurrentJobRuntime({ forceReconnect: true, silent: true })
      return
    }
    const previousJobId = String(jobsStore.currentJobId || '').trim()
    if (previousJobId) jobsStore.disconnectJobEvents(previousJobId, false)
    jobsStore.currentJobId = ''
    loadingSessionMessages.value = true
    messages.value = []
    candidatePageState.value = {}
    taskRailOpen.value = false
    taskRailAutoOpened.value = false
    chatStore.setCurrentSession(sessionUuid)
    chatSessionUuid.value = sessionUuid
    const res = await listChatMessagesApi(sessionUuid, 100)
    const loaded = (res.items || []).map((m) => ({
      localId: `srv-${m.id || Math.random().toString(36).slice(2, 8)}`,
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: (String(m.role || '') === 'assistant') ? sanitizeEvidenceTagText(String(m.content || '')) : String(m.content || ''),
      images: Array.isArray(m.meta?.images) ? (m.meta?.images as UiComposerImage[]) : [],
      quote: (m.meta?.quote as ChatQuoteReference | null) ?? null,
      pending: false,
      task: (m.meta?.task as JobCreateResponse | null) ?? null,
      taskSnapshot: ((m.meta as any)?.task_snapshot as Record<string, any> | null) ?? null,
      toolDecisionReason: String(m.meta?.tool_decision?.reason || '').trim() || undefined,
      autoTask: Boolean(m.meta?.auto_task),
      knowledgeLookupUsed: Boolean(m.meta?.knowledge_lookup?.used),
      knowledgeLookupReason: String(m.meta?.knowledge_lookup?.reason || '').trim() || undefined,
      knowledgeHits: Array.isArray(m.meta?.knowledge_hits) ? (m.meta?.knowledge_hits as Array<Record<string, any>>) : [],
      renderAsMarkdown: String(m.role || '') === 'assistant',
      markdownLabel: String((m.meta as any)?.job_note?.file_name || '').trim()
        ? `Markdown 结果 · ${String((m.meta as any)?.job_note?.file_name || '').trim()}`
        : (String(m.meta?.message_kind || '') === 'job_markdown')
          ? 'Markdown 结果'
          : undefined,
      jobNoteJobId: String((m.meta as any)?.job_note?.job_id || '').trim() || undefined,
      searchProgressLogs: Array.isArray((m.meta as any)?.search_dispatch?.logs)
        ? (((m.meta as any)?.search_dispatch?.logs as Array<any>)
            .map((x) => ({
              ts: String(x?.ts || ''),
              message: pickUrlFromLogRow(x),
            }))
            .filter((x) => isHttpUrl(x.message)))
        : [],
      searchFocusLine: String(((m.meta as any)?.search_dispatch?.focus_line || '')).trim() || undefined,
      searchProgressVisible: false,
      streaming: false,
      preferMarkdown: false,
      agentWorkflowStateKey: String((m.meta as any)?.agent_workflow_state_key || '').trim() || undefined,
      agentWorkflow: ((m.meta as any)?.agent_workflow as AgentWorkflow | null) ?? null,
    }))
    messages.value = loaded
    cacheSessionMessages(sessionUuid, loaded)
    maybeAutoOpenTaskRail(latestChatAgentWorkflow.value)

    const taskJobIds = loaded
      .filter((m) => m.role === 'assistant' && m.task?.job_id)
      .map((m) => String(m.task?.job_id || '').trim())
      .filter(Boolean)
    const latestTaskJobId = taskJobIds[taskJobIds.length - 1] || ''
    const shouldShowKnowledgeMode = loaded.some((m) => m.autoTask || m.task)
    knowledgeRetrievalEnabled.value = shouldShowKnowledgeMode
    const latestAssistantWithModes = [...(res.items || [])]
      .reverse()
      .find((m) => String(m?.role || '') === 'assistant' && Array.isArray((m?.meta as any)?.search_modes))
    if (latestAssistantWithModes && Array.isArray((latestAssistantWithModes.meta as any)?.search_modes)) {
      const modes = ((latestAssistantWithModes.meta as any)?.search_modes as string[]).map((x) => String(x || '').toLowerCase())
      retrievalModeNetwork.value = modes.includes('network')
      retrievalModeBili.value = modes.includes('bili')
      retrievalModeDouyin.value = modes.includes('douyin')
    }

    if (latestTaskJobId) {
      chatStore.bindJobToSession(latestTaskJobId, sessionUuid)
      jobsStore.setCurrentJob(latestTaskJobId)
      // Fetch all task jobs concurrently so per-message candidate cards are restored
      const olderJobIds = taskJobIds.slice(0, -1)
      void Promise.allSettled(olderJobIds.map((jid) => jobsStore.fetchJob(jid)))
      try {
        await syncCurrentJobRuntime({ forceReconnect: true, silent: true })
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
    images: Array.isArray(payload.images) ? payload.images : [],
    quote: payload.quote ?? null,
    pending: payload.pending,
    task: payload.task ?? null,
    taskSnapshot: payload.taskSnapshot ?? null,
    toolDecisionReason: payload.toolDecisionReason,
    autoTask: payload.autoTask,
    knowledgeLookupUsed: payload.knowledgeLookupUsed,
    knowledgeLookupReason: payload.knowledgeLookupReason,
    knowledgeHits: Array.isArray(payload.knowledgeHits) ? payload.knowledgeHits : [],
    renderAsMarkdown: payload.role === 'assistant' ? true : payload.renderAsMarkdown,
    markdownLabel: payload.markdownLabel,
    jobNoteJobId: payload.jobNoteJobId,
    searchProgressLogs: Array.isArray(payload.searchProgressLogs) ? payload.searchProgressLogs : [],
    searchFocusLine: String(payload.searchFocusLine || '').trim() || undefined,
    searchProgressVisible: Boolean(payload.searchProgressVisible),
    streaming: Boolean(payload.streaming),
    preferMarkdown: Boolean(payload.preferMarkdown),
    agentWorkflowStateKey: String(payload.agentWorkflowStateKey || '').trim() || undefined,
    agentWorkflow: payload.agentWorkflow ?? null,
  }
  messages.value.push(item)
  cacheSessionMessages(chatSessionUuid.value, messages.value)
  const last = messages.value[messages.value.length - 1]
  return (last || item) as UiChatMessage
}

function mapAssistantMessage(msg: ChatMessage, task: JobCreateResponse | null, toolDecision?: { reason?: string }) {
  const jobNoteJobId = String((msg?.meta as any)?.job_note?.job_id || '').trim() || undefined
  const jobNoteFileName = String((msg?.meta as any)?.job_note?.file_name || '').trim()
  const effectiveTask = task ?? (msg?.meta?.task as JobCreateResponse | null) ?? null
  const fallbackText = effectiveTask?.job_id
    ? `已创建任务（${effectiveTask.job_id}），我会继续检索并实时同步进度。`
    : '抱歉，这次回复异常中断，请重试一次。'
  return appendUiMessage({
    role: 'assistant',
    content: sanitizeEvidenceTagText(String(msg?.content || fallbackText)),
    images: Array.isArray(msg?.meta?.images) ? (msg.meta.images as UiComposerImage[]) : [],
    quote: (msg?.meta?.quote as ChatQuoteReference | null) ?? null,
    task: effectiveTask,
    taskSnapshot: ((msg?.meta as any)?.task_snapshot as Record<string, any> | null) ?? null,
    toolDecisionReason:
      String(toolDecision?.reason || msg?.meta?.tool_decision?.reason || '').trim() || undefined,
    autoTask: Boolean(msg?.meta?.auto_task),
    knowledgeLookupUsed: Boolean(msg?.meta?.knowledge_lookup?.used),
    knowledgeLookupReason: String(msg?.meta?.knowledge_lookup?.reason || '').trim() || undefined,
    knowledgeHits: Array.isArray(msg?.meta?.knowledge_hits) ? (msg?.meta?.knowledge_hits as Array<Record<string, any>>) : [],
    renderAsMarkdown: true,
    markdownLabel: jobNoteFileName ? `Markdown 结果 · ${jobNoteFileName}` : undefined,
    jobNoteJobId,
    searchProgressLogs: Array.isArray((msg?.meta as any)?.search_dispatch?.logs)
      ? (((msg?.meta as any)?.search_dispatch?.logs as Array<any>)
          .map((x) => ({
            ts: String(x?.ts || ''),
            message: pickUrlFromLogRow(x),
          }))
          .filter((x) => isHttpUrl(x.message)))
      : [],
    searchFocusLine: String(((msg?.meta as any)?.search_dispatch?.focus_line || '')).trim() || undefined,
    searchProgressVisible: false,
    streaming: false,
    preferMarkdown: false,
    agentWorkflowStateKey: String((msg?.meta as any)?.agent_workflow_state_key || '').trim() || undefined,
    agentWorkflow: ((msg?.meta as any)?.agent_workflow as AgentWorkflow | null) ?? null,
  })
}

async function stopCurrentReply() {
  const sessionUuid = String(chatSessionUuid.value || '').trim()
  const clientRequestId = String(activeChatRequestId.value || '').trim()
  if (!sending.value || !sessionUuid || !clientRequestId || stoppingReply.value) return
  stoppingReply.value = true
  try {
    await stopChatMessageStreamApi(sessionUuid, { client_request_id: clientRequestId })
  } catch (e: any) {
    message.error(e?.message || '停止回复失败')
  } finally {
    stoppingReply.value = false
  }
}

function buildPendingAssistantPlaceholder(autoTask: boolean, searchModes: string[]) {
  if (!autoTask) return '我正在整理回复，请稍候。'
  const modes = (searchModes || []).map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
  const hasBili = modes.includes('bili')
  const hasNetwork = modes.includes('network')
  const hasDouyin = modes.includes('douyin')
  if (hasBili && !hasNetwork && !hasDouyin) {
    return '我正在为你规划学习路径，并检索 B 站相关视频，请稍候。'
  }
  if (hasNetwork && !hasBili && !hasDouyin) {
    return '我正在联网检索并整理相关内容，请稍候。'
  }
  if (hasDouyin && !hasBili && !hasNetwork) {
    return '我正在检索抖音相关内容并整理结果，请稍候。'
  }
  return '我正在规划任务并检索相关资源，请稍候。'
}

function buildPendingSearchFocus(autoTask: boolean, searchModes: string[]) {
  if (!autoTask) return undefined
  const modes = (searchModes || []).map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
  const hasBili = modes.includes('bili')
  const hasNetwork = modes.includes('network')
  const hasDouyin = modes.includes('douyin')
  if (hasBili && !hasNetwork && !hasDouyin) return 'B站检索中：正在规划学习路径'
  if (hasNetwork && !hasBili && !hasDouyin) return '联网检索中：正在规划任务'
  if (hasDouyin && !hasBili && !hasNetwork) return '抖音检索中：正在规划任务'
  return '多源检索中：正在规划任务'
}

async function sendMessage() {
  const text = userInput.value.trim()
  const quote = composerQuote.value ? { ...composerQuote.value } : null
  const images = composerImages.value
    .filter((img) => img.uploadStatus !== 'failed' && img.uploadStatus !== 'uploading' && String(img.url || '').trim())
    .map((img) => ({ ...img }))
  const hasRichContext = Boolean(images.length || quote?.content)
  if (!text && !images.length && !quote?.content) {
    message.warning('请输入内容或上传图片')
    return
  }
  if (sending.value) return
  if (uploadingComposerImages.value) {
    message.warning('图片仍在上传中，请稍后发送')
    return
  }
  if (hasFailedComposerImages.value) {
    message.warning('有图片上传失败，请重试或移除后再发送')
    return
  }
  appendUiMessage({ role: 'user', content: text, images, quote })
  userInput.value = ''
  composerQuote.value = null
  composerImages.value = []
  const clientRequestId = makeClientRequestId()
  const effectiveAutoTask = knowledgeRetrievalEnabled.value && !hasRichContext
  const effectiveSearchModes = effectiveAutoTask ? selectedSearchModes.value : []
  const initialAssistantPlaceholder = buildPendingAssistantPlaceholder(effectiveAutoTask, effectiveSearchModes)
  const initialSearchFocus = buildPendingSearchFocus(effectiveAutoTask, effectiveSearchModes)
  const pendingAssistant = appendUiMessage({
    role: 'assistant',
    content: initialAssistantPlaceholder,
    pending: true,
    streaming: true,
    searchProgressVisible: Boolean(initialSearchFocus),
    searchFocusLine: initialSearchFocus,
    renderAsMarkdown: true,
    preferMarkdown: true,
  })
  beginAssistantReplyAutoFollow()
  sending.value = true
  activeChatRequestId.value = clientRequestId
  let shouldRevokeSentImages = false

  try {
    const sessionUuid = await ensureChatSession()
    cacheSessionMessages(sessionUuid, messages.value)
    let taskInfo: JobCreateResponse | null = null
    let toolDecisionReason = ''
    let shouldCreateJob = false
    let taskHandled = false
    let gotAnyDelta = false
    let savedAssistantContent = ''
    let typewriterBuffer = ''
    let typewriterTimer: number | null = null
    let finalDoneText = ''
    let streamStarted = false
    let shouldHideSearchProgress = false
    let backendSearchDispatchEnabled = false

    const TYPEWRITER_INTERVAL_MS = 22

    const typewriterBatchSize = () => {
      const len = typewriterBuffer.length
      if (len > 240) return 10
      if (len > 120) return 6
      if (len > 40) return 4
      return 2
    }

    const applySearchFocus = (raw: any) => {
      const line = String(raw?.line || '').trim()
      if (!line) return
      pendingAssistant.searchFocusLine = line
      pendingAssistant.searchProgressVisible = true
    }

    const appendSearchTaskLog = (raw: any) => {
      const ts = String(raw?.ts || new Date().toISOString())
      const msg = pickUrlFromLogRow(raw)
      if (!msg || (!isHttpUrl(msg) && !isRetryNotice(msg))) return
      const line = msg
      activeSearchTaskLogs.value = [...activeSearchTaskLogs.value, { ts, message: line }].slice(-240)
      const logs = Array.isArray(pendingAssistant.searchProgressLogs) ? [...pendingAssistant.searchProgressLogs] : []
      logs.push({ ts, message: line })
      pendingAssistant.searchProgressLogs = logs.slice(-80)
      pendingAssistant.searchProgressVisible = true
    }

    const stopTypewriter = () => {
      if (typewriterTimer !== null && typeof window !== 'undefined') {
        window.clearInterval(typewriterTimer)
      }
      typewriterTimer = null
    }

    const typewriterTick = () => {
      if (!typewriterBuffer.length) {
        stopTypewriter()
        return
      }
      const batchSize = typewriterBatchSize()
      const chunk = typewriterBuffer.slice(0, batchSize)
      typewriterBuffer = typewriterBuffer.slice(batchSize)
      if (chunk) {
        pendingAssistant.pending = false
        pendingAssistant.streaming = true
        pendingAssistant.content = `${pendingAssistant.content || ''}${chunk}`
        pendingAssistant.content = sanitizeEvidenceTagText(pendingAssistant.content)
        queueMessagesScrollToBottom()
      }
      if (!typewriterBuffer.length && finalDoneText && !String(pendingAssistant.content || '').trim()) {
        pendingAssistant.content = finalDoneText
      }
    }

    const enqueueTypewriter = (textChunk: string) => {
      let chunk = sanitizeEvidenceTagText(String(textChunk || ''))
      if (!streamStarted) chunk = sanitizeFirstStreamChunk(chunk)
      if (!chunk) return
      if (!streamStarted && String(pendingAssistant.content || '').trim() === initialAssistantPlaceholder.trim()) {
        pendingAssistant.content = ''
      }
      streamStarted = true
      typewriterBuffer += chunk
      if (typewriterTimer === null && typeof window !== 'undefined') {
        typewriterTimer = window.setInterval(typewriterTick, TYPEWRITER_INTERVAL_MS)
      }
    }

    await sendChatMessageStreamApi(
      sessionUuid,
      {
        content: text,
        client_request_id: clientRequestId,
        images: images.map(({ previewUrl, uploadStatus, uploadProgress, errorMessage, sourceFile, localId, ...img }) => img),
        quote: quote?.content ? quote : null,
        model_name: selectedModel.value || '',
        auto_task: effectiveAutoTask,
        search_modes: effectiveSearchModes,
        ...(globalStore.chatTaskParams || {}),
        pipeline_model_name: selectedModel.value || '',
      },
      {
        onMeta: (meta) => {
          applyChatQuota(meta)
          taskInfo = (meta?.task as JobCreateResponse | null) || null
          shouldCreateJob = Boolean(meta?.tool_decision?.should_create_job)
          toolDecisionReason = String(meta?.tool_decision?.reason || '').trim()
          pendingAssistant.knowledgeLookupUsed = Boolean(meta?.knowledge_lookup?.used)
          pendingAssistant.knowledgeLookupReason = String(meta?.knowledge_lookup?.reason || '').trim() || undefined
          pendingAssistant.knowledgeHits = Array.isArray(meta?.knowledge_hits)
            ? (meta.knowledge_hits as Array<Record<string, any>>)
            : []
          pendingAssistant.taskSnapshot = ((meta?.task_snapshot as Record<string, any>) || pendingAssistant.taskSnapshot || null)
          pendingAssistant.agentWorkflowStateKey =
            String((meta as any)?.agent_workflow_state_key || '').trim() || pendingAssistant.agentWorkflowStateKey
          pendingAssistant.agentWorkflow = ((meta?.agent_workflow as AgentWorkflow | null) || pendingAssistant.agentWorkflow || null)
          maybeAutoOpenTaskRail(pendingAssistant.agentWorkflow)
          if (Array.isArray(meta?.search_modes)) {
            const modes = (meta.search_modes as string[]).map((x) => String(x || '').toLowerCase())
            retrievalModeNetwork.value = modes.includes('network')
            retrievalModeBili.value = modes.includes('bili')
            retrievalModeDouyin.value = modes.includes('douyin')
          }
          backendSearchDispatchEnabled = Boolean((meta as any)?.search_dispatch?.enabled)
          if (backendSearchDispatchEnabled) {
            pendingAssistant.preferMarkdown = true
            pendingAssistant.markdownLabel = pendingAssistant.markdownLabel || '知识整合文档'
            if (!String(pendingAssistant.content || '').trim()) {
              pendingAssistant.content = initialAssistantPlaceholder
            }
            pendingAssistant.searchFocusLine = pendingAssistant.searchFocusLine || '浏览中：准备检索网页'
            pendingAssistant.searchProgressVisible = true
          } else {
            pendingAssistant.searchProgressVisible = false
            pendingAssistant.searchFocusLine = undefined
          }
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
          pendingAssistant.pending = true
          pendingAssistant.streaming = true
          if (!String(pendingAssistant.content || '').trim()) {
            pendingAssistant.content = initialAssistantPlaceholder
          }
          beginAssistantReplyAutoFollow()
        },
        onDelta: (deltaText) => {
          gotAnyDelta = gotAnyDelta || !!deltaText
          pendingAssistant.pending = false
          enqueueTypewriter(String(deltaText || ''))
        },
        onDone: (doneData) => {
          pendingAssistant.pending = false
          finalDoneText = sanitizeEvidenceTagText(String(doneData?.text || ''))
          if (backendSearchDispatchEnabled) {
            pendingAssistant.searchFocusLine = pendingAssistant.searchFocusLine || '总结中：已完成'
            shouldHideSearchProgress = true
          }
          if (finalDoneText) {
            // 终态文本到达时，直接以 done.text 为准，避免 residual delta 再次追加导致整段重复。
            typewriterBuffer = ''
            stopTypewriter()
            pendingAssistant.content = finalDoneText
          }
        },
        onSaved: (savedData) => {
          const msg = (savedData?.assistant_message || null) as ChatMessage | null
          savedAssistantContent = sanitizeEvidenceTagText(String(msg?.content || ''))
          if (savedAssistantContent.trim()) {
            pendingAssistant.content = savedAssistantContent
            pendingAssistant.pending = false
          }
          applyChatQuota(msg?.meta || {})
          const messageKind = String(msg?.meta?.message_kind || '')
          pendingAssistant.renderAsMarkdown = true
          pendingAssistant.preferMarkdown = true
          if (Boolean(msg?.meta?.render_markdown) || ['job_markdown', 'search_markdown'].includes(messageKind)) {
            if (!pendingAssistant.markdownLabel && messageKind === 'search_markdown') {
              pendingAssistant.markdownLabel = '知识整合文档'
            }
          }
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
          if ((msg?.meta as any)?.task_snapshot) {
            pendingAssistant.taskSnapshot = (msg?.meta as any).task_snapshot as Record<string, any>
          }
          pendingAssistant.agentWorkflowStateKey =
            String((msg?.meta as any)?.agent_workflow_state_key || '').trim() || pendingAssistant.agentWorkflowStateKey
          pendingAssistant.knowledgeLookupUsed = Boolean(msg?.meta?.knowledge_lookup?.used) || pendingAssistant.knowledgeLookupUsed
          pendingAssistant.knowledgeLookupReason =
            String(msg?.meta?.knowledge_lookup?.reason || '').trim() || pendingAssistant.knowledgeLookupReason
          if (Array.isArray(msg?.meta?.knowledge_hits)) {
            pendingAssistant.knowledgeHits = msg.meta.knowledge_hits as Array<Record<string, any>>
          }
          if ((msg?.meta as any)?.agent_workflow) {
            pendingAssistant.agentWorkflow = (msg?.meta as any).agent_workflow as AgentWorkflow
            maybeAutoOpenTaskRail(pendingAssistant.agentWorkflow)
          }
        },
        onAgentUpdate: (data) => {
          const workflow = (data?.workflow || null) as AgentWorkflow | null
          if (workflow) {
            pendingAssistant.agentWorkflow = workflow
            maybeAutoOpenTaskRail(workflow)
          }
        },
        onSearchLog: (data) => {
          appendSearchTaskLog(data || {})
        },
        onSearchStatus: (data) => {
          const d = data || {}
          appendSearchTaskLog(d)
        },
        onSearchFocus: (data) => {
          applySearchFocus(data || {})
        },
        onSearchResult: (data) => {
          const d = data || {}
          appendSearchTaskLog(d)
          const result = (d as any)?.result || {}
          const mode = String((result as any)?.mode || '').trim().toLowerCase()
          if (mode === 'network') {
            const sources = Array.isArray((result as any)?.sources) ? ((result as any)?.sources as any[]) : []
            for (const row of sources) appendSearchTaskLog(row || {})
          } else if (mode === 'bili') {
            const cands = Array.isArray((result as any)?.candidates) ? ((result as any)?.candidates as any[]) : []
            for (const row of cands) appendSearchTaskLog(row || {})
          } else if (mode === 'douyin') {
            const cands = Array.isArray((result as any)?.candidates) ? ((result as any)?.candidates as any[]) : []
            for (const row of cands) appendSearchTaskLog(row || {})
          }
        },
      },
    )

    pendingAssistant.pending = false
    pendingAssistant.streaming = false
    endAssistantReplyAutoFollow()
    pendingAssistant.toolDecisionReason = toolDecisionReason || pendingAssistant.toolDecisionReason
    if (typewriterTimer !== null) {
      while (typewriterBuffer.length) typewriterTick()
      stopTypewriter()
    }
    pendingAssistant.content = sanitizeEvidenceTagText(pendingAssistant.content || '')
    if (pendingAssistant.preferMarkdown || pendingAssistant.role === 'assistant') {
      pendingAssistant.renderAsMarkdown = true
    }
    if (shouldHideSearchProgress) {
      pendingAssistant.searchProgressVisible = false
      pendingAssistant.searchFocusLine = undefined
    }

    if (!String(pendingAssistant.content || '').trim()) {
      const pendingTaskJobId = String((pendingAssistant.task as any)?.job_id || '').trim()
      if (String(savedAssistantContent || '').trim()) {
        pendingAssistant.content = sanitizeEvidenceTagText(savedAssistantContent)
      } else if (pendingTaskJobId) {
        pendingAssistant.content = `已创建任务（${pendingTaskJobId}），我会继续检索并实时同步进度。`
      } else {
        try {
          const latest = await listChatMessagesApi(sessionUuid, 20)
          const items = Array.isArray(latest?.items) ? latest.items : []
          const lastAssistant = [...items].reverse().find((x) => String(x?.role || '') === 'assistant')
          const recovered = sanitizeEvidenceTagText(String(lastAssistant?.content || ''))
          if (recovered.trim()) {
            pendingAssistant.content = recovered
            const lk = String((lastAssistant?.meta as any)?.message_kind || '')
            if (String(lastAssistant?.role || '') === 'assistant') {
              pendingAssistant.renderAsMarkdown = true
            }
            if (Boolean(lastAssistant?.meta?.render_markdown) || ['job_markdown', 'search_markdown'].includes(lk)) {
              if (!pendingAssistant.markdownLabel && lk === 'search_markdown') {
                pendingAssistant.markdownLabel = '知识整合文档'
              }
            }
            if (lastAssistant?.meta?.tool_decision?.reason && !pendingAssistant.toolDecisionReason) {
              pendingAssistant.toolDecisionReason = String(lastAssistant.meta.tool_decision.reason || '').trim() || undefined
            }
            pendingAssistant.knowledgeLookupUsed = Boolean(lastAssistant?.meta?.knowledge_lookup?.used) || pendingAssistant.knowledgeLookupUsed
            pendingAssistant.knowledgeLookupReason =
              String(lastAssistant?.meta?.knowledge_lookup?.reason || '').trim() || pendingAssistant.knowledgeLookupReason
            if (Array.isArray(lastAssistant?.meta?.knowledge_hits)) {
              pendingAssistant.knowledgeHits = lastAssistant.meta.knowledge_hits as Array<Record<string, any>>
            }
            if ((lastAssistant?.meta as any)?.task_snapshot) {
              pendingAssistant.taskSnapshot = (lastAssistant?.meta as any)?.task_snapshot as Record<string, any>
            }
            pendingAssistant.agentWorkflowStateKey =
              String((lastAssistant?.meta as any)?.agent_workflow_state_key || '').trim() || pendingAssistant.agentWorkflowStateKey
            if ((lastAssistant?.meta as any)?.agent_workflow) {
              pendingAssistant.agentWorkflow = (lastAssistant?.meta as any)?.agent_workflow as AgentWorkflow
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
    shouldRevokeSentImages = true
    void authStore.fetchMe().then(() => {
      syncUserSignatureFromAuth()
    }).catch(() => undefined)
    void chatStore.refreshSessions().catch(() => undefined)
  } catch (e: any) {
    if (!composerQuote.value && quote?.content) composerQuote.value = quote
    if (!composerImages.value.length && images.length) composerImages.value = images
    pendingAssistant.pending = false
    pendingAssistant.streaming = false
    pendingAssistant.searchProgressVisible = false
      pendingAssistant.content = `发送失败：${e?.message || '未知错误'}`
    endAssistantReplyAutoFollow()
    const errText = String(e?.message || '')
    if (/额度|quota|chat_quota|次数/.test(errText)) {
      void authStore.fetchMe().then(() => {
        syncUserSignatureFromAuth()
      }).catch(() => undefined)
    }
    message.error(e?.message || '发送失败')
  } finally {
    endAssistantReplyAutoFollow()
    if (shouldRevokeSentImages) {
      for (const img of images) revokeComposerImagePreview(img.previewUrl)
    }
    sending.value = false
    activeChatRequestId.value = ''
    cacheSessionMessages(chatSessionUuid.value, messages.value)
  }
}

async function refreshCurrentJob() {
  if (!jobsStore.currentJobId) return
  try {
    await jobsStore.fetchJob(jobsStore.currentJobId)
    if (isSidebarDetailMode.value) {
      await refreshSidebarDetailedLogs()
    }
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
  if (Array.isArray(items)) return items as TopicSelectedVideo[]
  const fallback = taskSnapshotByJob.value[jobId]?.selected_videos
  return Array.isArray(fallback) ? (fallback as TopicSelectedVideo[]) : []
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
  if (kind === 'topic') return true
  const fallbackKind = String(taskSnapshotByJob.value[jobId]?.kind || '')
  return fallbackKind === 'topic'
}

function isJobTerminal(jobId: string) {
  const s = String(jobsStore.jobs[jobId]?.snapshot?.status || '')
  return s === 'completed' || s === 'failed'
}

function shouldRenderCandidatePanel(msg: UiChatMessage) {
  const jobId = String(msg?.task?.job_id || '').trim()
  if (!jobId) return false
  if (firstTaskMessageLocalIdByJob.value[jobId] !== msg.localId) return false
  if (isJobTerminal(jobId) && !jobVideoCandidates(jobId).length) return false
  return true
}

function candidatePageSize() {
  return 12
}

function candidateTotalPages(jobId: string) {
  const total = jobVideoCandidates(jobId).length
  return Math.max(1, Math.ceil(total / candidatePageSize()))
}

function candidateCurrentPage(jobId: string) {
  const totalPages = candidateTotalPages(jobId)
  const current = Math.max(1, Number(candidatePageState.value[jobId] || 1))
  if (current > totalPages) {
    candidatePageState.value[jobId] = totalPages
    return totalPages
  }
  return current
}

function setCandidatePage(jobId: string, page: number) {
  const totalPages = candidateTotalPages(jobId)
  const nextPage = Math.max(1, Math.min(totalPages, Number(page || 1)))
  candidatePageState.value = { ...candidatePageState.value, [jobId]: nextPage }
}

function pagedJobVideoCandidates(jobId: string) {
  const all = jobVideoCandidates(jobId)
  const page = candidateCurrentPage(jobId)
  const size = candidatePageSize()
  const start = (page - 1) * size
  return all.slice(start, start + size)
}

function videoPreviewKey(video: TopicSelectedVideo) {
  const { pageUrl, rawUrl } = candidateVideoUrls(video)
  return String(pageUrl || rawUrl || video.title || '').trim()
}

function activeVideoPreviewKey(jobId: string) {
  return String(videoPreviewState.value[jobId] || '')
}

function candidateVideoUrls(video: TopicSelectedVideo) {
  const rawUrl = String(video.url || '').trim()
  let pageUrl = String((video as any).page_url || (video as any).canonical_url || (video as any).share_url || '').trim()
  let playUrl = String((video as any).play_url || '').trim()
  if (rawUrl.includes('|||')) {
    const parts = rawUrl.split('|||', 2)
    if (!pageUrl) pageUrl = String(parts[0] || '').trim()
    if (!playUrl) playUrl = String(parts[1] || '').trim()
  } else {
    if (!pageUrl && /^https?:\/\//i.test(rawUrl)) pageUrl = rawUrl
    if (!playUrl && /^https?:\/\/.+\.(mp4|m3u8)(\?|$)/i.test(rawUrl)) playUrl = rawUrl
  }
  return { rawUrl, pageUrl, playUrl }
}

function isDouyinCandidate(video: TopicSelectedVideo) {
  const platform = String((video as any).platform || '').trim().toLowerCase()
  if (platform === 'douyin') return true
  const { pageUrl, rawUrl } = candidateVideoUrls(video)
  const probe = `${pageUrl} ${rawUrl}`.toLowerCase()
  return probe.includes('douyin.com') || probe.includes('v.douyin.com') || probe.includes('iesdouyin.com')
}

function extractBvid(text: string) {
  const m = String(text || '').match(/BV[0-9A-Za-z]{10}/)
  return m ? m[0] : ''
}

function videoPlayableUrl(video: TopicSelectedVideo) {
  if (!isDouyinCandidate(video)) return ''
  const { playUrl, pageUrl } = candidateVideoUrls(video)
  if (!/^https?:\/\//i.test(playUrl)) return ''
  // 抖音 CDN 直链需经后端代理才能播放（浏览器直接请求会 403）
  const token = String(getAuthToken() || '').trim()
  const qs = new URLSearchParams({ url: playUrl })
  if (pageUrl) qs.set('page_url', pageUrl)
  const awemeId = String((video as any).aweme_id || '').trim()
  if (awemeId) qs.set('aweme_id', awemeId)
  if (token) qs.set('token', token)
  return buildApiUrl(`/douyin/proxy-video?${qs.toString()}`)
}

function videoEmbedUrl(video: TopicSelectedVideo) {
  if (isDouyinCandidate(video)) return ''
  const bvid = extractBvid(String(video.url || '')) || extractBvid(String(video.title || ''))
  if (!bvid) return ''
  return `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&page=1`
}

function canPreviewCandidate(video: TopicSelectedVideo) {
  return Boolean(videoPlayableUrl(video) || videoEmbedUrl(video))
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

function handleCandidateCoverClick(jobId: string, video: TopicSelectedVideo) {
  if (canPreviewCandidate(video)) {
    toggleVideoPreview(jobId, video)
    return
  }
  openVideoUrl(video)
}

function openCandidateFullscreen(video: TopicSelectedVideo) {
  const playableUrl = videoPlayableUrl(video)
  const embedUrl = videoEmbedUrl(video)
  if (!playableUrl && !embedUrl) {
    openVideoUrl(video)
    return
  }
  const { pageUrl, rawUrl } = candidateVideoUrls(video)
  candidateFullscreenPreview.value = {
    visible: true,
    title: String(video.title || '').trim(),
    playableUrl,
    embedUrl,
    pageUrl: String(pageUrl || rawUrl || '').trim(),
  }
}

function openCandidateFullscreenSource() {
  const url = String(candidateFullscreenPreview.value.pageUrl || '').trim()
  if (!url) return
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
}

function openVideoUrl(video: TopicSelectedVideo) {
  const { pageUrl, rawUrl } = candidateVideoUrls(video)
  const url = String(pageUrl || rawUrl || '').trim()
  if (!url) return
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
}

function canOpenVideoUrl(video: TopicSelectedVideo) {
  const { pageUrl, rawUrl } = candidateVideoUrls(video)
  const url = String(pageUrl || rawUrl || '').trim()
  return /^https?:\/\//i.test(url)
}

function knowledgeHitKey(hit: Record<string, any>, idx: number) {
  return String(hit.id || hit.source_url || hit.video_url || hit.title || idx)
}

function openKnowledgeHitSource(hit: Record<string, any>) {
  const url = String(hit.source_url || hit.video_url || '').trim()
  if (!url) return
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
}

function knowledgeHitDisplayTitle(hit: Record<string, any>) {
  const title = String(hit.title || '').trim()
  // 如果标题是纯统计数字字符串，用 UP主+笔记类型 作为展示标题
  if (!title || looksLikeStatsOnlyTitle(title)) {
    const up = String(hit.up_name || '').trim()
    const dur = String(hit.duration_text || '').trim()
    if (up) return dur ? `${up} · ${dur}` : up
    return hit.doc_type === 'video' ? '视频笔记' : '主题笔记'
  }
  return title
}

function downloadKnowledgeNote(hit: Record<string, any>) {
  const notePath = String(hit.note_md_path || '').trim()
  if (!notePath) return
  const url = `/knowledge/note/download?path=${encodeURIComponent(notePath)}`
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
  // 用关键词兜底，最后用序号
  const keyword = String((video as any).from_keyword || '').trim()
  return keyword ? `${keyword} · 视频 ${idx + 1}` : `视频 ${idx + 1}`
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

function workflowResourceSelectKey(video: TopicSelectedVideo) {
  return `workflow::${videoPreviewKey(video) || String(video.url || video.title || '')}`
}

function isSelectingWorkflowResource(video: TopicSelectedVideo) {
  return Boolean(selectingVideoState.value[workflowResourceSelectKey(video)])
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
      jobsStore.setCurrentJob(task.job_id)
      knowledgeRetrievalEnabled.value = true
      try {
        await jobsStore.fetchJob(task.job_id)
      } catch {
        // ignore
      }
      jobsStore.connectJobEvents(task.job_id)
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

async function summarizeWorkflowResource(video: TopicSelectedVideo) {
  const sessionUuid = String(chatSessionUuid.value || '').trim()
  const { pageUrl, rawUrl } = candidateVideoUrls(video)
  const url = String(pageUrl || rawUrl || '').trim()
  if (!sessionUuid) {
    message.warning('当前会话不存在，无法创建总结任务')
    return
  }
  if (!url) {
    message.warning('该视频缺少可用链接')
    return
  }
  const key = workflowResourceSelectKey(video)
  if (selectingVideoState.value[key]) return
  selectingVideoState.value = { ...selectingVideoState.value, [key]: true }
  try {
    const task = await jobsStore.createJob({
      user_input: url,
      pipeline_model_name: selectedModel.value || '',
    })
    chatStore.bindJobToSession(task.job_id, sessionUuid)
    jobsStore.setCurrentJob(task.job_id)
    knowledgeRetrievalEnabled.value = true
    appendUiMessage({
      role: 'assistant',
      content: `已开始总结视频：${String(video.title || url)}。`,
      task,
      autoTask: true,
    })
    try {
      await jobsStore.fetchJob(task.job_id)
    } catch {
      // ignore
    }
    jobsStore.connectJobEvents(task.job_id)
    await nextTick()
    const el = messagesContainerRef.value
    if (el) el.scrollTop = el.scrollHeight
    message.success('已创建总结任务，完成后会把笔记同步回当前对话')
  } catch (e: any) {
    message.error(e?.message || '创建总结任务失败')
  } finally {
    const nextState = { ...selectingVideoState.value }
    delete nextState[key]
    selectingVideoState.value = nextState
  }
}

function clearInput() {
  userInput.value = ''
  composerQuote.value = null
  for (const img of composerImages.value) {
    revokeComposerImagePreview(img.previewUrl)
  }
  composerImages.value = []
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
  if (s === 'extract_audio_url') return '正在准备音频素材'
  if (s === 'download_audio') return '正在准备音频素材'
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
  const low = t.toLowerCase()
  if (/^run:/i.test(t)) return '正在执行处理步骤'
  if (/开始下载|下载视频中|下载音频|下载视频|download/i.test(t)) return '正在准备媒体素材'
  if (/视频下载完成|音频下载完成/i.test(t)) return '媒体素材准备完成'
  if (/(\/app\/|\.m4s\b|\.mp3\b|\.mp4\b|\.wav\b|\.jpg\b|\.png\b)/i.test(t)) return '正在处理媒体素材'
  if (/https?:\/\//i.test(t) || low.includes('链接')) return '正在处理媒体资源信息'
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

.composer-quote {
  border: 1px solid rgba(191, 219, 254, 0.9);
  background: rgba(239, 246, 255, 0.92);
  border-radius: 16px;
  padding: 9px 12px;
}

.composer-quote__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #1d4ed8;
}

.composer-quote__remove {
  border: 0;
  background: transparent;
  color: rgba(29, 78, 216, 0.82);
  cursor: pointer;
}

.quote-context-menu {
  position: fixed;
  z-index: 1200;
  min-width: 168px;
  border-radius: 14px;
  border: 1px solid rgba(203, 213, 225, 0.92);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  padding: 6px;
}

.quote-context-menu__item {
  width: 100%;
  border: 0;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  padding: 9px 10px;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.quote-context-menu__item:hover {
  background: rgba(239, 246, 255, 0.96);
  color: #1d4ed8;
}

.image-preview-layer {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(15, 23, 42, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}

.image-preview-layer__body {
  max-width: min(92vw, 1200px);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.image-preview-layer__img {
  display: block;
  max-width: 100%;
  max-height: calc(92vh - 64px);
  border-radius: 18px;
  object-fit: contain;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
  background: rgba(255, 255, 255, 0.04);
}

.image-preview-layer__caption {
  max-width: min(92vw, 900px);
  text-align: center;
  font-size: 12px;
  color: rgba(241, 245, 249, 0.88);
  word-break: break-word;
}

.image-preview-layer__close {
  position: absolute;
  top: 16px;
  right: 18px;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 34px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.video-preview-layer {
  position: fixed;
  inset: 0;
  z-index: 1350;
  background: rgba(2, 6, 23, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}

.video-preview-layer__body {
  width: min(94vw, 1440px);
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.video-preview-layer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: rgba(248, 250, 252, 0.96);
}

.video-preview-layer__title {
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.video-preview-layer__link {
  flex: none;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 999px;
  padding: 8px 14px;
  background: rgba(15, 23, 42, 0.72);
  color: rgba(248, 250, 252, 0.96);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.video-preview-layer__player {
  width: 100%;
  height: min(78vh, 980px);
  border: 0;
  border-radius: 20px;
  background: #000;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
}

.video-preview-layer__close {
  position: absolute;
  top: 16px;
  right: 18px;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 34px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.composer-image-chip {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, 0.82);
  background: rgba(255, 255, 255, 0.92);
}

.composer-image-chip__button {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.composer-image-chip__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.composer-image-chip__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.38);
  backdrop-filter: blur(1.5px);
}

.composer-image-chip__overlay--error {
  background: rgba(15, 23, 42, 0.48);
}

.composer-image-chip__progress {
  --progress: 0%;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at center, rgba(15, 23, 42, 0.86) 58%, transparent 60%),
    conic-gradient(#ffffff var(--progress), rgba(255, 255, 255, 0.24) 0);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.composer-image-chip__retry {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;
}

.composer-image-chip__retry:hover {
  transform: translateY(-1px) rotate(-18deg);
  background: rgba(37, 99, 235, 0.92);
}

.composer-image-chip__remove {
  position: absolute;
  top: 4px;
  right: 6px;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
  padding: 0;
  font-size: 22px;
  line-height: 1;
  z-index: 3;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}

:global(.dark) .composer-shell {
  background: rgba(17, 24, 39, 0.55);
  border-color: rgba(148, 163, 184, 0.16);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}

:global(.dark) .composer-quote {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(30, 41, 59, 0.86);
}

:global(.dark) .composer-quote__head {
  color: rgba(147, 197, 253, 0.96);
}

:global(.dark) .composer-quote__remove {
  color: rgba(191, 219, 254, 0.88);
}

:global(.dark) .quote-context-menu {
  border-color: rgba(71, 85, 105, 0.68);
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.38);
}

:global(.dark) .quote-context-menu__item {
  color: rgba(241, 245, 249, 0.94);
}

:global(.dark) .quote-context-menu__item:hover {
  background: rgba(30, 41, 59, 0.92);
  color: #93c5fd;
}

:global(.dark) .image-preview-layer__close {
  color: rgba(248, 250, 252, 0.96);
}

:global(.dark) .video-preview-layer__close {
  color: rgba(248, 250, 252, 0.96);
}

:global(.dark) .video-preview-layer__link {
  border-color: rgba(148, 163, 184, 0.32);
  background: rgba(15, 23, 42, 0.82);
  color: rgba(241, 245, 249, 0.96);
}

:global(.dark) .composer-image-chip {
  border-color: rgba(75, 85, 99, 0.78);
  background: rgba(17, 24, 39, 0.8);
}

:global(.dark) .composer-image-chip__overlay {
  background: rgba(2, 6, 23, 0.48);
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

.search-mode-chip {
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 26px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #334155;
  transition: all 0.2s ease;
}

.search-mode-chip:hover:not(:disabled) {
  border-color: rgba(59, 130, 246, 0.45);
}

.search-mode-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.search-mode-chip--active {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  border-color: rgba(37, 99, 235, 0.45);
}

.rail-toggle-btn {
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 26px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #334155;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.rail-toggle-btn:hover {
  border-color: rgba(59, 130, 246, 0.45);
}

.rail-toggle-btn--active {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  border-color: rgba(37, 99, 235, 0.45);
}

.rail-toggle-btn__icon {
  transition: transform 0.2s ease;
}

.rail-toggle-btn__icon--open {
  transform: rotate(180deg);
}

.search-progress-panel {
  border: 1px solid rgba(203, 213, 225, 0.76);
  background: rgba(248, 250, 252, 0.9);
}

.search-focus-line {
  color: #6b7280;
}

:global(.dark) .search-mode-chip {
  background: rgba(31, 41, 55, 0.95);
  color: rgba(226, 232, 240, 0.92);
  border-color: rgba(148, 163, 184, 0.25);
}

:global(.dark) .search-mode-chip--active {
  background: rgba(59, 130, 246, 0.2);
  color: rgba(191, 219, 254, 0.98);
  border-color: rgba(96, 165, 250, 0.52);
}

:global(.dark) .rail-toggle-btn {
  background: rgba(31, 41, 55, 0.95);
  color: rgba(226, 232, 240, 0.92);
  border-color: rgba(148, 163, 184, 0.25);
}

:global(.dark) .rail-toggle-btn--active {
  background: rgba(59, 130, 246, 0.2);
  color: rgba(191, 219, 254, 0.98);
  border-color: rgba(96, 165, 250, 0.52);
}

:global(.dark) .search-progress-panel {
  border-color: rgba(75, 85, 99, 0.72);
  background: rgba(17, 24, 39, 0.52);
}

:global(.dark) .search-focus-line {
  color: #9ca3af;
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

.send-icon-btn--stopping {
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.36);
}

.send-icon-btn--stopping:hover:not(:disabled) {
  border-color: rgba(239, 68, 68, 0.52);
  box-shadow: 0 10px 24px rgba(127, 29, 29, 0.14);
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

:global(.dark) .send-icon-btn--stopping {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.38);
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
  min-width: 0;
}

.message-quote-chip {
  border-radius: 14px;
  border: 1px solid rgba(191, 219, 254, 0.95);
  background: rgba(239, 246, 255, 0.88);
  padding: 10px 12px;
}

.message-quote-chip__label {
  font-size: 11px;
  font-weight: 600;
  color: #1d4ed8;
}

.message-quote-chip__body {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.55;
  color: rgba(30, 41, 59, 0.82);
}

.message-image-thumb {
  width: 112px;
  height: 112px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(203, 213, 225, 0.82);
  background: rgba(241, 245, 249, 0.92);
  padding: 0;
  cursor: zoom-in;
}

.message-image-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.message-bubble--markdown {
  white-space: normal;
  overflow: hidden;
}

.message-bubble--markdown :deep(.md-content) {
  font-size: 0.88rem;
  line-height: 1.65;
}

.message-bubble--markdown :deep(.md-content h1) {
  font-size: 0.96rem;
  line-height: 1.5;
}

.message-bubble--markdown :deep(.md-content h2) {
  font-size: 0.92rem;
}

.message-bubble--markdown :deep(.md-content h3),
.message-bubble--markdown :deep(.md-content h4) {
  font-size: 0.88rem;
}

:global(.dark) .message-quote-chip {
  border-color: rgba(59, 130, 246, 0.34);
  background: rgba(30, 41, 59, 0.8);
}

:global(.dark) .message-quote-chip__label {
  color: rgba(147, 197, 253, 0.95);
}

:global(.dark) .message-quote-chip__body {
  color: rgba(226, 232, 240, 0.82);
}

:global(.dark) .message-image-thumb {
  border-color: rgba(75, 85, 99, 0.8);
  background: rgba(17, 24, 39, 0.82);
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

.message-pending {
  display: inline-flex;
  width: auto;
  max-width: max-content;
}

.thinking-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  flex-wrap: nowrap;
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

.message-assistant--stable {
  width: min(100%, 980px);
}

.message-plain-text {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
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

/* ── Knowledge Hit Panel ───────────────────────────────── */
.knowledge-hit-panel {
  background: #fff;
  border: 1px solid rgba(203, 213, 225, 0.76);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65), 0 6px 18px rgba(15, 23, 42, 0.05);
}

.knowledge-hit-panel__title {
  color: rgba(51, 65, 85, 0.82);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.knowledge-hit-panel__footer {
  color: rgba(71, 85, 105, 0.7);
}

.knowledge-hit-card {
  border: 1px solid rgba(203, 213, 225, 0.78);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.85) 100%);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.knowledge-hit-card__title {
  color: #0f172a;
}

.knowledge-hit-card__type {
  color: rgba(71, 85, 105, 0.7);
}

.knowledge-hit-card__meta {
  color: rgba(71, 85, 105, 0.95);
}

.knowledge-hit-card__snippet {
  color: rgba(51, 65, 85, 0.72);
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

.ai-candidate-cover {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
}

.ai-candidate-cover__trigger {
  display: block;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.ai-candidate-cover__actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-candidate-cover__action,
.ai-candidate-cover__fullscreen {
  border: 0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  line-height: 1;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
}

.ai-candidate-cover__fullscreen {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}

.ai-candidate-cover__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.4));
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}

.ai-candidate-cover:hover .ai-candidate-cover__overlay,
.ai-candidate-cover:focus-visible .ai-candidate-cover__overlay {
  opacity: 1;
}

.ai-candidate-cover__play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #f8fafc;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
}

.ai-candidate-card__reason {
  color: rgba(51, 65, 85, 0.84);
}

.ai-candidate-card__keyword {
  color: rgba(71, 85, 105, 0.7);
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

/* ── Knowledge Hit Panel dark ───────────────────────────── */
:global(.dark) .knowledge-hit-panel {
  background: rgba(31, 41, 55, 0.92);
  border: 1px solid rgba(75, 85, 99, 0.9);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.05), 0 8px 20px rgba(0, 0, 0, 0.24);
}

:global(.dark) .knowledge-hit-panel__title {
  color: rgba(226, 232, 240, 0.86);
}

:global(.dark) .knowledge-hit-panel__footer {
  color: rgba(148, 163, 184, 0.65);
}

:global(.dark) .knowledge-hit-card {
  border: 1px solid rgba(75, 85, 99, 0.72);
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.5) 0%, rgba(30, 41, 59, 0.5) 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

:global(.dark) .knowledge-hit-card__title {
  color: rgba(241, 245, 249, 0.97);
}

:global(.dark) .knowledge-hit-card__type {
  color: rgba(148, 163, 184, 0.75);
}

:global(.dark) .knowledge-hit-card__meta {
  color: rgba(203, 213, 225, 0.9);
}

:global(.dark) .knowledge-hit-card__snippet {
  color: rgba(148, 163, 184, 0.82);
}

:global(.dark) .ai-candidate-card {
  border: 1px solid rgba(75, 85, 99, 0.72);
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.5) 0%, rgba(30, 41, 59, 0.5) 100%);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.22);
}

:global(.dark) .ai-candidate-cover__overlay {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.56));
}

:global(.dark) .ai-candidate-cover__play {
  background: rgba(15, 23, 42, 0.84);
  color: rgba(241, 245, 249, 0.98);
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
