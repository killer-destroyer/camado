import type { CamadoApi } from "../../../shared/types";

declare global {
  interface Window {
    camado: CamadoApi;
    /** Для снимков экрана при проверке дизайна. */
    __camadoShot?: (name: string) => void;
  }
}

export const api: CamadoApi = window.camado;
