(function (root) {
  "use strict";
  const ROW_HEIGHT = 64;
  const OVERSCAN = 3;

  class VirtualChat {
    constructor(viewport, { onPause, onInspect, pauseOnHover = true }) {
      this.viewport = viewport;
      this.onPause = onPause;
      this.onInspect = onInspect;
      this.pauseOnHover = pauseOnHover;
      this.buffer = new ChatFlow.RingBuffer(ChatFlow.HISTORY_LIMIT);
      this.reasons = new Set();
      this.rows = [];
      this.sequence = 0;
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
        const atBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 8;
        if (this.userScrolling || this.paused) this.setPaused("scroll", !atBottom);
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

    configure(pauseOnHover) {
      this.pauseOnHover = pauseOnHover;
      if (!pauseOnHover) this.setPaused("hover", false);
    }

    replace(entries) {
      this.buffer.clear();
      this.sequence = 0;
      this.append(entries);
    }

    append(entries) {
      for (const entry of entries) {
        if (entry.sequence <= this.sequence) continue;
        this.sequence = entry.sequence;
        this.buffer.push(entry);
        if (this.paused) this.pending += 1;
      }
      this.onPause(this.paused, this.pending);
      if (!this.paused) this.schedule();
    }

    purge({ id, userId }) {
      const retain = (entry) => id ? entry.id !== id : userId ? entry.userId !== userId : false;
      const entries = this.buffer.values().filter(retain);
      this.buffer.clear();
      for (const entry of entries) this.buffer.push(entry);
      if (this.frozen) this.frozen = this.frozen.filter(retain);
      this.schedule();
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
        author.textContent = entry.displayName || entry.login;
        text.textContent = entry.text;
        row.title = `${entry.displayName || entry.login}: ${entry.text}`;
      });
      if (!this.paused) {
        this.viewport.scrollTop = this.viewport.scrollHeight;
        this.programmaticScrollTop = this.viewport.scrollTop;
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