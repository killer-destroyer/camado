// Запуск кода из «Прокачки» на самом компьютере: Python, Java, C++ — если они установлены.
// Запускается только код из редактора и только по кнопке пользователя. Есть ограничение по времени и размеру вывода.
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CourseId } from "../shared/courses/format.js";

export type RunLang = Exclude<CourseId, "html">;

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  /** Не уложилась во время. */
  timeout?: boolean;
  /** Ошибка компиляции (Java, C++). */
  compile?: boolean;
}

const OUT_LIMIT = 64 * 1024;
const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";

/** Программы из Finder на Mac видят только системный PATH — добавим, куда обычно ставят Homebrew и Python. */
export function runEnv(): NodeJS.ProcessEnv {
  const extra = isWin ? [] : ["/opt/homebrew/bin", "/usr/local/bin", "/opt/homebrew/opt/openjdk/bin", "/usr/local/opt/openjdk/bin"];
  const sep = isWin ? ";" : ":";
  return { ...process.env, PATH: [...(process.env.PATH ?? "").split(sep), ...extra].filter(Boolean).join(sep), PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" };
}

function exec(cmd: string, args: string[], opts: { input?: string; cwd?: string; timeout: number }): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = execFile(
      cmd,
      args,
      { cwd: opts.cwd, timeout: opts.timeout, maxBuffer: OUT_LIMIT, env: runEnv(), windowsHide: true, encoding: "utf8" },
      (err, stdout, stderr) => {
        const e = err as (NodeJS.ErrnoException & { killed?: boolean; signal?: string; code?: number | string }) | null;
        resolve({
          ok: !e,
          stdout: String(stdout ?? "").slice(0, OUT_LIMIT),
          stderr: String(stderr ?? "").slice(0, OUT_LIMIT) || (e && e.code === "ENOENT" ? "не найдено" : e && !e.killed ? "" : ""),
          timeout: !!e?.killed,
        });
      },
    );
    // программа может завершиться, не дочитав ввод (EPIPE) — это не ошибка Камадо
    child.stdin?.on("error", () => undefined);
    child.stdin?.end(opts.input ?? "");
  });
}

/** На Mac /usr/bin/python3, g++, clang++ — заглушки, которые предлагают поставить Xcode. Без инструментов не трогаем их. */
let xcodeTools: boolean | undefined;
async function hasXcodeTools(): Promise<boolean> {
  if (!isMac) return true;
  if (xcodeTools === undefined) xcodeTools = (await exec("/usr/bin/xcode-select", ["-p"], { timeout: 4000 })).ok;
  return xcodeTools;
}

async function works(cmd: string, args: string[]): Promise<boolean> {
  if (isMac && cmd.startsWith("/usr/bin/") && !(await hasXcodeTools())) return false;
  const r = await exec(cmd, args, { timeout: 6000 });
  return r.ok;
}

export interface Toolchain {
  python?: string;
  javac?: string;
  java?: string;
  cpp?: string;
}

let cached: Toolchain | undefined;

/** Что установлено. Проверяется один раз (повторно — после перезапуска или по кнопке «Проверить снова»). */
export async function detectTools(force = false): Promise<Toolchain> {
  if (cached && !force) return cached;
  if (force) xcodeTools = undefined;
  const t: Toolchain = {};
  const first = async (cands: string[], args: string[]) => {
    for (const c of cands) if (await works(c, args)) return c;
    return undefined;
  };
  const brew = (n: string) => [`/opt/homebrew/bin/${n}`, `/usr/local/bin/${n}`];
  t.python = await first(isWin ? ["python", "py", "python3"] : isMac ? [...brew("python3"), "/usr/bin/python3"] : ["python3", "python"], ["--version"]);
  const jdk = isMac ? ["/opt/homebrew/opt/openjdk/bin/", "/usr/local/opt/openjdk/bin/", ""] : [""];
  for (const p of jdk) {
    // На Mac /usr/bin/java без JDK выдаёт ошибку — works() вернёт false.
    if (!t.java && (await works(`${p}java`, ["-version"]))) t.java = `${p}java`;
    if (!t.javac && (await works(`${p}javac`, ["-version"]))) t.javac = `${p}javac`;
  }
  t.cpp = await first(isMac ? [...brew("g++-14"), "/usr/bin/clang++", "/usr/bin/g++"] : isWin ? ["g++", "clang++"] : ["g++", "clang++"], ["--version"]);
  cached = t;
  return t;
}

export function hasRunner(t: Toolchain, lang: RunLang): boolean {
  return lang === "python" ? !!t.python : lang === "java" ? !!t.java : !!t.cpp;
}

/** Как поставить, одной строкой. */
export function installHint(lang: RunLang): string {
  if (isMac) return lang === "java" ? "В Терминале: brew install openjdk (нужен Homebrew: brew.sh) или JDK с adoptium.net" : "В Терминале: xcode-select --install — поставит Python 3 и компилятор C++";
  if (isWin) return lang === "python" ? "Поставь Python с python.org (галочка «Add to PATH»)" : lang === "java" ? "Поставь JDK с adoptium.net" : "Поставь MSYS2 (msys2.org) и в нём: pacman -S mingw-w64-ucrt-x86_64-gcc";
  return lang === "python" ? "sudo apt install python3" : lang === "java" ? "sudo apt install default-jdk" : "sudo apt install g++";
}

/** Скомпилировать (если надо) и прогнать на каждом входе. */
export async function runCode(t: Toolchain, lang: RunLang, code: string, inputs: string[], runTimeout = 5000): Promise<RunResult[] | { error: string }> {
  if (!hasRunner(t, lang)) return { error: "not-installed" };
  const dir = await mkdtemp(join(tmpdir(), "camado-run-"));
  try {
    let cmd: string;
    let args: string[];
    if (lang === "python") {
      await writeFile(join(dir, "main.py"), code, "utf8");
      cmd = t.python!;
      args = cmd.endsWith("py") && isWin ? ["-3", "main.py"] : ["main.py"];
    } else if (lang === "java") {
      // Имя файла должно совпадать с public-классом; в задачах это Main.
      const cls = /public\s+(?:final\s+)?class\s+(\w+)/.exec(code)?.[1] ?? "Main";
      await writeFile(join(dir, `${cls}.java`), code, "utf8");
      if (t.javac) {
        const c = await exec(t.javac, ["-encoding", "UTF-8", `${cls}.java`], { cwd: dir, timeout: 30000 });
        if (!c.ok) return [{ ...c, ok: false, compile: true }];
        cmd = t.java!;
        args = ["-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", "-cp", ".", cls];
      } else {
        cmd = t.java!;
        args = ["-Dfile.encoding=UTF-8", "-Dstdout.encoding=UTF-8", `${cls}.java`];
      }
    } else {
      await writeFile(join(dir, "main.cpp"), code, "utf8");
      const exe = isWin ? "main.exe" : "main";
      const c = await exec(t.cpp!, ["-std=c++17", "-O2", "-o", exe, "main.cpp"], { cwd: dir, timeout: 60000 });
      if (!c.ok) return [{ ...c, ok: false, compile: true }];
      cmd = join(dir, exe);
      args = [];
    }
    const out: RunResult[] = [];
    for (const input of inputs.length ? inputs : [""]) {
      out.push(await exec(cmd, args, { cwd: dir, input: input.endsWith("\n") || !input ? input : `${input}\n`, timeout: runTimeout }));
    }
    return out;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
