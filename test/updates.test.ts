// Обновление на Mac: скрипт ставит новую версию на место старой, подписывает «для себя» и запускает.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { macSwapScript } from "../desktop/main/macSwap.js";

// Скрипт работает только на Mac (и проверяется на Mac/Linux через bash); на Windows bash нет — там этот тест не нужен.
describe.skipIf(process.platform === "win32")("обновление на Mac", () => {
  it("меняет программу на новую, подписывает и запускает; старая не остаётся", () => {
    const d = mkdtempSync(join(tmpdir(), "swap-"));
    const app = join(d, "Applications", "Camado.app");
    const nw = join(d, "update", "new", "Camado.app");
    mkdirSync(app, { recursive: true });
    mkdirSync(nw, { recursive: true });
    writeFileSync(join(app, "v"), "1.0.7");
    writeFileSync(join(nw, "v"), "1.0.8");
    // заглушки команд Mac: записываем, что их вызвали
    const bin = join(d, "bin");
    mkdirSync(bin);
    for (const c of ["xattr", "codesign", "open"]) {
      writeFileSync(join(bin, c), `#!/bin/bash\necho "${c} $*" >> "${d}/calls"\n`);
      chmodSync(join(bin, c), 0o755);
    }
    const script = join(d, "swap.sh");
    writeFileSync(script, macSwapScript(), { mode: 0o755 });
    execFileSync("/bin/bash", [script, "999999", nw, app], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
    expect(readFileSync(join(app, "v"), "utf8")).toBe("1.0.8");
    expect(existsSync(`${app}.old`)).toBe(false);
    const calls = readFileSync(join(d, "calls"), "utf8");
    expect(calls).toContain(`xattr -cr ${app}`);
    expect(calls).toContain(`codesign --force --deep -s - ${app}`);
    expect(calls).toContain(`open ${app}`);
  });

  it("если новую не удалось поставить — возвращает старую и запускает её", () => {
    const d = mkdtempSync(join(tmpdir(), "swap-"));
    const app = join(d, "Camado.app");
    mkdirSync(app);
    writeFileSync(join(app, "v"), "1.0.7");
    const bin = join(d, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "open"), `#!/bin/bash\necho "open $*" >> "${d}/calls"\n`);
    chmodSync(join(bin, "open"), 0o755);
    const script = join(d, "swap.sh");
    writeFileSync(script, macSwapScript(), { mode: 0o755 });
    // новой программы нет (скачалась не до конца)
    try {
      execFileSync("/bin/bash", [script, "999999", join(d, "нет.app"), app], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, stdio: "ignore" });
    } catch {
      // скрипт и должен завершиться с ошибкой
    }
    expect(readFileSync(join(app, "v"), "utf8")).toBe("1.0.7");
    expect(readFileSync(join(d, "calls"), "utf8")).toContain(`open ${app}`);
  });
});
