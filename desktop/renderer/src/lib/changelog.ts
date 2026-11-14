// Список изменений, вшитый в программу (работает без интернета).
import { parseChangelog } from "../../../shared/changelog";
import text from "../../../shared/changelog.md?raw";

export const CHANGELOG = parseChangelog(text);
