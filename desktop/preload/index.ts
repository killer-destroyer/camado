// Мост между окном и фоновой частью: окно видит только эти функции, без доступа к Node.
import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { CamadoApi } from "../shared/types.js";

const call =
  (method: string) =>
  (...args: unknown[]) =>
    ipcRenderer.invoke("camado", method, ...args);

const api: CamadoApi = {
  info: call("info") as CamadoApi["info"],
  tasks: {
    list: call("tasks.list") as CamadoApi["tasks"]["list"],
    add: call("tasks.add") as CamadoApi["tasks"]["add"],
    update: call("tasks.update") as CamadoApi["tasks"]["update"],
    quickAdd: call("tasks.quickAdd") as CamadoApi["tasks"]["quickAdd"],
  },
  subjects: {
    list: call("subjects.list") as CamadoApi["subjects"]["list"],
    save: call("subjects.save") as CamadoApi["subjects"]["save"],
  },
  notes: {
    list: call("notes.list") as CamadoApi["notes"]["list"],
    save: call("notes.save") as CamadoApi["notes"]["save"],
    remove: call("notes.remove") as CamadoApi["notes"]["remove"],
    pdf: call("notes.pdf") as CamadoApi["notes"]["pdf"],
  },
  focus: {
    add: call("focus.add") as CamadoApi["focus"]["add"],
    list: call("focus.list") as CamadoApi["focus"]["list"],
  },
  chat: {
    history: call("chat.history") as CamadoApi["chat"]["history"],
    send: call("chat.send") as CamadoApi["chat"]["send"],
  },
  ai: {
    status: call("ai.status") as CamadoApi["ai"]["status"],
    setKey: call("ai.setKey") as CamadoApi["ai"]["setKey"],
    connect: call("ai.connect") as CamadoApi["ai"]["connect"],
    clearKey: call("ai.clearKey") as CamadoApi["ai"]["clearKey"],
  },
  bot: {
    status: call("bot.status") as CamadoApi["bot"]["status"],
    connect: call("bot.connect") as CamadoApi["bot"]["connect"],
    pairingCode: call("bot.pairingCode") as CamadoApi["bot"]["pairingCode"],
    disconnect: call("bot.disconnect") as CamadoApi["bot"]["disconnect"],
  },
  settings: {
    get: call("settings.get") as CamadoApi["settings"]["get"],
    set: call("settings.set") as CamadoApi["settings"]["set"],
  },
  library: {
    get: call("library.get") as CamadoApi["library"]["get"],
    pickFolder: call("library.pickFolder") as CamadoApi["library"]["pickFolder"],
    addPaths: call("library.addPaths") as CamadoApi["library"]["addPaths"],
    removeFolder: call("library.removeFolder") as CamadoApi["library"]["removeFolder"],
    rescan: call("library.rescan") as CamadoApi["library"]["rescan"],
  },
  lyrics: { get: call("lyrics.get") as CamadoApi["lyrics"]["get"], aiSync: call("lyrics.aiSync") as CamadoApi["lyrics"]["aiSync"] },
  quick: { close: call("quick.close") as CamadoApi["quick"]["close"], key: call("quick.key") as CamadoApi["quick"]["key"] },
  alarm: { pickSound: call("alarm.pickSound") as CamadoApi["alarm"]["pickSound"] },
  screensaver: { pickImage: call("screensaver.pickImage") as CamadoApi["screensaver"]["pickImage"] },
  music: {
    importUrl: call("music.importUrl") as CamadoApi["music"]["importUrl"],
    importHtml: call("music.importHtml") as CamadoApi["music"]["importHtml"],
    searchFree: call("music.searchFree") as CamadoApi["music"]["searchFree"],
    freeTracks: call("music.freeTracks") as CamadoApi["music"]["freeTracks"],
  },
  steps: {
    list: call("steps.list") as CamadoApi["steps"]["list"],
    set: call("steps.set") as CamadoApi["steps"]["set"],
    toggle: call("steps.toggle") as CamadoApi["steps"]["toggle"],
    ai: call("steps.ai") as CamadoApi["steps"]["ai"],
  },
  tutor: { ask: call("tutor.ask") as CamadoApi["tutor"]["ask"] },
  media: { send: call("ai.fromMedia") as CamadoApi["media"]["send"] },
  cards: {
    list: call("cards.list") as CamadoApi["cards"]["list"],
    add: call("cards.add") as CamadoApi["cards"]["add"],
    review: call("cards.review") as CamadoApi["cards"]["review"],
    remove: call("cards.remove") as CamadoApi["cards"]["remove"],
    ai: call("cards.ai") as CamadoApi["cards"]["ai"],
  },
  exams: {
    list: call("exams.list") as CamadoApi["exams"]["list"],
    save: call("exams.save") as CamadoApi["exams"]["save"],
    remove: call("exams.remove") as CamadoApi["exams"]["remove"],
    setTickets: call("tickets.set") as CamadoApi["exams"]["setTickets"],
    ticketStatus: call("tickets.status") as CamadoApi["exams"]["ticketStatus"],
  },
  plan: {
    list: call("plan.list") as CamadoApi["plan"]["list"],
    save: call("plan.save") as CamadoApi["plan"]["save"],
    remove: call("plan.remove") as CamadoApi["plan"]["remove"],
  },
  links: {
    list: call("links.list") as CamadoApi["links"]["list"],
    save: call("links.save") as CamadoApi["links"]["save"],
    remove: call("links.remove") as CamadoApi["links"]["remove"],
    open: call("links.open") as CamadoApi["links"]["open"],
  },
  playlists: {
    list: call("playlists.list") as CamadoApi["playlists"]["list"],
    create: call("playlists.create") as CamadoApi["playlists"]["create"],
    rename: call("playlists.rename") as CamadoApi["playlists"]["rename"],
    remove: call("playlists.remove") as CamadoApi["playlists"]["remove"],
    add: call("playlists.add") as CamadoApi["playlists"]["add"],
    removeTrack: call("playlists.removeTrack") as CamadoApi["playlists"]["removeTrack"],
    reorder: call("playlists.reorder") as CamadoApi["playlists"]["reorder"],
    toggleFavorite: call("playlists.toggleFavorite") as CamadoApi["playlists"]["toggleFavorite"],
  },
  plays: {
    add: call("plays.add") as CamadoApi["plays"]["add"],
    stats: call("plays.stats") as CamadoApi["plays"]["stats"],
  },
  overlay: {
    toggle: call("overlay.toggle") as CamadoApi["overlay"]["toggle"],
    isOpen: call("overlay.isOpen") as CamadoApi["overlay"]["isOpen"],
    push: call("overlay.push") as CamadoApi["overlay"]["push"],
  },
  nowPlaying: {
    push: call("nowPlaying.push") as CamadoApi["nowPlaying"]["push"],
    action: call("nowPlaying.action") as CamadoApi["nowPlaying"]["action"],
  },
  discord: { status: call("discord.status") as CamadoApi["discord"]["status"] },
  updates: {
    status: call("updates.status") as CamadoApi["updates"]["status"],
    check: call("updates.check") as CamadoApi["updates"]["check"],
    install: call("updates.install") as CamadoApi["updates"]["install"],
  },
  system: {
    idleSeconds: call("system.idleSeconds") as CamadoApi["system"]["idleSeconds"],
    trayStatus: call("tray.status") as CamadoApi["system"]["trayStatus"],
  },
  window: {
    setTitleBarColors: call("window.setTitleBarColors") as CamadoApi["window"]["setTitleBarColors"],
    setFullScreen: call("window.setFullScreen") as CamadoApi["window"]["setFullScreen"],
    isFullScreen: call("window.isFullScreen") as CamadoApi["window"]["isFullScreen"],
  },
  notify: call("notify") as CamadoApi["notify"],
  pathForFile: (file: File) => webUtils.getPathForFile(file),
  on: ((event: string, cb: (payload?: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on(event, listener);
    return () => ipcRenderer.removeListener(event, listener);
  }) as CamadoApi["on"],
};

contextBridge.exposeInMainWorld("camado", api);
