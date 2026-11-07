(function (root) {
  "use strict";
  const ROW_HEIGHT = 64;
  const OVERSCAN = 3;

  class VirtualChat {
    constructor(viewport, { onPause, onInspect, pauseOnHover = true, unified = false, highlights = [] }) {
      this.viewport = viewport;
      this.onPause = onPause;
      this.onInspect = onInspect;
      this.pauseOnHover = pauseOnHover;
      this.unified = unified;
      this.highlights = VirtualChat.compileHighlights(highlights);
      this.buffer = new ChatFlow.RingBuffer(ChatFlow.HISTORY_LIMIT);
      this.reasons = new Set();
      this.rows = [];
      this.sequences = new Map();
      this.lastScrollTop = 0;
      this.pending = 0;
      this.frame = null;
      this.content = document.createElement("div");
      this.content.className = "virtual-content";
      viewport.append(this.content);
      this.events = new AbortController();
      const options = { signal: this.events.signal };
      viewport.addEventListener("wheel", () => { this.userScrolling = true; }, { ...options, passive: true });
      viewport.addEventListener("pointerdown", () => { this.userScrolling = true; }, options);
      viewport.addEventListener("keydown", (event) => {
        if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) this.userScrolling = true;
      }, options);
      viewport.addEventListener("scroll", () => {
        if (viewport.scrollTop === this.programmaticScrollTop && !this.userScrolling) return;
        const atBottom = typeof viewport.scrollTopMax === "number"
          ? viewport.scrollTop >= viewport.scrollTopMax
          : viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 0.5;
        if (this.userScrolling && !atBottom && viewport.scrollTop < this.lastScrollTop) this.setPaused("scroll", true);
        if (this.userScrolling && atBottom) this.setPaused("scroll", false);
        this.lastScrollTop = viewport.scrollTop;
        if (atBottom) this.userScrolling = false;
        this.schedule();
      }, options);
      viewport.addEventListener("mouseenter", () => {
        if (this.pauseOnHover && !this.ignoreHover) this.setPaused("hover", true);
      }, options);
      viewport.addEventListener("mouseleave", () => {
        this.ignoreHover = false;
        this.setPaused("hover", false);
      }, options);
      viewport.addEventListener("focusin", () => this.setPaused("focus", true), options);
      viewport.addEventListener("focusout", (event) => {
        if (!viewport.contains(event.relatedTarget)) this.setPaused("focus", false);
      }, options);
      viewport.addEventListener("click", (event) => this.inspect(event), options);
      viewport.addEventListener("keydown", (event) => {
        if (event.key === "Enter") this.inspect(event);
      }, options);
      this.observer = new ResizeObserver(() => this.schedule());
      this.observer.observe(viewport);
    }

    inspect(event) {
      const row = event.target.closest(".chat-row");
      if (row?.entry) this.onInspect(row.entry);
    }

    get paused() { return this.reasons.size > 0; }

    setPaused(reason, enabled) {
      const wasPaused = this.paused;
      if (enabled) this.reasons.add(reason);
      else this.reasons.delete(reason);
      if (!wasPaused && this.paused) {
        this.frozen = this.buffer.values();
        this.pending = 0;
      }
      if (wasPaused && !this.paused) {
        this.frozen = null;
        this.pending = 0;
        this.schedule();
      }
      this.onPause(this.paused, this.pending);
    }

    resume() {
      this.reasons.clear();
      this.frozen = null;
      this.pending = 0;
      this.userScrolling = false;
      this.ignoreHover = this.viewport.matches(":hover");
      this.onPause(false, 0);
      this.schedule();
    }

    configure(pauseOnHover, highlights = []) {
      this.pauseOnHover = pauseOnHover;
      this.highlights = VirtualChat.compileHighlights(highlights);
      if (!pauseOnHover) this.setPaused("hover", false);
      this.schedule();
    }

    replace(entries) {
      this.buffer.clear();
      this.sequences.clear();
      this.append(entries);
    }

    append(entries) {
      const accepted = [];
      const previousSequences = new Map(this.sequences);
      const seen = new Set();
      for (const entry of entries) {
        const key = `${entry.channel}:${entry.sequence}`;
        if (entry.sequence <= (previousSequences.get(entry.channel) || 0) || seen.has(key)) continue;
        seen.add(key);
        this.sequences.set(entry.channel, Math.max(entry.sequence, this.sequences.get(entry.channel) || 0));
        accepted.push(entry);
        if (this.paused) this.pending += 1;
      }
      if (this.unified && accepted.length) {
        const merged = ChatFlow.mergeTimeline(this.buffer.values(), accepted);
        this.buffer.clear();
        for (const entry of merged) this.buffer.push(entry);
      } else {
        for (const entry of accepted) this.buffer.push(entry);
      }
      this.onPause(this.paused, this.pending);
      if (!this.paused) this.schedule();
    }

    purge(deletion) {
      ChatFlow.markDeleted(this.buffer.values(), deletion);
      if (this.frozen) ChatFlow.markDeleted(this.frozen, deletion);
      this.schedule();
    }

    static compileHighlights(rules) {
      return rules.map((rule) => ({ ...rule, regex: new RegExp(ChatFlow.compilePattern(rule.pattern).source, "giu") }));
    }

    static highlight(node, content, rules) {
      const colors = new Array(content.length);
      for (const rule of rules) {
        rule.regex.lastIndex = 0;
        for (const match of content.matchAll(rule.regex)) {
          for (let index = match.index; index < match.index + match[0].length; index += 1) colors[index] ||= rule.color;
        }
      }
      node.replaceChildren();
      let start = 0;
      while (start < content.length) {
        let end = start + 1;
        while (end < content.length && colors[end] === colors[start]) end += 1;
        const fragment = document.createElement(colors[start] ? "mark" : "span");
        fragment.textContent = content.slice(start, end);
        if (colors[start]) {
          fragment.style.backgroundColor = colors[start];
          const color = colors[start];
          const brightness = parseInt(color.slice(1, 3), 16) * .299 + parseInt(color.slice(3, 5), 16) * .587 + parseInt(color.slice(5, 7), 16) * .114;
          fragment.style.color = brightness > 150 ? "#20231f" : "#ffffff";
        }
        node.append(fragment);
        start = end;
      }
    }

    schedule() {
      if (this.frame !== null) return;
      this.frame = requestAnimationFrame(() => { this.frame = null; this.render(); });
    }

    render() {
      const entries = this.frozen || this.buffer.values();
      this.content.style.height = `${entries.length * ROW_HEIGHT}px`;
      const scrollTop = this.paused ? this.viewport.scrollTop : Math.max(0, entries.length * ROW_HEIGHT - this.viewport.clientHeight);
      const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
      const count = Math.max(0, Math.min(entries.length - start, Math.ceil(this.viewport.clientHeight / ROW_HEIGHT) + OVERSCAN * 2));
      while (this.rows.length > count) this.rows.pop().remove();
      while (this.rows.length < count) {
        const row = document.createElement("div");
        row.className = "chat-row";
        row.tabIndex = 0;
        row.setAttribute("role", "listitem");
        row.append(document.createElement("time"), document.createElement("strong"), document.createElement("span"));
        this.content.append(row);
        this.rows.push(row);
      }
      this.rows.forEach((row, offset) => {
        const entry = entries[start + offset];
        row.entry = entry;
        row.style.transform = `translateY(${(start + offset) * ROW_HEIGHT}px)`;
        row.setAttribute("aria-posinset", String(start + offset + 1));
        row.setAttribute("aria-setsize", String(entries.length));
        const [time, author, text] = row.children;
        time.textContent = new Date(entry.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        author.replaceChildren();
        if (this.unified) {
          const tag = document.createElement("b");
          tag.className = "channel-tag";
          tag.textContent = `#${entry.channel}`;
          author.append(tag);
        }
        author.append(document.createTextNode(entry.displayName || entry.login));
        VirtualChat.highlight(text, entry.text, this.highlights);
        row.dataset.deleted = String(Boolean(entry.deleted));
        row.title = `${entry.displayName || entry.login}: ${entry.text}`;
      });
      if (!this.paused) {
        this.viewport.scrollTop = this.viewport.scrollHeight;
        this.programmaticScrollTop = this.viewport.scrollTop;
        this.lastScrollTop = this.viewport.scrollTop;
      }
    }

    destroy() {
      this.events.abort();
      this.observer.disconnect();
      if (this.frame !== null) cancelAnimationFrame(this.frame);
    }
  }

  root.VirtualChat = VirtualChat;
})(globalThis);