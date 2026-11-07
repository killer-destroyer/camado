// Все курсы «Прокачки». Тексты уроков — в .md рядом, сюда попадают при сборке.
import { parseCourse, type Course, type CourseId } from "./format";
import python from "./python.md?raw";
import java from "./java.md?raw";
import cpp from "./cpp.md?raw";
import html from "./html.md?raw";

export const COURSES: Course[] = [
  parseCourse("python", "Python", "python", python),
  parseCourse("java", "Java", "java", java),
  parseCourse("cpp", "C++", "cpp", cpp),
  parseCourse("html", "HTML и CSS", "html", html),
];

export const courseById = (id: CourseId): Course | undefined => COURSES.find((c) => c.id === id);
