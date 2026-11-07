(function (root) {
  "use strict";

  const MAX_CHANNELS = 6;
  const HISTORY_LIMIT = 1000;
  const BATCH_LIMIT = 250;
  const TRACKING_LIMIT = 5000;

  function integer(value, fallback, min, max) {
    const number = Number(value);
    return Number.isInteger(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function channelName(value) {
    const name = String(value || "").trim().replace(/^[@#]/, "").toLowerCase();
    if (!/^[a-z0-9_]{1,25}$/.test(name)) throw new Error("Invalid Twitch channel name.");
    return name;
  }

  function compilePattern(value) {
    const source = String(value || "").trim();
    if (!source) return null;
    if (source.length > 240 || source.split("|").length > 12) throw new Error("Spam pattern is too long.");
    const literals = source.replace(/\\(?:b|[.\-\/\\^$|])/g, "x");
    if (/[\\.*+?()[\]{}]/.test(literals) || source.split("|").some((part) => !part)) {
      throw new Error("Use literal alternatives, ^, $, or \\b only; regex quantifiers and groups are not supported.");
    }
    const pattern = new RegExp(source, "iu");
    if (pattern.test("")) throw new Error("Spam pattern must not match empty text.");
    return pattern;
  }

  function normalizeFlow(value = {}) {
    const pattern = String(value.pattern || "").trim();
    compilePattern(pattern);
    return {
      batchMs: integer(value.batchMs, 200, 100, 1000),
      localSlowSeconds: integer(value.localSlowSeconds, 0, 0, 120),
      spamEnabled: value.spamEnabled !== false,
      repeatLimit: integer(value.repeatLimit, 3, 2, 20),
      frequencyLimit: integer(value.frequencyLimit, 6, 2, 50),
      windowSeconds: integer(value.windowSeconds, 10, 1, 120),
      pattern,
      pauseOnHover: value.pauseOnHover !== false
    };
  }

  function normalizeConfig(value = {}) {
    const channels = [...new Set((Array.isArray(value.channels) ? value.channels : []).map(channelName))];
    if (channels.length > MAX_CHANNELS) throw new Error(`At most ${MAX_CHANNELS} channels are supported.`);
    return {
      channels, columns: integer(value.columns, 2, 1, 3), flow: normalizeFlow(value.flow),
      viewMode: value.viewMode === "unified" ? "unified" : "grid", highlights: normalizeHighlights(value.highlights)
    };
  }

  function normalizeHighlights(value = []) {
    if (!Array.isArray(value) || value.length > 12) throw new Error("At most 12 highlight rules are supported.");
    return value.map((rule) => {
      const pattern = String(rule.pattern || "").trim();
      if (!compilePattern(pattern)) throw new Error("Highlight pattern must not be empty.");
      const color = String(rule.color || "");
      if (!/^#[a-f0-9]{6}$/i.test(color)) throw new Error("Use a six-digit hex highlight color.");
      return { pattern, color };
    });
  }

  function matchesDeletion(entry, { channel, id, userId }) {
    return (!channel || entry.channel === channel) && (id ? entry.id === id : userId ? entry.userId === userId : true);
  }

  function markDeleted(entries, deletion) {
    for (const entry of entries) if (matchesDeletion(entry, deletion)) entry.deleted = true;
    return entries;
  }

  function mergeTimeline(...groups) {
    const entries = new Map();
    for (const group of groups) {
      for (const entry of group) {
        const key = `${entry.channel}:${entry.id}`;
        const previous = entries.get(key);
        entries.set(key, previous?.deleted ? { ...entry, deleted: true } : entry);
      }
    }
    return [...entries.values()].sort((left, right) => left.sentAt - right.sentAt ||
      left.channel.localeCompare(right.channel) || left.sequence - right.sequence || left.id.localeCompare(right.id)).slice(-HISTORY_LIMIT);
  }

  function exportText(entries) {
    const clean = (value) => String(value || "").replace(/[\r\n\t\u0000-\u001f\u007f]/g, (character) =>
      character === "\n" ? "\\n" : character === "\r" ? "\\r" : character === "\t" ? "\\t" : "");
    return entries.map((entry) => `${new Date(entry.sentAt).toISOString()} #${clean(entry.channel)} ${clean(entry.displayName || entry.login)}${entry.deleted ? " [deleted]" : ""}: ${clean(entry.text)}`).join("\n") + "\n";
  }

  class RingBuffer {
    constructor(capacity) {
      this.capacity = capacity;
      this.items = new Array(capacity);
      this.start = 0;
      this.size = 0;
    }

    push(value) {
      const evicted = this.size === this.capacity;
      this.items[(this.start + this.size) % this.capacity] = value;
      if (evicted) this.start = (this.start + 1) % this.capacity;
      else this.size += 1;
      return evicted;
    }

    values() {
      return Array.from({ length: this.size }, (_, index) => this.items[(this.start + index) % this.capacity]);
    }

    clear() {
      this.items = new Array(this.capacity);
      this.start = 0;
      this.size = 0;
    }
  }

  class FlowController {
    constructor(settings = {}) {
      this.channels = new Map();
      this.configure(settings);
    }

    configure(settings) {
      this.settings = normalizeFlow(settings);
      this.pattern = compilePattern(this.settings.pattern);
      for (const state of this.channels.values()) state.tracking.clear();
    }

    channel(name) {
      if (!this.channels.has(name)) {
        if (this.channels.size >= MAX_CHANNELS) throw new Error("Too many active channels.");
        this.channels.set(name, {
          history: new RingBuffer(HISTORY_LIMIT), pending: new RingBuffer(BATCH_LIMIT), tracking: new Map(),
          stats: { received: 0, filtered: 0, overflow: 0, moderationSkipped: 0 }, sequence: 0
        });
      }
      return this.channels.get(name);
    }

    track(state, key, now) {
      let entry = state.tracking.get(key);
      if (!entry || now - entry.started >= this.settings.windowSeconds * 1000) {
        entry = { started: now, count: 0, lastShown: entry?.lastShown ?? -Infinity };
      }
      state.tracking.delete(key);
      state.tracking.set(key, entry);
      if (state.tracking.size > TRACKING_LIMIT) state.tracking.delete(state.tracking.keys().next().value);
      entry.count += 1;
      return entry;
    }

    ingest(message, now = Date.now()) {
      const state = this.channel(message.channel);
      state.stats.received += 1;
      const text = String(message.text || "").slice(0, 2000);
      const normalized = text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
      const user = this.track(state, `user:${message.userId || message.login}`, now);
      const repeated = this.track(state, `text:${normalized}`, now);
      const spam = this.settings.spamEnabled && (
        repeated.count >= this.settings.repeatLimit || user.count > this.settings.frequencyLimit ||
        Boolean(this.pattern?.test(text))
      );
      const slow = now - user.lastShown < this.settings.localSlowSeconds * 1000;
      if (spam || slow) {
        state.stats.filtered += 1;
        return false;
      }
      user.lastShown = now;
      const entry = { ...message, text, sequence: ++state.sequence, sentAt: message.sentAt || now };
      state.history.push(entry);
      if (state.pending.push(entry)) state.stats.overflow += 1;
      return true;
    }

    snapshot(name) {
      const state = this.channel(name);
      return { channel: name, entries: state.history.values(), stats: { ...state.stats } };
    }

    flush() {
      return [...this.channels].map(([channel, state]) => {
        const batch = { channel, entries: state.pending.values(), stats: { ...state.stats } };
        state.pending.clear();
        return batch;
      });
    }

    purge(name, { id, userId } = {}) {
      const state = this.channels.get(name);
      if (!state) return;
      for (const buffer of [state.history, state.pending]) {
        markDeleted(buffer.values(), { id, userId });
      }
    }
  }

  const api = { MAX_CHANNELS, HISTORY_LIMIT, BATCH_LIMIT, TRACKING_LIMIT, channelName, compilePattern, normalizeFlow, normalizeConfig, normalizeHighlights, matchesDeletion, markDeleted, mergeTimeline, exportText, RingBuffer, FlowController };
  root.ChatFlow = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);