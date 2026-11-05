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
  lyrics: { get: call("lyrics.get") as CamadoApi["lyrics"]["get"] },
  music: { importUrl: call("music.importUrl") as CamadoApi["music"]["importUrl"] },
  overlay: {
    toggle: call("overlay.toggle") as CamadoApi["overlay"]["toggle"],
    isOpen: call("overlay.isOpen") as CamadoApi["overlay"]["isOpen"],
    push: call("overlay.push") as CamadoApi["overlay"]["push"],
  },
  updates: {
    status: call("updates.status") as CamadoApi["updates"]["status"],
    check: call("updates.check") as CamadoApi["updates"]["check"],
    install: call("updates.install") as CamadoApi["updates"]["install"],
  },
  window: { setTitleBarColors: call("window.setTitleBarColors") as CamadoApi["window"]["setTitleBarColors"] },
  notify: call("notify") as CamadoApi["notify"],
  pathForFile: (file: File) => webUtils.getPathForFile(file),
  on: ((event: string, cb: (payload?: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on(event, listener);
    return () => ipcRenderer.removeListener(event, listener);
  }) as CamadoApi["on"],
};

contextBridge.exposeInMainWorld("camado", api);
