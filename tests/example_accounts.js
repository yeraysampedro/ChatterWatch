import { harness } from "./worker_harness.js";

// Fictional fixtures only; never load the owner's private account file or contact Twitch.
export const exampleAccounts = {
  broadcaster: { id: "100", login: "demo", displayName: "DemoBroadcaster", ageDays: 400, badges: "broadcaster/1" },
  moderator: { id: "42", login: "demo_moderator", displayName: "DemoModerator", ageDays: 400, badges: "moderator/1" },
  newcomer: { id: "501", login: "sample_viewer_01", displayName: "SampleViewer01", ageDays: 2, firstMessage: true, followedMinutesAgo: 20 },
  follower: { id: "502", login: "sample_viewer_02", displayName: "SampleViewer02", ageDays: 120, followedMinutesAgo: 10 },
  regular: { id: "503", login: "demo_regular", displayName: "DemoRegular", ageDays: 400 },
  subscriber: { id: "504", login: "demo_subscriber", displayName: "DemoSubscriber", ageDays: 400, subscriber: true, badges: "subscriber/1" },
  vip: { id: "505", login: "demo_helper", displayName: "DemoHelper", ageDays: 2, firstMessage: true, badges: "vip/1" }
};

const exampleScopes = ["chat:read", "moderator:manage:banned_users", "moderator:manage:chat_messages", "moderator:read:followers"];
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => structuredClone(body) });

export async function exampleApp({ firefox = false, settings = {}, scopes = exampleScopes, moderationStatus = 200, moderationMessage = "Example channel role denied", realTimers = false } = {}) {
  const now = Date.now();
  const app = await harness({
    firefox, scopes, realTimers,
    fetch(url, options) {
      const { origin, pathname, searchParams } = new URL(url);
      if (origin === "https://api.twitch.tv") {
        if (pathname === "/helix/users" && options.method === "GET") {
          const account = Object.values(exampleAccounts).find((account) => searchParams.get("id") === account.id || searchParams.get("login") === account.login);
          if (account) return response({ data: [{
            id: account.id, login: account.login, display_name: account.displayName,
            created_at: new Date(now - account.ageDays * 86400000).toISOString(), profile_image_url: ""
          }] });
          if (searchParams.get("login") === "sample_a") return response({ data: [{ id: "200", login: "sample_a" }] });
        }
        if (pathname === "/helix/channels/followers" && options.method === "GET") {
          if (!scopes.includes("moderator:read:followers")) return response({ message: "Example follower permission denied" }, 403);
          const account = Object.values(exampleAccounts).find((account) => searchParams.get("user_id") === account.id);
          if (account) return response({ data: account.followedMinutesAgo
            ? [{ user_id: account.id, followed_at: new Date(now - account.followedMinutesAgo * 60000).toISOString() }] : [] });
        }
        if ((pathname === "/helix/moderation/bans" && ["POST", "DELETE"].includes(options.method)) ||
            (pathname === "/helix/moderation/chat" && options.method === "DELETE")) {
          return moderationStatus === 200 ? response({}, 204) : response({ message: moderationMessage }, moderationStatus);
        }
      }
      throw new Error(`Unexpected example-account request: ${options.method} ${url}`);
    }
  });
  let ready = false;
  try {
    app.request = async (message) => {
      const result = await app.sendMessage(message);
      if (result.error) throw new Error(result.error);
      return result;
    };
    await app.request({ type: "SAVE_SETTINGS", settings: {
      clientId: "example-client", channel: "demo", language: "en", autoTimeout: false,
      autoApproveMessages: false, autoApproveFollowers: false, autoApproveSubscribers: false,
      autoApproveFormerSubscribers: false, ...settings
    } });
    await app.chrome.storage.session.set({ accessToken: "test-token", moderator: {
      user_id: exampleAccounts.moderator.id, login: exampleAccounts.moderator.login, scopes
    } });
    await app.request({ type: "CONNECT" });
    app.sockets[0].open();
    app.sockets[0].receive(":tmi.twitch.tv 001 demo_moderator :Welcome");
    app.sockets[0].receive("@room-id=100;slow=0 :tmi.twitch.tv ROOMSTATE #demo");
    ready = true;
    return app;
  } finally { if (!ready) app.dispose(); }
}

export async function receiveExampleMessage(app, account, number = 1, { channel = "demo", text = `Harmless example ${number} from ${account.displayName}`, tags = {} } = {}) {
  const id = `${channel}-${account.id}-${number}`;
  const fields = {
    id, "user-id": account.id, "room-id": channel === "demo" ? "100" : "200", "display-name": account.displayName,
    "first-msg": account.firstMessage && number === 1 ? "1" : "0",
    subscriber: account.subscriber ? "1" : "0", badges: account.badges || "", ...tags
  };
  const encoded = Object.entries(fields).map(([key, value]) => `${key}=${value}`).join(";");
  app.sockets.at(-1).receive(`@${encoded} :${account.login}!${account.login}@${account.login}.tmi.twitch.tv PRIVMSG #${channel} :${text}`);
  if (channel === "demo") {
    const deadline = performance.now() + 5000;
    while (true) {
      const directory = await app.request({ type: "GET_CHATTERS", filter: "all", query: account.login });
      const observed = directory.accounts.find((entry) => entry.userId === account.id);
      if (observed?.messageCount === number && !observed.lookupPending) break;
      if (performance.now() >= deadline) throw new Error(`Example message ${id} was not reviewed: ${JSON.stringify(observed)}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await app.request({ type: "GET_ACCOUNT_HISTORY", key: `100:${account.id}` });
  }
  return { id, text };
}
