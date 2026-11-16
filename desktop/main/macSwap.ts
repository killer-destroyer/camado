// Замена Камадо новой версией на Mac (без Electron — чтобы проверять в тестах).

/**
 * Скрипт замены программы на Mac. Ждёт, пока старый Камадо закроется, ставит новый на его место
 * (старый — в запас, чтобы вернуть, если что-то пошло не так), снимает пометку «из интернета»,
 * подписывает «для себя» и запускает.
 */
export function macSwapScript(): string {
  return `#!/bin/bash
PID="$1"; NEW="$2"; APP="$3"
for i in $(seq 1 100); do kill -0 "$PID" 2>/dev/null || break; sleep 0.2; done
rm -rf "$APP.old"
if ! mv "$APP" "$APP.old"; then open "$APP"; exit 1; fi
if ! mv "$NEW" "$APP"; then mv "$APP.old" "$APP"; open "$APP"; exit 1; fi
xattr -cr "$APP" 2>/dev/null
codesign --force --deep -s - "$APP" 2>/dev/null
rm -rf "$APP.old"
open "$APP"
`;
}
