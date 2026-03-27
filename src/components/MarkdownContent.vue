<template>
  <div class="md-content" v-html="html"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
  source: string
}>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

const html = computed(() => {
  const src = String(props.source || '')
  if (!src.trim()) return ''
  return md.render(src)
})
</script>

<style scoped>
.md-content {
  color: inherit;
  line-height: 1.7;
  word-break: break-word;
}

.md-content :deep(*) {
  max-width: 100%;
}

.md-content :deep(h1),
.md-content :deep(h2),
.md-content :deep(h3),
.md-content :deep(h4) {
  margin: 0.8em 0 0.45em;
  line-height: 1.35;
  font-weight: 700;
}

.md-content :deep(h1) {
  font-size: 1.05rem;
}

.md-content :deep(h2) {
  font-size: 0.98rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  padding-bottom: 0.3em;
}

.md-content :deep(h3) {
  font-size: 0.92rem;
}

.md-content :deep(h4) {
  font-size: 0.88rem;
}

.md-content :deep(p),
.md-content :deep(ul),
.md-content :deep(ol),
.md-content :deep(blockquote),
.md-content :deep(pre),
.md-content :deep(table) {
  margin: 0.5em 0;
}

.md-content :deep(ul),
.md-content :deep(ol) {
  padding-left: 1.25rem;
}

.md-content :deep(li > p) {
  margin: 0.2em 0;
}

.md-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.86em;
  background: rgba(148, 163, 184, 0.16);
  border-radius: 6px;
  padding: 0.12em 0.35em;
}

.md-content :deep(pre) {
  overflow: auto;
  border-radius: 10px;
  padding: 0.8rem;
  background: rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.md-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.md-content :deep(blockquote) {
  margin-left: 0;
  padding: 0.55rem 0.8rem;
  border-left: 3px solid rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.05);
  border-radius: 0 10px 10px 0;
  color: rgba(51, 65, 85, 0.95);
}

.md-content :deep(table) {
  display: block;
  width: 100%;
  overflow: auto;
  border-collapse: collapse;
  border-radius: 10px;
}

.md-content :deep(th),
.md-content :deep(td) {
  border: 1px solid rgba(148, 163, 184, 0.26);
  padding: 0.45rem 0.6rem;
  text-align: left;
  vertical-align: top;
}

.md-content :deep(th) {
  background: rgba(148, 163, 184, 0.1);
  font-weight: 600;
}

.md-content :deep(hr) {
  border: 0;
  border-top: 1px solid rgba(148, 163, 184, 0.24);
  margin: 0.9rem 0;
}

.md-content :deep(a) {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.md-content :deep(a:hover) {
  text-decoration-thickness: 2px;
}

.md-content :deep(img) {
  display: block;
  max-width: min(100%, 760px);
  width: auto;
  height: auto;
  margin: 0.85rem auto;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(241, 245, 249, 0.88);
}

.md-content :deep(li a) {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.32);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 0.82rem;
  line-height: 1.3;
  text-decoration: none;
}

.md-content :deep(li a:hover) {
  background: rgba(37, 99, 235, 0.14);
  border-color: rgba(37, 99, 235, 0.48);
  text-decoration: none;
}

:global(.dark) .md-content :deep(code) {
  background: rgba(148, 163, 184, 0.14);
}

:global(.dark) .md-content :deep(pre) {
  background: rgba(15, 23, 42, 0.42);
  border-color: rgba(148, 163, 184, 0.16);
}

:global(.dark) .md-content :deep(blockquote) {
  background: rgba(59, 130, 246, 0.08);
  border-left-color: rgba(96, 165, 250, 0.4);
  color: rgba(226, 232, 240, 0.9);
}

:global(.dark) .md-content :deep(th),
:global(.dark) .md-content :deep(td) {
  border-color: rgba(148, 163, 184, 0.2);
}

:global(.dark) .md-content :deep(th) {
  background: rgba(148, 163, 184, 0.08);
}

:global(.dark) .md-content :deep(h2) {
  border-bottom-color: rgba(148, 163, 184, 0.18);
}

:global(.dark) .md-content :deep(hr) {
  border-top-color: rgba(148, 163, 184, 0.18);
}

:global(.dark) .md-content :deep(a) {
  color: #93c5fd;
}

:global(.dark) .md-content :deep(img) {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.42);
}

:global(.dark) .md-content :deep(li a) {
  color: #bfdbfe;
  border-color: rgba(96, 165, 250, 0.42);
  background: rgba(30, 64, 175, 0.28);
}

:global(.dark) .md-content :deep(li a:hover) {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(147, 197, 253, 0.58);
}
</style>
