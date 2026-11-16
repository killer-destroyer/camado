# Задачник

## p-001 | Сумма двух | Арифметика | 1
Даны два целых числа a и b (|a|, |b| ≤ 10^18). Выведи их сумму.
in: 2 3
out: 5
in: -1000000000000000000 1000000000000000000
out: 0
in: 999999999999999999 999999999999999999
out: 1999999999999999998
hint: В Python числа не переполняются; в Java/C++ возьми long/long long — сумма до 2·10^18 влезает.
===
a, b = map(int, input().split())
print(a + b)
===

## p-002 | Последняя цифра | Арифметика | 1
Дано натуральное число n. Выведи его последнюю цифру и число десятков (вторую цифру справа, 0 если её нет).
in: 179
out: 9 7
in: 5
out: 5 0
in: 1000
out: 0 0
hint: Последняя цифра — n % 10, десятки — n / 10 % 10.
===
n = int(input())
print(n % 10, n // 10 % 10)
===

## p-003 | Парты | Арифметика | 1
В трёх классах a, b и c учеников. За партой сидят двое. Сколько парт нужно купить (на каждый класс отдельно)?
in: 20 21 22
out: 32
in: 1 1 1
out: 3
in: 2 4 6
out: 6
hint: Для класса из x учеников нужно (x + 1) / 2 парт (целочисленно).
===
a, b, c = map(int, input().split())
print((a + 1) // 2 + (b + 1) // 2 + (c + 1) // 2)
===

## p-004 | Часы | Арифметика | 1
С начала суток прошло n секунд (n может быть больше суток). Выведи время на электронных часах в формате H:MM:SS (часы без ведущего нуля).
in: 3602
out: 1:00:02
in: 129700
out: 12:01:40
in: 0
out: 0:00:00
hint: Сначала n %= 86400.
===
n = int(input()) % 86400
print(f"{n // 3600}:{n % 3600 // 60:02d}:{n % 60:02d}")
===

## p-005 | Стоимость покупки | Арифметика | 1
Пирожок стоит a рублей b копеек. Сколько рублей и копеек нужно заплатить за n пирожков?
in: 10 15 2
out: 20 30
in: 2 50 4
out: 10 0
in: 0 99 101
out: 99 99
hint: Переведи всё в копейки, умножь, переведи обратно.
===
a, b, n = map(int, input().split())
t = (a * 100 + b) * n
print(t // 100, t % 100)
===

## p-006 | Дробная часть | Арифметика | 1
Дано положительное дробное число (до 4 знаков после точки). Выведи его первую цифру после десятичной точки.
in: 1.79
out: 7
in: 3.05
out: 0
in: 10.0
out: 0
hint: Безопаснее работать со строкой: часть после точки, первый символ.
===
s = input().strip()
frac = s.split(".")[1] if "." in s else "0"
print(frac[0])
===

## p-007 | МКАД | Арифметика | 2
Длина кольцевой дороги 109 км. Байкер стартует с нулевого километра и едет со скоростью v км/ч (отрицательная — в обратную сторону) t часов. На какой отметке он остановится (0..108)?
in: 60 2
out: 11
in: -1 1
out: 108
in: 0 100
out: 0
hint: Позиция — (v * t) по модулю 109. Остаток от деления отрицательного числа в разных языках разный — приведи к 0..108.
===
v, t = map(int, input().split())
print((v * t) % 109)
===

## p-008 | Високосный год | Условия | 1
Выведи YES, если год високосный (делится на 4 и не на 100, или делится на 400), иначе NO.
in: 2024
out: YES
in: 2100
out: NO
in: 2000
out: YES
in: 2023
out: NO
hint: (y % 4 == 0 and y % 100 != 0) or y % 400 == 0
===
y = int(input())
print("YES" if (y % 4 == 0 and y % 100 != 0) or y % 400 == 0 else "NO")
===

## p-009 | Знак числа | Условия | 1
Выведи 1, если число положительное, -1 — если отрицательное, 0 — если ноль.
in: 7
out: 1
in: -100
out: -1
in: 0
out: 0
hint: Цепочка if / elif / else.
===
n = int(input())
print(1 if n > 0 else -1 if n < 0 else 0)
===

## p-010 | Ход ладьи | Условия | 1
Даны координаты двух клеток шахматной доски (x1 y1 x2 y2, от 1 до 8). Может ли ладья за один ход перейти с первой на вторую? Выведи YES или NO.
in: 4 4 5 5
out: NO
in: 4 4 4 8
out: YES
in: 1 1 8 1
out: YES
hint: Ладья ходит по горизонтали или вертикали: совпадает x или y (но клетки разные).
===
x1, y1, x2, y2 = map(int, input().split())
print("YES" if (x1 == x2) != (y1 == y2) else "NO")
===

## p-011 | Ход коня | Условия | 1
Может ли конь за один ход перейти с клетки (x1, y1) на (x2, y2)? Выведи YES или NO.
in: 1 1 2 3
out: YES
in: 1 1 3 3
out: NO
in: 4 4 2 5
out: YES
hint: Разности по модулю — 1 и 2 в любом порядке.
===
x1, y1, x2, y2 = map(int, input().split())
dx, dy = abs(x1 - x2), abs(y1 - y2)
print("YES" if sorted((dx, dy)) == [1, 2] else "NO")
===

## p-012 | Шоколадка | Условия | 2
Шоколадка n × m долек. Можно ли одним разломом по прямой отломить ровно k долек? Выведи YES или NO.
in: 4 2 6
out: YES
in: 2 10 7
out: NO
in: 3 3 9
out: NO
hint: Отломить можно k = a·m (a полосок по m) или k = b·n, при этом k < n·m.
===
n, m, k = map(int, input().split())
print("YES" if k < n * m and (k % n == 0 or k % m == 0) else "NO")
===

## p-013 | Треугольник | Условия | 1
Даны три натуральных числа. Существует ли невырожденный треугольник с такими сторонами? Выведи YES или NO.
in: 3 4 5
out: YES
in: 1 2 3
out: NO
in: 7 7 7
out: YES
hint: Каждая сторона строго меньше суммы двух других.
===
a, b, c = map(int, input().split())
print("YES" if a < b + c and b < a + c and c < a + b else "NO")
===

## p-014 | Тип треугольника | Условия | 2
Даны три стороны треугольника (он существует). Выведи rectangular, acute или obtuse — прямоугольный, остроугольный или тупоугольный.
in: 3 4 5
out: rectangular
in: 5 5 5
out: acute
in: 2 3 4
out: obtuse
hint: Отсортируй стороны; сравни c² с a² + b².
===
a, b, c = sorted(map(int, input().split()))
s, t = a * a + b * b, c * c
print("rectangular" if s == t else "acute" if s > t else "obtuse")
===

## p-015 | Сумма от 1 до n | Циклы | 1
Дано n (до 10^9). Выведи сумму 1 + 2 + … + n. Подумай, как обойтись без цикла.
in: 10
out: 55
in: 1
out: 1
in: 1000000000
out: 500000000500000000
hint: Формула n·(n + 1) / 2.
===
n = int(input())
print(n * (n + 1) // 2)
===

## p-016 | Количество делителей | Циклы | 1
Дано n (до 10^12). Выведи количество его натуральных делителей.
in: 12
out: 6
in: 1
out: 1
in: 1000000000000
out: 169
hint: Перебирай d до √n: каждый делитель d даёт пару n / d (при d·d = n — один).
===
n = int(input())
c, d = 0, 1
while d * d <= n:
    if n % d == 0:
        c += 1 if d * d == n else 2
    d += 1
print(c)
===

## p-017 | Сумма цифр | Циклы | 1
Дано целое число (может быть отрицательным, до 10^18). Выведи сумму его цифр.
in: 12345
out: 15
in: -909
out: 18
in: 0
out: 0
hint: Возьми модуль; отделяй цифры через % 10 и / 10.
===
n = abs(int(input()))
s = 0
while n:
    s += n % 10
    n //= 10
print(s)
===

## p-018 | Степень двойки | Циклы | 1
Дано натуральное n. Выведи YES, если оно — точная степень двойки (1, 2, 4, 8…), иначе NO.
in: 64
out: YES
in: 1
out: YES
in: 96
out: NO
hint: Дели на 2, пока делится; в конце должна остаться 1. (Или n & (n - 1) == 0.)
===
n = int(input())
print("YES" if n & (n - 1) == 0 else "NO")
===

## p-019 | Максимум последовательности | Циклы | 1
В одной строке даны числа, последнее — 0 (оно не входит в последовательность). Выведи максимум и сколько раз он встретился.
in: 1 7 9 0
out: 9 1
in: 2 9 9 3 9 0
out: 9 3
in: -5 -1 -1 0
out: -1 2
hint: При новом максимуме сбрасывай счётчик в 1, при равенстве — увеличивай.
===
a = list(map(int, input().split()))
a = a[: a.index(0)]
m = max(a)
print(m, a.count(m))
===

## p-020 | Банковский вклад | Циклы | 2
Вклад x рублей, каждый год растёт на p процентов (копейки отбрасываются). Через сколько лет вклад станет не меньше y?
in: 100 10 200
out: 8
in: 1000 1 1000
out: 0
in: 50 100 1000
out: 5
hint: Работай в копейках: каждый год x = x · (100 + p) / 100 (целочисленно).
===
x, p, y = map(int, input().split())
x *= 100
y *= 100
years = 0
while x < y:
    x = x * (100 + p) // 100
    years += 1
print(years)
===

## p-021 | Число в обратном порядке | Циклы | 1
Дано натуральное число. Выведи его цифры в обратном порядке (ведущие нули результата не убирать: 1200 → 0021).
in: 1234
out: 4321
in: 1200
out: 0021
in: 7
out: 7
hint: Это проще всего строкой: развернуть её.
===
print(input().strip()[::-1])
===

## p-022 | Простое ли? | Циклы | 1
Дано n (до 10^12). Выведи YES, если оно простое, иначе NO.
in: 17
out: YES
in: 1
out: NO
in: 999999000001
out: YES
hint: Проверяй делители до √n. 1 — не простое.
===
n = int(input())
ok = n > 1
d = 2
while ok and d * d <= n:
    if n % d == 0:
        ok = False
    d += 1
print("YES" if ok else "NO")
===

## p-023 | Разложение на множители | Циклы | 2
Разложи n (до 10^12) на простые множители: выведи их по возрастанию через пробел (с повторами).
in: 360
out: 2 2 2 3 3 5
in: 97
out: 97
in: 1000000000000
out: 2 2 2 2 2 2 2 2 2 2 2 2 5 5 5 5 5 5 5 5 5 5 5 5
hint: Дели на d, пока делится, d от 2 до √n; что останется больше 1 — тоже простой множитель.
===
n = int(input())
res = []
d = 2
while d * d <= n:
    while n % d == 0:
        res.append(d)
        n //= d
    d += 1
if n > 1:
    res.append(n)
print(*res)
===

## p-024 | Совершенные числа | Циклы | 2
Выведи все совершенные числа от 1 до n (n до 10^5): число равно сумме своих делителей, кроме себя. Если таких нет — NONE.
in: 30
out: 6 28
in: 5
out: NONE
in: 10000
out: 6 28 496 8128
hint: Для каждого числа считай сумму делителей до √x.
===
n = int(input())
res = []
for x in range(2, n + 1):
    s, d = 1, 2
    while d * d <= x:
        if x % d == 0:
            s += d
            if d * d != x:
                s += x // d
        d += 1
    if s == x:
        res.append(x)
print(*res if res else ["NONE"])
===

## p-025 | Палиндром | Строки | 1
Дана строка из латинских букв. Выведи YES, если она палиндром, иначе NO.
in: level
out: YES
in: abca
out: NO
in: a
out: YES
hint: Сравни строку с её разворотом.
===
s = input().strip()
print("YES" if s == s[::-1] else "NO")
===

## p-026 | Количество слов | Строки | 1
Дана строка. Выведи количество слов в ней (слова разделены одним или несколькими пробелами).
in: Hello   world from  Kamado
out: 4
in: one
out: 1
in:    lots   of   spaces
out: 3
hint: Разбей строку по пробелам, пустые куски не считай.
===
print(len(input().split()))
===

## p-027 | Самое длинное слово | Строки | 1
Дана строка слов через пробел. Выведи самое длинное слово (первое из равных) и его длину.
in: я учусь программировать каждый день
out: программировать 15
in: a bb cc
out: bb 2
hint: Пройди по словам и запоминай лучшее только при строго большей длине.
===
words = input().split()
best = words[0]
for w in words:
    if len(w) > len(best):
        best = w
print(best, len(best))
===

## p-028 | Замена слова | Строки | 1
Дана строка, затем слово a и слово b. Замени все вхождения подстроки a на b.
in: мама мыла раму мама\nмама\nпапа
out: папа мыла раму папа
in: aaaa\naa\nb
out: bb
hint: Стандартная функция замены (replace) заменяет непересекающиеся вхождения слева направо.
===
s = input()
a = input()
b = input()
print(s.replace(a, b))
===

## p-029 | Сжатие строки | Строки | 2
Сожми строку: подряд идущие одинаковые символы замени на символ и число повторов, если повторов больше одного. aaabccdddd → a3bc2d4.
in: aaabccdddd
out: a3bc2d4
in: abc
out: abc
in: zzzzzzzzzzzz
out: z12
hint: Иди по строке, считай длину текущей серии.
===
s = input().strip()
out = []
i = 0
while i < len(s):
    j = i
    while j < len(s) and s[j] == s[i]:
        j += 1
    out.append(s[i] + (str(j - i) if j - i > 1 else ""))
    i = j
print("".join(out))
===

## p-030 | Анаграммы | Строки | 1
Даны два слова. Выведи YES, если они анаграммы (одни и те же буквы в любом порядке), иначе NO.
in: listen\nsilent
out: YES
in: abc\nabd
out: NO
in: aab\nabb
out: NO
hint: Отсортируй буквы обоих слов и сравни.
===
a = input().strip()
b = input().strip()
print("YES" if sorted(a) == sorted(b) else "NO")
===

## p-031 | Подсчёт символов | Строки | 2
Дана строка. Выведи количество цифр, латинских букв и остальных символов (пробелы тоже остальные) через пробел.
in: Hello, World 2026!
out: 4 10 4
in: 123
out: 3 0 0
hint: Для каждого символа проверь, цифра ли он и буква ли (только a–z, A–Z).
===
s = input()
d = sum(c.isdigit() for c in s)
l = sum(("a" <= c <= "z") or ("A" <= c <= "Z") for c in s)
print(d, l, len(s) - d - l)
===

## p-032 | Шифр Цезаря | Строки | 2
Дано число k и строка из строчных латинских букв и пробелов. Сдвинь каждую букву на k вперёд по алфавиту (по кругу), пробелы оставь.
in: 3\nhello world
out: khoor zruog
in: 25\nabc
out: zab
in: 52\nxyz
out: xyz
hint: Новая буква — 'a' + (буква − 'a' + k) mod 26.
===
k = int(input())
s = input()
print("".join(chr((ord(c) - 97 + k) % 26 + 97) if c != " " else c for c in s))
===

## p-033 | Скобки | Строки | 2
Дана строка из скобок (), [], {}. Выведи YES, если последовательность правильная, иначе NO.
in: ([]{})
out: YES
in: ([)]
out: NO
in: ((
out: NO
hint: Стек открывающих скобок.
===
s = input().strip()
pairs = {")": "(", "]": "[", "}": "{"}
st = []
ok = True
for c in s:
    if c in "([{":
        st.append(c)
    elif not st or st.pop() != pairs[c]:
        ok = False
        break
print("YES" if ok and not st else "NO")
===

## p-034 | Подстрока-палиндром | Строки | 3
Дана строка (длина до 2000). Выведи самую длинную её подстроку-палиндром (первую слева из самых длинных).
in: babad
out: bab
in: cbbd
out: bb
in: a
out: a
hint: Расширяйся из каждого центра (символ и промежуток между символами).
===
s = input().strip()
best = s[0]
for c in range(len(s)):
    for l, r in ((c, c), (c, c + 1)):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        if r - l - 1 > len(best):
            best = s[l + 1:r]
print(best)
===

## p-035 | Время в словах | Строки | 2
Дано время HH:MM (24 часа). Выведи его в 12-часовом формате с AM/PM: 00:15 → 12:15 AM, 13:05 → 1:05 PM, 12:00 → 12:00 PM.
in: 00:15
out: 12:15 AM
in: 13:05
out: 1:05 PM
in: 12:00
out: 12:00 PM
in: 23:59
out: 11:59 PM
hint: Часы h: AM при h < 12. Час на 12-часовых — h % 12, а 0 превращается в 12.
===
h, m = map(int, input().split(":"))
suf = "AM" if h < 12 else "PM"
hh = h % 12 or 12
print(f"{hh}:{m:02d} {suf}")
===

## p-036 | Чётные индексы | Массивы | 1
Дано n и n чисел. Выведи элементы с чётными индексами (0, 2, 4…).
in: 5\n1 2 3 4 5
out: 1 3 5
in: 1\n9
out: 9
hint: Цикл с шагом 2.
===
n = int(input())
a = input().split()
print(*a[::2])
===

## p-037 | Больше соседей | Массивы | 1
Дано n и n чисел. Сколько элементов больше обоих своих соседей (крайние не считаются)?
in: 5\n1 5 2 6 3
out: 2
in: 3\n1 2 3
out: 0
in: 2\n5 1
out: 0
hint: Цикл от второго до предпоследнего.
===
n = int(input())
a = list(map(int, input().split()))
print(sum(1 for i in range(1, n - 1) if a[i - 1] < a[i] > a[i + 1]))
===

## p-038 | Одинаковые соседи | Массивы | 1
Дано n и n чисел. Выведи YES, если в массиве есть два соседних элемента с одинаковым знаком (оба > 0 или оба < 0), иначе NO. Нули знака не имеют.
in: 5\n-1 2 -3 4 5
out: YES
in: 4\n1 -1 1 -1
out: NO
in: 3\n0 0 1
out: NO
hint: Произведение двух соседей > 0 — значит, знаки одинаковые.
===
n = int(input())
a = list(map(int, input().split()))
print("YES" if any(a[i] * a[i + 1] > 0 for i in range(n - 1)) else "NO")
===

## p-039 | Циклический сдвиг | Массивы | 1
Дано n, n чисел и k. Сдвинь массив циклически вправо на k позиций (k может быть больше n или отрицательным — тогда влево).
in: 5\n1 2 3 4 5\n2
out: 4 5 1 2 3
in: 3\n1 2 3\n-1
out: 2 3 1
in: 4\n1 2 3 4\n10
out: 3 4 1 2
hint: Возьми k по модулю n; результат — последние k элементов, затем остальные.
===
n = int(input())
a = input().split()
k = int(input()) % n
print(*(a[n - k:] + a[:n - k]))
===

## p-040 | Уникальные элементы | Массивы | 1
Дано n и n чисел. Выведи элементы, которые встречаются ровно один раз, в порядке появления (или NONE).
in: 7\n1 2 2 3 4 4 5
out: 1 3 5
in: 2\n7 7
out: NONE
hint: Сначала посчитай, сколько раз встречается каждое число.
===
from collections import Counter
n = int(input())
a = input().split()
c = Counter(a)
r = [x for x in a if c[x] == 1]
print(*r if r else ["NONE"])
===

## p-041 | Самая длинная серия | Массивы | 2
Дано n и n чисел. Найди длину самой длинной строго возрастающей серии подряд идущих элементов.
in: 8\n1 2 3 1 2 3 4 0
out: 4
in: 3\n5 4 3
out: 1
in: 1\n7
out: 1
hint: Текущая длина растёт, пока a[i] > a[i − 1], иначе сбрасывается в 1.
===
n = int(input())
a = list(map(int, input().split()))
best = cur = 1
for i in range(1, n):
    cur = cur + 1 if a[i] > a[i - 1] else 1
    best = max(best, cur)
print(best)
===

## p-042 | Второй максимум | Массивы | 2
Дано n и n чисел. Выведи второй по величине различный элемент или NONE.
in: 5\n4 9 2 9 7
out: 7
in: 3\n5 5 5
out: NONE
in: 2\n1 2
out: 1
hint: Отсортируй уникальные значения.
===
n = int(input())
u = sorted(set(map(int, input().split())))
print(u[-2] if len(u) > 1 else "NONE")
===

## p-043 | Матрица по спирали | Массивы | 3
Дано n и m. Заполни матрицу n×m числами 1..n·m по спирали по часовой стрелке и выведи её.
in: 3 4
out: 1 2 3 4\n10 11 12 5\n9 8 7 6
in: 1 1
out: 1
in: 4 2
out: 1 2\n8 3\n7 4\n6 5
hint: Двигайся, пока впереди свободная клетка внутри матрицы, иначе поверни направо.
===
n, m = map(int, input().split())
a = [[0] * m for _ in range(n)]
dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]
x = y = d = 0
for k in range(1, n * m + 1):
    a[x][y] = k
    nx, ny = x + dirs[d][0], y + dirs[d][1]
    if not (0 <= nx < n and 0 <= ny < m and a[nx][ny] == 0):
        d = (d + 1) % 4
        nx, ny = x + dirs[d][0], y + dirs[d][1]
    x, y = nx, ny
for row in a:
    print(*row)
===

## p-044 | Седловые точки | Массивы | 3
Дана матрица n×m. Выведи количество элементов, которые одновременно минимальны в своей строке и максимальны в своём столбце.
in: 3 3\n1 2 3\n4 5 6\n7 8 9
out: 1
in: 2 2\n5 5\n5 5
out: 4
in: 2 3\n3 1 2\n4 0 5
out: 1
hint: Заранее посчитай минимумы строк и максимумы столбцов.
===
n, m = map(int, input().split())
a = [list(map(int, input().split())) for _ in range(n)]
rmin = [min(r) for r in a]
cmax = [max(c) for c in zip(*a)]
print(sum(1 for i in range(n) for j in range(m) if a[i][j] == rmin[i] == cmax[j]))
===

## p-045 | Сортировка по убыванию | Сортировка | 1
Дано n и n чисел. Выведи их по убыванию.
in: 5\n3 1 4 1 5
out: 5 4 3 1 1
in: 1\n0
out: 0
hint: Стандартная сортировка с обратным порядком.
===
n = int(input())
print(*sorted(map(int, input().split()), reverse=True))
===

## p-046 | Сортировка по последней цифре | Сортировка | 2
Дано n и n натуральных чисел. Отсортируй по последней цифре, а при равенстве — по самому числу.
in: 6\n15 22 13 33 5 40
out: 40 22 13 33 5 15
in: 3\n9 19 29
out: 9 19 29
hint: Ключ сортировки — пара (x % 10, x).
===
n = int(input())
a = list(map(int, input().split()))
print(*sorted(a, key=lambda x: (x % 10, x)))
===

## p-047 | Олимпиада | Сортировка | 2
Дано n участников: «фамилия баллы». Выведи их по убыванию баллов, при равенстве — по фамилии в алфавитном порядке.
in: 4\nivanov 90\npetrov 100\nsidorov 90\nadamov 50
out: petrov 100\nivanov 90\nsidorov 90\nadamov 50
in: 1\nx 0
out: x 0
hint: Сортировка по ключу (−баллы, фамилия).
===
n = int(input())
p = [input().split() for _ in range(n)]
for name, s in sorted(p, key=lambda x: (-int(x[1]), x[0])):
    print(name, s)
===

## p-048 | Объединение отрезков | Сортировка | 2
Дано n отрезков «l r». Объедини пересекающиеся (касание тоже) и выведи результат, отсортированный по левому концу.
in: 4\n1 3\n2 6\n8 10\n10 12
out: 1 6\n8 12
in: 2\n5 6\n1 2
out: 1 2\n5 6
in: 3\n1 10\n2 3\n4 5
out: 1 10
hint: Отсортируй по l; если очередной отрезок начинается не позже конца текущего — расширяй текущий.
===
n = int(input())
s = sorted(tuple(map(int, input().split())) for _ in range(n))
res = []
for l, r in s:
    if res and l <= res[-1][1]:
        res[-1][1] = max(res[-1][1], r)
    else:
        res.append([l, r])
for l, r in res:
    print(l, r)
===

## p-049 | Минимальная разница | Сортировка | 2
Дано n чисел. Найди минимальную разность между двумя различными элементами массива (по позициям).
in: 5\n10 3 7 20 8
out: 1
in: 2\n5 5
out: 0
in: 3\n-10 0 100
out: 10
hint: После сортировки ближайшие стоят рядом.
===
n = int(input())
a = sorted(map(int, input().split()))
print(min(a[i + 1] - a[i] for i in range(n - 1)))
===

## p-050 | Число инверсий | Сортировка | 3
Дано n (до 10^5) и перестановка/массив. Посчитай число пар i < j с a[i] > a[j].
in: 5\n2 4 1 3 5
out: 3
in: 4\n4 3 2 1
out: 6
in: 3\n1 1 1
out: 0
hint: Сортировка слиянием: при взятии элемента из правой половины прибавляй число оставшихся в левой.
===
import sys
sys.setrecursionlimit(10000)
def ms(a):
    if len(a) <= 1:
        return a, 0
    m = len(a) // 2
    l, x = ms(a[:m])
    r, y = ms(a[m:])
    res, i, j, inv = [], 0, 0, x + y
    while i < len(l) and j < len(r):
        if l[i] <= r[j]:
            res.append(l[i]); i += 1
        else:
            res.append(r[j]); j += 1
            inv += len(l) - i
    return res + l[i:] + r[j:], inv
input()
print(ms(list(map(int, input().split())))[1])
===

## p-051 | Наибольшее число | Сортировка | 3
Даны n неотрицательных чисел. Составь из них (склеив в некотором порядке) наибольшее число.
in: 5\n3 30 34 5 9
out: 9534330
in: 2\n0 0
out: 0
in: 3\n10 2 1
out: 2110
hint: Сравнивай пары: a идёт раньше b, если a+b > b+a как строки. Если результат начинается с 0 — это 0.
===
from functools import cmp_to_key
input()
a = input().split()
a.sort(key=cmp_to_key(lambda x, y: -1 if x + y > y + x else (1 if x + y < y + x else 0)))
r = "".join(a).lstrip("0")
print(r or "0")
===

## p-052 | Двоичный поиск | Бинпоиск | 1
Дан отсортированный массив из n чисел и q запросов. Для каждого запроса выведи YES, если число есть в массиве, иначе NO.
in: 5\n1 3 5 7 9\n3\n3 4 9
out: YES\nNO\nYES
in: 1\n0\n2\n0 1
out: YES\nNO
hint: Классический бинпоиск или bisect_left.
===
from bisect import bisect_left
n = int(input())
a = list(map(int, input().split()))
q = int(input())
for x in map(int, input().split()):
    i = bisect_left(a, x)
    print("YES" if i < n and a[i] == x else "NO")
===

## p-053 | Первое и последнее вхождение | Бинпоиск | 2
Дан отсортированный массив и число x. Выведи индексы (с 1) первого и последнего вхождения x или 0, если x нет.
in: 7\n1 2 2 2 3 5 5\n2
out: 2 4
in: 3\n1 2 3\n4
out: 0
in: 1\n7\n7
out: 1 1
hint: Левая граница — bisect_left, правая — bisect_right − 1.
===
from bisect import bisect_left, bisect_right
n = int(input())
a = list(map(int, input().split()))
x = int(input())
l, r = bisect_left(a, x), bisect_right(a, x)
print(f"{l + 1} {r}" if l < r else 0)
===

## p-054 | Ближайшее число | Бинпоиск | 2
Дан отсортированный массив и q запросов x. Для каждого выведи ближайший к x элемент массива (при равенстве — меньший).
in: 5\n1 3 5 7 9\n4\n0 4 6 100
out: 1 3 5 9
in: 1\n5\n1\n5
out: 5
hint: Найди позицию вставки и сравни соседей слева и справа.
===
from bisect import bisect_left
n = int(input())
a = list(map(int, input().split()))
q = int(input())
res = []
for x in map(int, input().split()):
    i = bisect_left(a, x)
    cand = [a[j] for j in (i - 1, i) if 0 <= j < n]
    res.append(min(cand, key=lambda v: (abs(v - x), v)))
print(*res)
===

## p-055 | Корень из числа | Бинпоиск | 2
Дано n (до 10^18). Выведи целую часть квадратного корня, не используя функцию корня.
in: 17
out: 4
in: 1000000000000000000
out: 1000000000
in: 0
out: 0
hint: Наибольшее x с x·x ≤ n — бинпоиском по ответу.
===
n = int(input())
lo, hi = 0, 2 * 10**9
while lo < hi:
    m = (lo + hi + 1) // 2
    if m * m <= n:
        lo = m
    else:
        hi = m - 1
print(lo)
===

## p-056 | Дипломы | Бинпоиск | 2
Есть n дипломов w × h. Их вешают на квадратную доску без поворотов и наложений. Найди минимальную сторону доски.
in: 2 3 10
out: 9
in: 1 1 1
out: 1
in: 3 5 7
out: 12
hint: На доску стороны s влезает (s / w) · (s / h) дипломов. Бинпоиск по s.
===
w, h, n = map(int, input().split())
lo, hi = 0, max(w, h) * n
while lo < hi:
    s = (lo + hi) // 2
    if (s // w) * (s // h) >= n:
        hi = s
    else:
        lo = s + 1
print(lo)
===

## p-057 | Верёвочки | Бинпоиск | 3
Есть n верёвок длины a_i. Нужно нарезать k кусков одинаковой целой длины L (можно оставить обрезки). Найди максимальное L (0, если нельзя).
in: 4 11\n802 743 457 539
out: 200
in: 1 5\n4
out: 0
in: 2 2\n10 3
out: 5
hint: Проверка: сумма a_i / L ≥ k. Бинпоиск по L от 1 до max(a).
===
n, k = map(int, input().split())
a = list(map(int, input().split()))
lo, hi = 0, max(a)
while lo < hi:
    m = (lo + hi + 1) // 2
    if sum(x // m for x in a) >= k:
        lo = m
    else:
        hi = m - 1
print(lo)
===

## p-058 | Коровы в стойла | Бинпоиск | 3
n стойл с координатами (отсортированы) и k коров. Расставь коров так, чтобы минимальное расстояние между соседними было максимальным. Выведи его.
in: 6 3\n2 5 7 11 15 20
out: 9
in: 2 2\n0 100
out: 100
in: 5 5\n1 2 3 4 5
out: 1
hint: Жадная проверка для расстояния d: ставь корову в каждое стойло, удалённое от предыдущей на ≥ d.
===
n, k = map(int, input().split())
a = list(map(int, input().split()))
def can(d):
    cnt, last = 1, a[0]
    for x in a[1:]:
        if x - last >= d:
            cnt += 1
            last = x
    return cnt >= k
lo, hi = 0, a[-1] - a[0]
while lo < hi:
    m = (lo + hi + 1) // 2
    if can(m):
        lo = m
    else:
        hi = m - 1
print(lo)
===

## p-059 | Сумма на отрезке | Префиксные суммы | 1
Дан массив из n чисел и q запросов «l r» (с 1). Для каждого выведи сумму a[l..r].
in: 5 3\n1 2 3 4 5\n1 5\n2 3\n5 5
out: 15\n5\n5
in: 1 1\n-7\n1 1
out: -7
hint: pref[i] — сумма первых i элементов; ответ pref[r] − pref[l − 1].
===
from itertools import accumulate
n, q = map(int, input().split())
p = [0] + list(accumulate(map(int, input().split())))
for _ in range(q):
    l, r = map(int, input().split())
    print(p[r] - p[l - 1])
===

## p-060 | Равновесие | Префиксные суммы | 2
Дан массив. Найди первый индекс (с 1), где сумма слева равна сумме справа (сам элемент не входит), или -1.
in: 7\n1 7 3 6 5 6 0
out: 4
in: 3\n1 2 3
out: -1
in: 1\n5
out: 1
hint: Сумма справа = общая − слева − текущий.
===
n = int(input())
a = list(map(int, input().split()))
total, left = sum(a), 0
ans = -1
for i, x in enumerate(a):
    if left == total - left - x:
        ans = i + 1
        break
    left += x
print(ans)
===

## p-061 | Отрезки с суммой k | Префиксные суммы | 3
Дано n чисел (могут быть отрицательными) и k. Сколько подотрезков имеют сумму ровно k?
in: 5 3\n1 2 1 -1 3
out: 5
in: 3 0\n0 0 0
out: 6
in: 4 10\n1 2 3 4
out: 1
hint: Словарь «префиксная сумма → сколько раз была»; для текущей суммы p прибавляй cnt[p − k].
===
from collections import defaultdict
n, k = map(int, input().split())
cnt = defaultdict(int)
cnt[0] = 1
p = ans = 0
for x in map(int, input().split()):
    p += x
    ans += cnt[p - k]
    cnt[p] += 1
print(ans)
===

## p-062 | Пары с суммой | Два указателя | 2
Дан отсортированный массив различных чисел и x. Сколько пар i < j дают сумму x?
in: 6 7\n1 2 3 4 5 6
out: 3
in: 3 100\n1 2 3
out: 0
hint: Указатели с двух концов: сумма мала — левый вправо, велика — правый влево.
===
n, x = map(int, input().split())
a = list(map(int, input().split()))
i, j, c = 0, n - 1, 0
while i < j:
    s = a[i] + a[j]
    if s == x:
        c += 1; i += 1; j -= 1
    elif s < x:
        i += 1
    else:
        j -= 1
print(c)
===

## p-063 | Отрезок с суммой не больше S | Два указателя | 2
Дано n положительных чисел и S. Найди длину самого длинного подотрезка с суммой не больше S.
in: 7 4\n1 2 1 0 1 1 0
out: 5
in: 3 1\n5 5 5
out: 0
in: 4 100\n1 2 3 4
out: 4
hint: Скользящее окно: двигай правый край, а левый подтягивай, пока сумма > S.
===
n, s = map(int, input().split())
a = list(map(int, input().split()))
l = cur = best = 0
for r in range(n):
    cur += a[r]
    while cur > s:
        cur -= a[l]
        l += 1
    best = max(best, r - l + 1)
print(best)
===

## p-064 | Без повторов | Два указателя | 3
Дана строка. Найди длину самой длинной подстроки без повторяющихся символов.
in: abcabcbb
out: 3
in: bbbbb
out: 1
in: pwwkew
out: 3
hint: Окно с множеством символов; при повторе сдвигай левый край, пока повтор не уйдёт.
===
s = input().strip()
seen = {}
l = best = 0
for r, c in enumerate(s):
    if c in seen and seen[c] >= l:
        l = seen[c] + 1
    seen[c] = r
    best = max(best, r - l + 1)
print(best)
===

## p-065 | Слияние массивов | Два указателя | 1
Даны два отсортированных массива. Слей их в один отсортированный.
in: 3\n1 4 9\n4\n2 3 10 11
out: 1 2 3 4 9 10 11
in: 1\n5\n1\n5
out: 5 5
hint: Два указателя: каждый раз бери меньший из текущих элементов.
===
input()
a = list(map(int, input().split()))
input()
b = list(map(int, input().split()))
i = j = 0
r = []
while i < len(a) and j < len(b):
    if a[i] <= b[j]:
        r.append(a[i]); i += 1
    else:
        r.append(b[j]); j += 1
print(*(r + a[i:] + b[j:]))
===

## p-066 | Частоты слов | Словари | 1
Дан текст (одна строка). Выведи каждое слово и сколько раз оно встретилось, в алфавитном порядке.
in: the cat and the dog and the bird
out: and 2\nbird 1\ncat 1\ndog 1\nthe 3
in: a
out: a 1
hint: Словарь-счётчик и сортировка ключей.
===
from collections import Counter
for w, c in sorted(Counter(input().split()).items()):
    print(w, c)
===

## p-067 | Синонимы | Словари | 1
Дано n пар синонимов, затем слово. Выведи его синоним (связь в обе стороны).
in: 3\nhello hi\nbye goodbye\nbig large\ngoodbye
out: bye
in: 1\na b\na
out: b
hint: Положи в словарь пару в обе стороны.
===
n = int(input())
d = {}
for _ in range(n):
    a, b = input().split()
    d[a] = b
    d[b] = a
print(d[input().strip()])
===

## p-068 | Общие элементы | Множества | 1
Даны два списка чисел. Выведи по возрастанию числа, которые есть в обоих (без повторов), или NONE.
in: 1 2 3 4 5\n4 5 6 7
out: 4 5
in: 1 1\n2
out: NONE
hint: Пересечение множеств.
===
a = set(input().split())
b = set(input().split())
r = sorted(map(int, a & b))
print(*r if r else ["NONE"])
===

## p-069 | Встречалось ли раньше | Множества | 1
Дана последовательность чисел. Для каждого выведи YES, если оно уже встречалось раньше, иначе NO.
in: 1 2 3 2 3 4
out: NO\nNO\nNO\nYES\nYES\nNO
in: 5 5 5
out: NO\nYES\nYES
hint: Множество уже увиденных.
===
seen = set()
for x in input().split():
    print("YES" if x in seen else "NO")
    seen.add(x)
===

## p-070 | Выборы | Словари | 2
Дано n строк «кандидат число_голосов» (кандидат может повторяться). Выведи кандидатов в алфавитном порядке с суммой голосов.
in: 5\nmcCain 10\nmcCain 5\nobama 9\nobama 8\nmcCain 1
out: mcCain 16\nobama 17
in: 1\nx 0
out: x 0
hint: Словарь кандидат → сумма.
===
from collections import defaultdict
n = int(input())
d = defaultdict(int)
for _ in range(n):
    k, v = input().split()
    d[k] += int(v)
for k in sorted(d):
    print(k, d[k])
===

## p-071 | Группы анаграмм | Словари | 2
Дан список слов. Выведи группы анаграмм: в каждой группе слова по алфавиту, группы — по алфавиту первого слова, каждая на своей строке.
in: eat tea tan ate nat bat
out: ate eat tea\nbat\nnat tan
in: abc
out: abc
hint: Ключ группы — отсортированные буквы слова.
===
from collections import defaultdict
g = defaultdict(list)
for w in input().split():
    g["".join(sorted(w))].append(w)
for grp in sorted(sorted(v) for v in g.values()):
    print(*grp)
===

## p-072 | Самый частый элемент | Словари | 1
Дано n чисел. Выведи самое частое (при равенстве — наименьшее из самых частых).
in: 7\n1 3 3 2 1 3 1
out: 1
in: 1\n5
out: 5
hint: Счётчик, затем максимум по ключу (−частота, число).
===
from collections import Counter
input()
c = Counter(map(int, input().split()))
print(min(c, key=lambda x: (-c[x], x)))
===

## p-073 | Изоморфные строки | Словари | 2
Даны две строки одинаковой длины. Выведи YES, если одну можно получить из другой взаимно однозначной заменой символов (egg → add), иначе NO.
in: egg\nadd
out: YES
in: foo\nbar
out: NO
in: ab\naa
out: NO
hint: Нужны два словаря: s→t и t→s, и они не должны противоречить.
===
s = input().strip()
t = input().strip()
a, b = {}, {}
ok = len(s) == len(t)
for x, y in zip(s, t):
    if a.setdefault(x, y) != y or b.setdefault(y, x) != x:
        ok = False
print("YES" if ok else "NO")
===

## p-074 | Две суммы | Словари | 2
Дан массив и число x. Найди индексы (с 1) двух разных элементов с суммой x — первую такую пару по второму индексу, затем по первому. Выведи «i j» или -1.
in: 4 9\n2 7 11 15
out: 1 2
in: 3 6\n3 2 4
out: 2 3
in: 2 10\n5 4
out: -1
hint: Иди слева направо и храни в словаре «значение → индекс первого появления»; ищи x − a[j].
===
n, x = map(int, input().split())
a = list(map(int, input().split()))
pos = {}
ans = "-1"
for j, v in enumerate(a):
    if x - v in pos:
        ans = f"{pos[x - v] + 1} {j + 1}"
        break
    pos.setdefault(v, j)
print(ans)
===

## p-075 | Стек команд | Стек и очередь | 1
Команды до end: push x, pop (выведи снятое или error), back (верхний или error), size, clear (выведи ok).
in: push 3\npush 14\nsize\nback\npop\npop\npop\nclear\nend
out: 2\n14\n14\n3\nerror\nok
in: back\npush 1\nclear\nsize\nend
out: error\nok\n0
hint: Обычный список как стек.
===
st = []
while True:
    p = input().split()
    if p[0] == "end":
        break
    if p[0] == "push":
        st.append(p[1])
    elif p[0] == "pop":
        print(st.pop() if st else "error")
    elif p[0] == "back":
        print(st[-1] if st else "error")
    elif p[0] == "size":
        print(len(st))
    elif p[0] == "clear":
        st.clear()
        print("ok")
===

## p-076 | Очередь в столовой | Стек и очередь | 2
Команды до end: come имя (встал в конец), serve (выведи, кого обслужили, или empty), leave имя (ушёл из очереди), size.
in: come anna\ncome bob\ncome eve\nleave bob\nserve\nsize\nserve\nserve\nend
out: anna\n1\neve\nempty
in: serve\nleave x\ncome z\nsize\nend
out: empty\n1
hint: Очередь (deque); для leave подойдёт удаление по значению — очереди короткие.
===
from collections import deque
q = deque()
while True:
    p = input().split()
    if p[0] == "end":
        break
    if p[0] == "come":
        q.append(p[1])
    elif p[0] == "serve":
        print(q.popleft() if q else "empty")
    elif p[0] == "leave":
        if p[1] in q:
            q.remove(p[1])
    elif p[0] == "size":
        print(len(q))
===

## p-077 | Постфиксная запись | Стек и очередь | 2
Вычисли выражение в обратной польской записи (числа и + - * через пробел).
in: 8 9 + 1 7 - *
out: -102
in: 2 3 4 * +
out: 14
in: 5
out: 5
hint: Число — в стек; операция — снять два (сначала правый операнд), посчитать, положить.
===
st = []
for t in input().split():
    if t in "+-*":
        b, a = st.pop(), st.pop()
        st.append(a + b if t == "+" else a - b if t == "-" else a * b)
    else:
        st.append(int(t))
print(st[-1])
===

## p-078 | Ближайший больший справа | Стек и очередь | 3
Для каждого элемента массива выведи ближайший справа элемент, строго больший его, или -1. O(n).
in: 5\n2 1 2 4 3
out: 4 2 4 -1 -1
in: 3\n3 2 1
out: -1 -1 -1
in: 4\n1 1 1 2
out: 2 2 2 -1
hint: Монотонный стек, идём справа налево.
===
n = int(input())
a = list(map(int, input().split()))
res = [-1] * n
st = []
for i in range(n - 1, -1, -1):
    while st and st[-1] <= a[i]:
        st.pop()
    if st:
        res[i] = st[-1]
    st.append(a[i])
print(*res)
===

## p-079 | Минимум в окне | Стек и очередь | 3
Дано n чисел и k. Выведи минимум каждого окна длины k. O(n).
in: 8 3\n1 3 -1 -3 5 3 6 7
out: -1 -3 -3 -3 3 3
in: 3 1\n5 4 3
out: 5 4 3
hint: Дек индексов с возрастающими значениями.
===
from collections import deque
n, k = map(int, input().split())
a = list(map(int, input().split()))
dq, res = deque(), []
for i, x in enumerate(a):
    while dq and a[dq[-1]] >= x:
        dq.pop()
    dq.append(i)
    if dq[0] <= i - k:
        dq.popleft()
    if i >= k - 1:
        res.append(a[dq[0]])
print(*res)
===

## p-080 | Гистограмма | Стек и очередь | 3
Даны высоты n столбцов ширины 1. Найди площадь наибольшего прямоугольника, целиком лежащего внутри гистограммы.
in: 7\n2 1 4 5 1 3 3
out: 8
in: 1\n7
out: 7
in: 4\n2 2 2 2
out: 8
hint: Монотонный стек: для каждого столбца — ближайшие меньшие слева и справа.
===
n = int(input())
h = list(map(int, input().split()))
st, best = [], 0
for i in range(n + 1):
    cur = h[i] if i < n else 0
    while st and h[st[-1]] >= cur:
        top = st.pop()
        left = st[-1] if st else -1
        best = max(best, h[top] * (i - left - 1))
    st.append(i)
print(best)
===

## p-081 | Сдача | Жадные | 1
Монеты 1, 2, 5, 10, 50, 100. Выдай сумму n минимальным числом монет: выведи количество.
in: 289
out: 9
in: 0
out: 0
in: 9
out: 3
hint: Бери самую крупную монету, пока можно.
===
n = int(input())
c = 0
for m in (100, 50, 10, 5, 2, 1):
    c += n // m
    n %= m
print(c)
===

## p-082 | Заявки на аудиторию | Жадные | 2
n лекций «начало конец». Выбери максимум непересекающихся (одна может начаться ровно когда закончилась другая). Выведи количество.
in: 5\n1 4\n3 5\n0 6\n5 7\n8 9
out: 3
in: 1\n0 1
out: 1
in: 3\n1 3\n2 3\n3 4
out: 2
hint: Сортируй по концу и бери каждую, что начинается не раньше конца последней взятой.
===
n = int(input())
s = sorted((tuple(map(int, input().split())) for _ in range(n)), key=lambda x: x[1])
end, c = -10**18, 0
for l, r in s:
    if l >= end:
        c += 1
        end = r
print(c)
===

## p-083 | Лодки | Жадные | 2
n человек с весами и лодки грузоподъёмностью L, в лодке не больше двух человек. Минимум лодок?
in: 4 100\n50 50 70 80
out: 3
in: 3 10\n1 2 3
out: 2
in: 1 5\n5
out: 1
hint: Отсортируй; два указателя — самый тяжёлый с самым лёгким, если влезают.
===
n, L = map(int, input().split())
a = sorted(map(int, input().split()))
i, j, c = 0, n - 1, 0
while i <= j:
    if a[i] + a[j] <= L:
        i += 1
    j -= 1
    c += 1
print(c)
===

## p-084 | Заправки | Жадные | 2
Едем по прямой на расстояние D, полного бака хватает на K км, заправки в точках x_i (по возрастанию). Минимальное число заправок или -1.
in: 950 400 4\n200 375 550 750
out: 2
in: 10 3 4\n1 2 5 9
out: -1
in: 5 10 0
out: 0
hint: Доезжай до самой дальней достижимой заправки и заправляйся там.
===
p = list(map(int, input().split()))
D, K, n = p[0], p[1], p[2]
xs = list(map(int, input().split())) if n else []
pts = [0] + xs + [D]
cur = cnt = 0
i = 0
ans = None
while pts[cur] + K < D:
    nxt = cur
    while nxt + 1 < len(pts) and pts[nxt + 1] - pts[cur] <= K:
        nxt += 1
    if nxt == cur:
        ans = -1
        break
    cur = nxt
    cnt += 1
print(cnt if ans is None else ans)
===

## p-085 | Дробный рюкзак | Жадные | 2
Вместимость W и n предметов «вес цена», предметы можно резать. Максимальная цена с 3 знаками.
in: 50 3\n10 60\n20 100\n30 120
out: 240.000
in: 10 1\n20 100
out: 50.000
hint: По убыванию цены за килограмм.
===
W, n = map(int, input().split())
it = sorted((tuple(map(int, input().split())) for _ in range(n)), key=lambda x: -x[1] / x[0])
t = 0.0
for w, c in it:
    take = min(w, W)
    t += c * take / w
    W -= take
print(f"{t:.3f}")
===

## p-086 | Расписание с дедлайнами | Жадные | 3
n заданий «дедлайн очки», каждое занимает 1 день, дни с 1. Набери максимум очков (задание засчитывается, если сделано не позже дедлайна).
in: 4\n2 100\n1 19\n2 27\n1 25
out: 127
in: 3\n1 5\n1 6\n1 7
out: 7
hint: По убыванию очков; ставь задание в самый поздний свободный день ≤ дедлайна.
===
n = int(input())
t = sorted((tuple(map(int, input().split())) for _ in range(n)), key=lambda x: -x[1])
busy = set()
s = 0
for d, p in t:
    day = min(d, n)
    while day > 0 and day in busy:
        day -= 1
    if day > 0:
        busy.add(day)
        s += p
print(s)
===

## p-087 | Минимум отрезков-покрытий | Жадные | 3
Даны отрезок [0, M] и n отрезков. Выбери минимум отрезков, полностью покрывающих [0, M], или -1.
in: 10 4\n0 5\n4 8\n2 4\n7 10
out: 3
in: 5 2\n0 2\n3 5
out: -1
in: 3 1\n-1 4
out: 1
hint: Среди начинающихся не правее покрытой границы выбирай с самым дальним концом.
===
M, n = map(int, input().split())
s = sorted(tuple(map(int, input().split())) for _ in range(n))
cov, i, c = 0, 0, 0
ok = True
while cov < M:
    best = cov
    while i < n and s[i][0] <= cov:
        best = max(best, s[i][1])
        i += 1
    if best == cov:
        ok = False
        break
    cov = best
    c += 1
print(c if ok else -1)
===

## p-088 | Все подмножества | Рекурсия и перебор | 1
Дано n (до 10). Выведи все подмножества {1..n} в лексикографическом порядке (пустое — пустой строкой первым).
in: 3
out: \n1\n1 2\n1 2 3\n1 3\n2\n2 3\n3
in: 1
out: \n1
hint: Рекурсия gen(start, cur): напечатать cur, затем для x от start до n — добавить x и уйти глубже.
===
n = int(input())
def gen(start, cur):
    print(*cur)
    for x in range(start, n + 1):
        cur.append(x)
        gen(x + 1, cur)
        cur.pop()
gen(1, [])
===

## p-089 | Перестановки | Рекурсия и перебор | 1
Дано n (до 8). Выведи все перестановки чисел 1..n в лексикографическом порядке.
in: 3
out: 1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1
in: 1
out: 1
hint: Массив used и рекурсия по позициям.
===
from itertools import permutations
n = int(input())
for p in permutations(range(1, n + 1)):
    print(*p)
===

## p-090 | Скобочные последовательности | Рекурсия и перебор | 2
Дано n. Выведи все правильные скобочные последовательности из n пар круглых скобок в лексикографическом порядке («(» < «)»).
in: 3
out: ((()))\n(()())\n(())()\n()(())\n()()()
in: 1
out: ()
hint: Открыть можно, пока открытых < n; закрыть — пока закрытых < открытых.
===
n = int(input())
def gen(s, o, c):
    if len(s) == 2 * n:
        print(s)
        return
    if o < n:
        gen(s + "(", o + 1, c)
    if c < o:
        gen(s + ")", o, c + 1)
gen("", 0, 0)
===

## p-091 | Разбиения числа | Рекурсия и перебор | 2
Дано n (до 30). Выведи все разбиения n на слагаемые в невозрастающем порядке; разбиения — в лексикографическом порядке по убыванию (сначала само n).
in: 4
out: 4\n3 1\n2 2\n2 1 1\n1 1 1 1
in: 1
out: 1
hint: gen(rest, maxpart, cur): следующее слагаемое — от min(rest, maxpart) вниз до 1.
===
n = int(input())
def gen(rest, mx, cur):
    if rest == 0:
        print(*cur)
        return
    for x in range(min(rest, mx), 0, -1):
        cur.append(x)
        gen(rest - x, x, cur)
        cur.pop()
gen(n, n, [])
===

## p-092 | Подмножество с суммой | Рекурсия и перебор | 2
Дано n чисел (до 20) и S. Сколько подмножеств (по позициям) имеют сумму ровно S?
in: 4 5\n1 2 3 4
out: 2
in: 3 0\n0 0 0
out: 8
in: 2 100\n1 2
out: 0
hint: Перебор масок или рекурсия «брать/не брать».
===
n, s = map(int, input().split())
a = list(map(int, input().split()))
c = 0
for mask in range(1 << n):
    if sum(a[i] for i in range(n) if mask >> i & 1) == s:
        c += 1
print(c)
===

## p-093 | Ферзи | Рекурсия и перебор | 3
Дано n (до 10). Сколько способов расставить n ферзей на доске n×n, чтобы они не били друг друга?
in: 4
out: 2
in: 6
out: 4
in: 8
out: 92
hint: По одному ферзю в строке; массивы занятых столбцов и диагоналей.
===
n = int(input())
col, d1, d2 = set(), set(), set()
cnt = 0
def place(r):
    global cnt
    if r == n:
        cnt += 1
        return
    for c in range(n):
        if c in col or r + c in d1 or r - c in d2:
            continue
        col.add(c); d1.add(r + c); d2.add(r - c)
        place(r + 1)
        col.discard(c); d1.discard(r + c); d2.discard(r - c)
place(0)
print(cnt)
===

## p-094 | Ханойские башни | Рекурсия и перебор | 2
Дано n (до 10). Перенеси башню с стержня 1 на 3. Выведи число ходов, затем ходы «откуда куда».
in: 2
out: 3\n1 2\n1 3\n2 3
in: 3
out: 7\n1 3\n1 2\n3 2\n1 3\n2 1\n2 3\n1 3
hint: Перенести n−1 на вспомогательный, самый большой — на цель, n−1 — на цель.
===
n = int(input())
moves = []
def h(k, a, b, c):
    if k == 0:
        return
    h(k - 1, a, c, b)
    moves.append(f"{a} {b}")
    h(k - 1, c, b, a)
h(n, 1, 3, 2)
print(len(moves))
print("\n".join(moves))
===

## p-095 | Судоку 4×4 | Рекурсия и перебор | 3
Дано судоку 4×4 (0 — пусто): в каждой строке, столбце и квадрате 2×2 цифры 1–4 без повторов. Выведи решение (оно единственное).
in: 1 0 0 0\n0 0 3 0\n0 4 0 0\n0 0 0 2
out: 1 3 2 4\n4 2 3 1\n2 4 1 3\n3 1 4 2
in: 0 0 0 0\n0 0 0 0\n0 0 0 0\n0 0 0 1
out: 1 2 3 4\n3 4 1 2\n2 1 4 3\n4 3 2 1
hint: Найди пустую клетку, перебери цифры, проверь правила, рекурсия; если тупик — откат.
===
g = [list(map(int, input().split())) for _ in range(4)]
def ok(r, c, v):
    if v in g[r] or any(g[i][c] == v for i in range(4)):
        return False
    br, bc = r // 2 * 2, c // 2 * 2
    return all(g[i][j] != v for i in range(br, br + 2) for j in range(bc, bc + 2))
def solve():
    for r in range(4):
        for c in range(4):
            if g[r][c] == 0:
                for v in range(1, 5):
                    if ok(r, c, v):
                        g[r][c] = v
                        if solve():
                            return True
                        g[r][c] = 0
                return False
    return True
solve()
for row in g:
    print(*row)
===

## p-096 | НОД и НОК | Теория чисел | 1
Даны a и b (до 10^9). Выведи НОД и НОК.
in: 12 18
out: 6 36
in: 7 13
out: 1 91
in: 1000000000 999999999
out: 1 999999999000000000
hint: Евклид; НОК = a / НОД · b.
===
from math import gcd
a, b = map(int, input().split())
g = gcd(a, b)
print(g, a // g * b)
===

## p-097 | Решето | Теория чисел | 1
Выведи все простые числа от 2 до n (n до 10^6) — через пробел, но если их больше 20, выведи только количество и последние три.
in: 30
out: 2 3 5 7 11 13 17 19 23 29
in: 2
out: 2
in: 1000000
out: 78498 999961 999979 999983
hint: Решето Эратосфена.
===
n = int(input())
s = bytearray([1]) * (n + 1)
s[0] = s[1] = 0
for i in range(2, int(n ** 0.5) + 1):
    if s[i]:
        s[i * i::i] = bytearray(len(s[i * i::i]))
p = [i for i in range(n + 1) if s[i]]
print(*p if len(p) <= 20 else [len(p)] + p[-3:])
===

## p-098 | Быстрое возведение | Теория чисел | 2
Даны a, n, m (n до 10^18). Выведи a^n mod m, не используя встроенную степень по модулю.
in: 2 10 1000
out: 24
in: 3 1000000000000000000 1000000007
out: 246336683
in: 7 0 1
out: 0
hint: Бинарное возведение: квадрат основания и умножение, когда бит n равен 1.
===
a, n, m = map(int, input().split())
r, a = 1 % m, a % m
while n:
    if n & 1:
        r = r * a % m
    a = a * a % m
    n >>= 1
print(r)
===

## p-099 | Функция Эйлера | Теория чисел | 2
Дано n (до 10^12). Выведи φ(n) — количество чисел от 1 до n, взаимно простых с n.
in: 9
out: 6
in: 1
out: 1
in: 1000000000000
out: 400000000000
hint: φ(n) = n · Π(1 − 1/p) по простым делителям p.
===
n = int(input())
r, m, d = n, n, 2
while d * d <= m:
    if m % d == 0:
        while m % d == 0:
            m //= d
        r -= r // d
    d += 1
if m > 1:
    r -= r // m
print(r)
===

## p-100 | Обратный по модулю | Теория чисел | 3
Даны a и m (m — простое, до 10^9+7, a не делится на m). Выведи x, при котором a·x ≡ 1 (mod m), 0 ≤ x < m.
in: 3 7
out: 5
in: 2 1000000007
out: 500000004
in: 10 17
out: 12
hint: Малая теорема Ферма: x = a^(m−2) mod m.
===
a, m = map(int, input().split())
print(pow(a, m - 2, m))
===

## p-101 | Сочетания по модулю | Теория чисел | 3
Даны n и k (до 10^6). Выведи C(n, k) по модулю 10^9+7.
in: 5 2
out: 10
in: 1000000 500000
out: 996692777
in: 3 5
out: 0
hint: Факториалы и обратные к ним по модулю (Ферма).
===
MOD = 10**9 + 7
n, k = map(int, input().split())
if k < 0 or k > n:
    print(0)
else:
    f = [1] * (n + 1)
    for i in range(1, n + 1):
        f[i] = f[i - 1] * i % MOD
    print(f[n] * pow(f[k], MOD - 2, MOD) % MOD * pow(f[n - k], MOD - 2, MOD) % MOD)
===

## p-102 | Системы счисления | Теория чисел | 1
Дано число n в десятичной системе (до 10^18) и основание b (2..16). Выведи запись n в системе b (цифры больше 9 — заглавными буквами).
in: 255 16
out: FF
in: 10 2
out: 1010
in: 0 7
out: 0
hint: Дели на b и собирай остатки в обратном порядке.
===
n, b = map(int, input().split())
digits = "0123456789ABCDEF"
s = ""
while n:
    s = digits[n % b] + s
    n //= b
print(s or "0")
===

## p-103 | Из любой системы в любую | Теория чисел | 2
Дано основание a, число в системе a (цифры 0–9, A–Z) и основание b (основания 2..36). Выведи число в системе b.
in: 16 FF 2
out: 11111111
in: 2 1010 10
out: 10
in: 36 Z 10
out: 35
hint: Сначала переведи в десятичную, потом в b.
===
a, s, b = input().split()
a, b = int(a), int(b)
n = int(s, a)
dg = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
r = ""
while n:
    r = dg[n % b] + r
    n //= b
print(r or "0")
===

## p-104 | Сумма делителей | Теория чисел | 2
Дано n (до 10^6). Для всех чисел от 1 до n посчитай сумму делителей и выведи сумму этих сумм.
in: 4
out: 15
in: 1
out: 1
in: 1000000
out: 822468118437
hint: Каждое d от 1 до n — делитель ровно n / d чисел: ответ = Σ d · (n / d).
===
n = int(input())
print(sum(d * (n // d) for d in range(1, n + 1)))
===

## p-105 | Диофантово уравнение | Теория чисел | 3
Даны a, b, c (не равные нулю a, b). Найди целые x, y с a·x + b·y = c, где x — наименьшее неотрицательное возможное. Выведи «x y» или NONE.
in: 3 5 7
out: 4 -1
in: 2 4 5
out: NONE
in: 6 9 15
out: 1 1
hint: Расширенный Евклид даёт x0, y0 для НОД; домножь на c / НОД и сдвинь x по модулю b / НОД.
===
def ext(a, b):
    if b == 0:
        return a, 1, 0
    g, x, y = ext(b, a % b)
    return g, y, x - a // b * y
a, b, c = map(int, input().split())
g, x, y = ext(abs(a), abs(b))
if c % g:
    print("NONE")
else:
    x *= c // g * (1 if a > 0 else -1)
    step = abs(b) // g
    x %= step
    y = (c - a * x) // b
    print(x, y)
===

## p-106 | Цифровой корень | Теория чисел | 1
Дано n (до 10^100 — длинное число строкой). Складывай цифры, пока не останется одна цифра. Выведи её.
in: 9875
out: 2
in: 0
out: 0
in: 123456789123456789123456789
out: 9
hint: Ответ — 0 для 0, иначе 1 + (n − 1) mod 9; или просто складывай цифры строки.
===
s = input().strip()
n = sum(map(int, s))
while n >= 10:
    n = sum(map(int, str(n)))
print(n)
===

## p-107 | Кузнечик | Динамика | 1
Кузнечик прыгает по клеткам 1..n вперёд на 1 или 2. Сколькими способами он доберётся из клетки 1 в клетку n? (n до 90)
in: 4
out: 3
in: 1
out: 1
in: 90
out: 2880067194370816120
hint: dp[i] = dp[i−1] + dp[i−2].
===
n = int(input())
a, b = 1, 1
for _ in range(n - 2):
    a, b = b, a + b
print(1 if n <= 2 else b)
===

## p-108 | Кузнечик с монетами | Динамика | 2
На клетках 1..n лежат монеты (могут быть отрицательные). Кузнечик в клетке 1 прыгает на 1..k вперёд, нужно попасть в n. Максимальная сумма собранных монет (монеты клеток 1 и n тоже считаются).
in: 5 2\n0 -1 3 -4 2
out: 5
in: 3 1\n1 2 3
out: 6
in: 4 3\n5 -10 -10 1
out: 6
hint: dp[i] = a[i] + max(dp[i−1..i−k]).
===
n, k = map(int, input().split())
a = list(map(int, input().split()))
dp = [None] * n
dp[0] = a[0]
for i in range(1, n):
    dp[i] = a[i] + max(dp[j] for j in range(max(0, i - k), i))
print(dp[-1])
===

## p-109 | Платная лестница | Динамика | 1
У ступенек 1..n есть цены. Начинаешь на земле (ступенька 0, цена 0), шагаешь на 1 или 2. Минимальная сумма цен, чтобы встать на ступеньку n.
in: 3\n1 2 1
out: 2
in: 1\n5
out: 5
in: 4\n1 100 1 100
out: 102
hint: dp[i] = cost[i] + min(dp[i−1], dp[i−2]).
===
n = int(input())
c = [0] + list(map(int, input().split()))
dp = [0] * (n + 1)
for i in range(1, n + 1):
    dp[i] = c[i] + min(dp[i - 1], dp[i - 2] if i >= 2 else 10**18)
print(dp[n])
===

## p-110 | Без двух единиц подряд | Динамика | 2
Сколько существует строк из 0 и 1 длины n (до 90), в которых нет двух единиц подряд?
in: 3
out: 5
in: 1
out: 2
in: 90
out: 7540113804746346429
hint: dp0[i] — оканчивается на 0, dp1[i] — на 1; dp1[i] = dp0[i−1].
===
n = int(input())
z, o = 1, 1
for _ in range(n - 1):
    z, o = z + o, z
print(z + o)
===

## p-111 | Черепашка | Динамика | 2
Таблица n×m с числами. Из левого верхнего угла в правый нижний, шаги вправо и вниз. Минимальная сумма на пути.
in: 3 3\n1 3 1\n1 5 1\n4 2 1
out: 7
in: 1 1\n7
out: 7
in: 2 3\n1 2 3\n4 5 6
out: 12
hint: dp[i][j] = a[i][j] + min(сверху, слева).
===
n, m = map(int, input().split())
a = [list(map(int, input().split())) for _ in range(n)]
INF = float("inf")
dp = [[INF] * m for _ in range(n)]
for i in range(n):
    for j in range(m):
        best = 0 if i == 0 and j == 0 else min(dp[i - 1][j] if i else INF, dp[i][j - 1] if j else INF)
        dp[i][j] = a[i][j] + best
print(dp[-1][-1])
===

## p-112 | Наибольшая общая подпоследовательность | Динамика | 2
Даны две строки (до 2000). Выведи длину их НОП.
in: ABCBDAB\nBDCABA
out: 4
in: abc\ndef
out: 0
in: same\nsame
out: 4
hint: dp[i][j] = dp[i−1][j−1] + 1 при совпадении, иначе max(dp[i−1][j], dp[i][j−1]).
===
a = input().strip()
b = input().strip()
prev = [0] * (len(b) + 1)
for x in a:
    cur = [0]
    for j, y in enumerate(b):
        cur.append(prev[j] + 1 if x == y else max(prev[j + 1], cur[-1]))
    prev = cur
print(prev[-1])
===

## p-113 | Редакционное расстояние | Динамика | 3
Даны две строки. Минимальное число вставок, удалений и замен символов, чтобы получить из первой вторую.
in: kitten\nsitting
out: 3
in: abc\nabc
out: 0
in: \nabc
out: 3
hint: dp[i][0] = i, dp[0][j] = j; переход — минимум из трёх операций.
===
a = input().strip()
b = input().strip()
prev = list(range(len(b) + 1))
for i, x in enumerate(a, 1):
    cur = [i]
    for j, y in enumerate(b, 1):
        cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
    prev = cur
print(prev[-1])
===

## p-114 | Рюкзак | Динамика | 2
Вместимость W (до 10^4) и n предметов «вес цена» (каждый один). Максимальная цена.
in: 10 4\n5 10\n4 40\n6 30\n3 50
out: 90
in: 4 2\n5 100\n4 1
out: 1
hint: dp[w] по весам с конца.
===
W, n = map(int, input().split())
dp = [0] * (W + 1)
for _ in range(n):
    w, c = map(int, input().split())
    for x in range(W, w - 1, -1):
        dp[x] = max(dp[x], dp[x - w] + c)
print(dp[W])
===

## p-115 | Размен | Динамика | 2
Номиналы монет (бесконечно каждых) и сумма S (до 10^4). Сколькими способами можно набрать S? Порядок монет не важен.
in: 3 5\n1 2 5
out: 4
in: 1 3\n2
out: 0
in: 2 0\n1 2
out: 1
hint: Внешний цикл по монетам, внутренний по суммам вперёд: dp[x] += dp[x − c].
===
n, s = map(int, input().split())
coins = list(map(int, input().split()))
dp = [1] + [0] * s
for c in coins:
    for x in range(c, s + 1):
        dp[x] += dp[x - c]
print(dp[s])
===

## p-116 | Наибольшая возрастающая | Динамика | 3
Дано n (до 10^5) чисел. Найди длину наибольшей строго возрастающей подпоследовательности.
in: 8\n10 9 2 5 3 7 101 18
out: 4
in: 3\n1 1 1
out: 1
in: 5\n5 4 3 2 1
out: 1
hint: Массив «минимальных хвостов» и бинпоиск: O(n log n).
===
from bisect import bisect_left
input()
t = []
for x in map(int, input().split()):
    i = bisect_left(t, x)
    if i == len(t):
        t.append(x)
    else:
        t[i] = x
print(len(t))
===

## p-117 | Максимальная сумма подотрезка | Динамика | 1
Дано n чисел (могут быть отрицательными). Найди максимальную сумму непустого подотрезка.
in: 9\n-2 1 -3 4 -1 2 1 -5 4
out: 6
in: 3\n-3 -1 -2
out: -1
in: 1\n5
out: 5
hint: Кадане: cur = max(x, cur + x).
===
input()
best, cur = -10**18, 0
for x in map(int, input().split()):
    cur = max(x, cur + x)
    best = max(best, cur)
print(best)
===

## p-118 | Грабитель | Динамика | 2
Вдоль улицы n домов с деньгами. Нельзя грабить два соседних. Максимальная сумма.
in: 5\n2 7 9 3 1
out: 12
in: 1\n5
out: 5
in: 4\n2 1 1 2
out: 4
hint: dp[i] = max(dp[i−1], dp[i−2] + a[i]).
===
input()
a = list(map(int, input().split()))
p2, p1 = 0, 0
for x in a:
    p2, p1 = p1, max(p1, p2 + x)
print(p1)
===

## p-119 | Палиндромное разбиение | Динамика | 3
Дана строка (до 1000). Минимальное число разрезов, чтобы каждый кусок был палиндромом.
in: aab
out: 1
in: a
out: 0
in: abcde
out: 4
hint: pal[i][j] — палиндром ли s[i..j]; cut[j] = min(cut[i−1] + 1) по i, где s[i..j] палиндром.
===
s = input().strip()
n = len(s)
pal = [[False] * n for _ in range(n)]
cut = [0] * n
for j in range(n):
    best = j
    for i in range(j + 1):
        if s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1]):
            pal[i][j] = True
            best = 0 if i == 0 else min(best, cut[i - 1] + 1)
    cut[j] = best
print(cut[-1])
===

## p-120 | Перемножение матриц | Динамика | 3
Даны размеры n матриц (n+1 число: d0 d1 … dn, матрица i имеет размер d(i−1)×d(i)). Минимальное число умножений чисел, чтобы перемножить всю цепочку.
in: 3\n10 30 5 60
out: 4500
in: 1\n5 10
out: 0
in: 4\n40 20 30 10 30
out: 26000
hint: dp[i][j] = min по k (dp[i][k] + dp[k+1][j] + d[i−1]·d[k]·d[j]), по возрастанию длины.
===
n = int(input())
d = list(map(int, input().split()))
dp = [[0] * (n + 1) for _ in range(n + 1)]
for length in range(2, n + 1):
    for i in range(1, n - length + 2):
        j = i + length - 1
        dp[i][j] = min(dp[i][k] + dp[k + 1][j] + d[i - 1] * d[k] * d[j] for k in range(i, j))
print(dp[1][n])
===

## p-121 | Компоненты связности | Графы | 1
Дан неориентированный граф: n m и m рёбер. Выведи количество компонент связности.
in: 6 3\n1 2\n2 3\n5 6
out: 3
in: 3 0
out: 3
in: 4 4\n1 2\n2 3\n3 4\n4 1
out: 1
hint: Обход DFS/BFS из каждой непосещённой вершины.
===
n, m = map(int, input().split())
g = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v = map(int, input().split())
    g[u].append(v)
    g[v].append(u)
used = [False] * (n + 1)
c = 0
for s in range(1, n + 1):
    if not used[s]:
        c += 1
        st = [s]
        used[s] = True
        while st:
            v = st.pop()
            for t in g[v]:
                if not used[t]:
                    used[t] = True
                    st.append(t)
print(c)
===

## p-122 | Кратчайший путь | Графы | 1
Неориентированный граф, вершины s и t. Длина кратчайшего пути в рёбрах или -1.
in: 5 5\n1 2\n2 3\n3 4\n1 5\n5 4\n1 4
out: 2
in: 3 1\n1 2\n1 3
out: -1
hint: BFS.
===
from collections import deque
n, m = map(int, input().split())
g = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v = map(int, input().split())
    g[u].append(v)
    g[v].append(u)
s, t = map(int, input().split())
d = [-1] * (n + 1)
d[s] = 0
q = deque([s])
while q:
    v = q.popleft()
    for x in g[v]:
        if d[x] < 0:
            d[x] = d[v] + 1
            q.append(x)
print(d[t])
===

## p-123 | Восстановление пути | Графы | 2
То же, что «Кратчайший путь», но выведи сам путь (вершины через пробел; из нескольких — любой, найденный BFS с перебором соседей по возрастанию) или -1.
in: 5 5\n1 2\n2 3\n3 4\n1 5\n5 4\n1 4
out: 1 5 4
in: 2 0\n1 2
out: -1
in: 1 0\n1 1
out: 1
hint: Храни предка каждой вершины; соседей сортируй.
===
from collections import deque
n, m = map(int, input().split())
g = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v = map(int, input().split())
    g[u].append(v)
    g[v].append(u)
for x in g:
    x.sort()
s, t = map(int, input().split())
par = [0] * (n + 1)
seen = [False] * (n + 1)
seen[s] = True
q = deque([s])
while q:
    v = q.popleft()
    for x in g[v]:
        if not seen[x]:
            seen[x] = True
            par[x] = v
            q.append(x)
if not seen[t]:
    print(-1)
else:
    path = [t]
    while path[-1] != s:
        path.append(par[path[-1]])
    print(*path[::-1])
===

## p-124 | Двудольность | Графы | 2
Можно ли раскрасить вершины графа в 2 цвета так, чтобы рёбра соединяли разные цвета? YES или NO.
in: 4 4\n1 2\n2 3\n3 4\n4 1
out: YES
in: 3 3\n1 2\n2 3\n3 1
out: NO
in: 2 0
out: YES
hint: BFS с раскраской; конфликт — NO.
===
from collections import deque
n, m = map(int, input().split())
g = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v = map(int, input().split())
    g[u].append(v)
    g[v].append(u)
col = [-1] * (n + 1)
ok = True
for s in range(1, n + 1):
    if col[s] >= 0:
        continue
    col[s] = 0
    q = deque([s])
    while q and ok:
        v = q.popleft()
        for x in g[v]:
            if col[x] < 0:
                col[x] = 1 - col[v]
                q.append(x)
            elif col[x] == col[v]:
                ok = False
print("YES" if ok else "NO")
===

## p-125 | Топологическая сортировка | Графы | 2
Ориентированный граф зависимостей «a b» (a раньше b). Выведи порядок вершин (при выборе — меньшая первой) или -1, если есть цикл.
in: 4 3\n1 2\n1 3\n3 4
out: 1 2 3 4
in: 2 2\n1 2\n2 1
out: -1
in: 3 0
out: 1 2 3
hint: Алгоритм Кана с кучей.
===
import heapq
n, m = map(int, input().split())
g = [[] for _ in range(n + 1)]
deg = [0] * (n + 1)
for _ in range(m):
    a, b = map(int, input().split())
    g[a].append(b)
    deg[b] += 1
h = [v for v in range(1, n + 1) if deg[v] == 0]
heapq.heapify(h)
res = []
while h:
    v = heapq.heappop(h)
    res.append(v)
    for x in g[v]:
        deg[x] -= 1
        if deg[x] == 0:
            heapq.heappush(h, x)
print(*res if len(res) == n else [-1])
===

## p-126 | Есть ли цикл | Графы | 2
Ориентированный граф. Выведи YES, если в нём есть цикл, иначе NO.
in: 3 3\n1 2\n2 3\n3 1
out: YES
in: 3 2\n1 2\n2 3
out: NO
in: 1 1\n1 1
out: YES
hint: Топосортировка не смогла взять все вершины — значит, цикл.
===
from collections import deque
n, m = map(int, input().split())
g = [[] for _ in range(n + 1)]
deg = [0] * (n + 1)
for _ in range(m):
    a, b = map(int, input().split())
    g[a].append(b)
    deg[b] += 1
q = deque(v for v in range(1, n + 1) if deg[v] == 0)
cnt = 0
while q:
    v = q.popleft()
    cnt += 1
    for x in g[v]:
        deg[x] -= 1
        if deg[x] == 0:
            q.append(x)
print("YES" if cnt < n else "NO")
===

## p-127 | Дейкстра | Графы | 2
Ориентированный граф с неотрицательными весами: n m, рёбра «u v w», вершина s. Расстояния до всех вершин (недостижимые — -1).
in: 4 5\n1 2 4\n1 3 1\n3 2 2\n2 4 5\n3 4 10\n1
out: 0 3 1 8
in: 3 1\n1 2 7\n2
out: -1 0 -1
hint: Куча (расстояние, вершина); пропускай устаревшие записи.
===
import heapq
n, m = map(int, input().split())
g = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v, w = map(int, input().split())
    g[u].append((v, w))
s = int(input())
INF = float("inf")
d = [INF] * (n + 1)
d[s] = 0
h = [(0, s)]
while h:
    dv, v = heapq.heappop(h)
    if dv > d[v]:
        continue
    for x, w in g[v]:
        if dv + w < d[x]:
            d[x] = dv + w
            heapq.heappush(h, (d[x], x))
print(*[x if x < INF else -1 for x in d[1:]])
===

## p-128 | Лабиринт | Графы | 2
Карта n×m: . — проход, # — стена, S — старт, F — финиш. Кратчайший путь (шаги по 4 сторонам) или -1.
in: 3 4\nS..#\n.#..\n...F
out: 5
in: 2 2\nS#\n#F
out: -1
hint: BFS по клеткам.
===
from collections import deque
n, m = map(int, input().split())
g = [input() for _ in range(n)]
for i in range(n):
    for j in range(m):
        if g[i][j] == "S":
            s = (i, j)
d = {s: 0}
q = deque([s])
ans = -1
while q:
    x, y = q.popleft()
    if g[x][y] == "F":
        ans = d[(x, y)]
        break
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < n and 0 <= ny < m and g[nx][ny] != "#" and (nx, ny) not in d:
            d[(nx, ny)] = d[(x, y)] + 1
            q.append((nx, ny))
print(ans)
===

## p-129 | Острова | Графы | 1
Карта n×m из # (суша) и . (вода). Сколько островов (связных по 4 сторонам)?
in: 4 5\n##..#\n#...#\n..#..\n.....
out: 3
in: 1 1\n#
out: 1
in: 2 2\n..\n..
out: 0
hint: Обход из каждой непосещённой клетки суши.
===
n, m = map(int, input().split())
g = [list(input()) for _ in range(n)]
c = 0
for i in range(n):
    for j in range(m):
        if g[i][j] == "#":
            c += 1
            st = [(i, j)]
            g[i][j] = "."
            while st:
                x, y = st.pop()
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < n and 0 <= ny < m and g[nx][ny] == "#":
                        g[nx][ny] = "."
                        st.append((nx, ny))
print(c)
===

## p-130 | Конь на доске | Графы | 2
Доска n×n, конь стоит в клетке (x1, y1). За какое минимальное число ходов он доберётся до (x2, y2)?
in: 8\n1 1 8 8
out: 6
in: 3\n1 1 1 1
out: 0
in: 2\n1 1 2 2
out: -1
hint: BFS по клеткам с 8 ходами коня; недостижимо — -1.
===
from collections import deque
n = int(input())
x1, y1, x2, y2 = map(int, input().split())
d = {(x1, y1): 0}
q = deque([(x1, y1)])
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 2), (2, 1), (-1, 2), (-2, 1), (1, -2), (2, -1), (-1, -2), (-2, -1)):
        nx, ny = x + dx, y + dy
        if 1 <= nx <= n and 1 <= ny <= n and (nx, ny) not in d:
            d[(nx, ny)] = d[(x, y)] + 1
            q.append((nx, ny))
print(d.get((x2, y2), -1))
===

## p-131 | Остовное дерево | Графы | 3
Неориентированный взвешенный граф. Вес минимального остовного дерева или -1, если граф несвязный.
in: 4 5\n1 2 1\n2 3 4\n3 4 2\n4 1 3\n1 3 5
out: 6
in: 3 1\n1 2 5
out: -1
in: 1 0
out: 0
hint: Краскал: рёбра по весу и DSU.
===
n, m = map(int, input().split())
e = sorted((w, u, v) for u, v, w in (map(int, input().split()) for _ in range(m)))
p = list(range(n + 1))
def f(x):
    while p[x] != x:
        p[x] = p[p[x]]
        x = p[x]
    return x
tot = used = 0
for w, u, v in e:
    a, b = f(u), f(v)
    if a != b:
        p[a] = b
        tot += w
        used += 1
print(tot if used == n - 1 else -1)
===

## p-132 | Друзья друзей | Графы | 2
Есть n людей и m пар друзей. Для человека s выведи по возрастанию всех, кто ему друг друга, но не друг (и не он сам), или NONE.
in: 5 4\n1 2\n2 3\n2 4\n4 5\n1
out: 3 4
in: 2 1\n1 2\n1
out: NONE
hint: Множество соседей соседей минус соседи и сам s.
===
n, m = map(int, input().split())
g = [set() for _ in range(n + 1)]
for _ in range(m):
    a, b = map(int, input().split())
    g[a].add(b)
    g[b].add(a)
s = int(input())
r = set()
for f in g[s]:
    r |= g[f]
r -= g[s]
r.discard(s)
print(*sorted(r) if r else ["NONE"])
===

## p-133 | Площадь многоугольника | Геометрия | 2
Даны вершины многоугольника по порядку (n, затем n точек, целые). Выведи площадь с одним знаком после точки.
in: 4\n0 0\n4 0\n4 3\n0 3
out: 12.0
in: 3\n0 0\n1 0\n0 1
out: 0.5
hint: Формула шнурков: |Σ (x_i·y_{i+1} − x_{i+1}·y_i)| / 2.
===
n = int(input())
p = [tuple(map(int, input().split())) for _ in range(n)]
s = sum(p[i][0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * p[i][1] for i in range(n))
print(f"{abs(s) / 2:.1f}")
===

## p-134 | Расстояние до точки | Геометрия | 1
Даны две точки (x1 y1 x2 y2). Выведи расстояние между ними с 3 знаками.
in: 0 0 3 4
out: 5.000
in: 1 1 1 1
out: 0.000
in: -1 -1 2 3
out: 5.000
hint: √((x2 − x1)² + (y2 − y1)²).
===
x1, y1, x2, y2 = map(float, input().split())
print(f"{((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5:.3f}")
===

## p-135 | Точка в прямоугольнике | Геометрия | 1
Прямоугольник со сторонами вдоль осей задан двумя противоположными углами. Лежит ли точка внутри или на границе? YES или NO.
in: 0 0 4 3\n2 2
out: YES
in: 4 3 0 0\n5 1
out: NO
in: 0 0 1 1\n1 0
out: YES
hint: Нормализуй: min и max по x и по y.
===
x1, y1, x2, y2 = map(int, input().split())
x, y = map(int, input().split())
print("YES" if min(x1, x2) <= x <= max(x1, x2) and min(y1, y2) <= y <= max(y1, y2) else "NO")
===

## p-136 | Поворот | Геометрия | 2
Даны точки A, B, C. Выведи LEFT, если поворот A→B→C против часовой стрелки, RIGHT — по часовой, ON — на одной прямой.
in: 0 0 1 0 1 1
out: LEFT
in: 0 0 1 0 1 -1
out: RIGHT
in: 0 0 1 1 2 2
out: ON
hint: Знак векторного произведения (B − A) × (C − A).
===
ax, ay, bx, by, cx, cy = map(int, input().split())
cr = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
print("LEFT" if cr > 0 else "RIGHT" if cr < 0 else "ON")
===

## p-137 | Пересечение отрезков на прямой | Геометрия | 1
Даны два отрезка на прямой [a, b] и [c, d]. Выведи длину их пересечения (0, если не пересекаются).
in: 1 5 3 8
out: 2
in: 1 2 3 4
out: 0
in: 5 1 2 3
out: 1
hint: Нормализуй концы; пересечение — [max(начал), min(концов)].
===
a, b, c, d = map(int, input().split())
a, b = min(a, b), max(a, b)
c, d = min(c, d), max(c, d)
print(max(0, min(b, d) - max(a, c)))
===

## p-138 | Выпуклая оболочка | Геометрия | 3
Дано n точек. Выведи площадь их выпуклой оболочки с одним знаком (для вырожденной — 0.0).
in: 5\n0 0\n2 0\n2 2\n0 2\n1 1
out: 4.0
in: 3\n0 0\n1 1\n2 2
out: 0.0
in: 4\n0 0\n4 0\n0 3\n1 1
out: 6.0
hint: Алгоритм Эндрю (монотонная цепочка), затем формула шнурков.
===
n = int(input())
pts = sorted(set(tuple(map(int, input().split())) for _ in range(n)))
def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
if len(pts) < 3:
    print("0.0")
else:
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    h = lo[:-1] + up[:-1]
    s = sum(h[i][0] * h[(i + 1) % len(h)][1] - h[(i + 1) % len(h)][0] * h[i][1] for i in range(len(h)))
    print(f"{abs(s) / 2:.1f}")
===

## p-139 | Лифт | Моделирование | 2
Лифт стоит на этаже 1. Даны n вызовов (этажи) по порядку; лифт едет к каждому по очереди. Сколько этажей он проедет всего?
in: 3\n5 2 7
out: 12
in: 1\n1
out: 0
in: 4\n10 1 10 1
out: 36
hint: Сумма |текущий − следующий|.
===
input()
cur, tot = 1, 0
for f in map(int, input().split()):
    tot += abs(f - cur)
    cur = f
print(tot)
===

## p-140 | Игра «Жизнь» | Моделирование | 3
Поле n×m из . и # (живые), k шагов игры Конвея (за краем — мёртвые). Выведи поле после k шагов.
in: 3 3 1\n.#.\n.#.\n.#.
out: ...\n###\n...
in: 4 4 3\n....\n.##.\n.##.\n....
out: ....\n.##.\n.##.\n....
hint: Новое поле считай по старому целиком.
===
n, m, k = map(int, input().split())
g = [input() for _ in range(n)]
for _ in range(k):
    ng = []
    for i in range(n):
        row = ""
        for j in range(m):
            c = sum(g[x][y] == "#" for x in range(i - 1, i + 2) for y in range(j - 1, j + 2) if (x, y) != (i, j) and 0 <= x < n and 0 <= y < m)
            row += "#" if (g[i][j] == "#" and c in (2, 3)) or (g[i][j] == "." and c == 3) else "."
        ng.append(row)
    g = ng
print("\n".join(g))
===

## p-141 | Считалка | Моделирование | 2
n человек стоят по кругу, считают до k, каждый k-й выбывает. Выведи порядок выбывания.
in: 7 3
out: 3 6 2 7 5 1 4
in: 1 1
out: 1
in: 5 2
out: 2 4 1 5 3
hint: Список и индекс (idx + k − 1) % len.
===
n, k = map(int, input().split())
a = list(range(1, n + 1))
i = 0
res = []
while a:
    i = (i + k - 1) % len(a)
    res.append(a.pop(i))
print(*res)
===

## p-142 | Робот на плоскости | Моделирование | 1
Робот в (0, 0) смотрит на север и получает команды: F — шаг вперёд, L — поворот налево, R — направо. Выведи итоговые координаты.
in: FFRFF
out: 2 2
in: LLFF
out: 0 -2
in: FRFRFRFR
out: 0 0
hint: Направления по кругу: север (0, 1), восток (1, 0), юг (0, −1), запад (−1, 0).
===
dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]
x = y = d = 0
for c in input().strip():
    if c == "F":
        x += dirs[d][0]
        y += dirs[d][1]
    elif c == "R":
        d = (d + 1) % 4
    elif c == "L":
        d = (d - 1) % 4
print(x, y)
===

## p-143 | Склад | Моделирование | 2
Команды до end: add товар k, take товар k (выведи ok, или «нет столько товара», если не хватает — тогда ничего не берётся), count товар.
in: add milk 5\ntake milk 2\ncount milk\ntake milk 10\ncount bread\nend
out: ok\n3\nнет столько товара\n0
in: take tea 1\nadd tea 1\ntake tea 1\ncount tea\nend
out: нет столько товара\nok\n0
hint: Словарь остатков.
===
st = {}
while True:
    p = input().split()
    if p[0] == "end":
        break
    if p[0] == "add":
        st[p[1]] = st.get(p[1], 0) + int(p[2])
    elif p[0] == "take":
        k = int(p[2])
        if st.get(p[1], 0) >= k:
            st[p[1]] -= k
            print("ok")
        else:
            print("нет столько товара")
    elif p[0] == "count":
        print(st.get(p[1], 0))
===

## p-144 | Морской бой | Моделирование | 2
Поле 10×10 (# — корабль, . — вода), затем выстрелы «строка столбец» (с 1) до 0 0. На каждый выведи «мимо», «ранил» или «убил» (корабль — связная по сторонам группа клеток; убит, когда подбиты все его клетки). Повторный выстрел в клетку — как первый.
in: #.........\n#.........\n..........\n....###...\n..........\n..........\n..........\n..........\n.........#\n..........\n1 1\n1 2\n2 1\n4 6\n9 10\n0 0
out: ранил\nмимо\nубил\nранил\nубил
in: ..........\n.##.......\n..........\n..........\n..........\n..........\n..........\n..........\n..........\n#.........\n2 2\n2 2\n2 3\n10 1\n5 5\n0 0
out: ранил\nранил\nубил\nубил\nмимо
hint: При попадании отметь клетку и проверь обходом корабля, остались ли целые клетки.
===
g = [list(input()) for _ in range(10)]
hit = set()
while True:
    r, c = map(int, input().split())
    if r == 0:
        break
    r, c = r - 1, c - 1
    if g[r][c] != "#":
        print("мимо")
        continue
    hit.add((r, c))
    st, seen, alive = [(r, c)], {(r, c)}, False
    while st:
        x, y = st.pop()
        if (x, y) not in hit:
            alive = True
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < 10 and 0 <= ny < 10 and g[nx][ny] == "#" and (nx, ny) not in seen:
                seen.add((nx, ny))
                st.append((nx, ny))
    print("ранил" if alive else "убил")
===

## p-145 | Префикс-функция | Строковые алгоритмы | 3
Дана строка. Выведи её префикс-функцию: для каждой позиции — длину наибольшего собственного префикса, совпадающего с суффиксом, оканчивающимся здесь.
in: abacaba
out: 0 0 1 0 1 2 3
in: aaaa
out: 0 1 2 3
in: abc
out: 0 0 0
hint: Классический алгоритм КМП за O(n).
===
s = input().strip()
p = [0] * len(s)
for i in range(1, len(s)):
    k = p[i - 1]
    while k and s[i] != s[k]:
        k = p[k - 1]
    if s[i] == s[k]:
        k += 1
    p[i] = k
print(*p)
===

## p-146 | Поиск подстроки | Строковые алгоритмы | 2
Даны текст и образец. Выведи все позиции (с 1) вхождений образца в текст (вхождения могут перекрываться) или NONE.
in: abababa\naba
out: 1 3 5
in: hello\nz
out: NONE
in: aaaaa\naa
out: 1 2 3 4
hint: Префикс-функция строки «образец#текст» или аккуратный find в цикле со сдвигом на 1.
===
t = input().strip()
p = input().strip()
res = []
i = t.find(p)
while i != -1:
    res.append(i + 1)
    i = t.find(p, i + 1)
print(*res if res else ["NONE"])
===

## p-147 | Период строки | Строковые алгоритмы | 3
Дана строка. Найди длину её минимального периода k — такого, что строка составлена из повторений своего префикса длины k (строка abcabc → 3, abcab → 5).
in: abcabc
out: 3
in: abcab
out: 5
in: aaaa
out: 1
hint: Через префикс-функцию: k = n − p[n−1], если n делится на k, иначе n.
===
s = input().strip()
n = len(s)
p = [0] * n
for i in range(1, n):
    k = p[i - 1]
    while k and s[i] != s[k]:
        k = p[k - 1]
    if s[i] == s[k]:
        k += 1
    p[i] = k
k = n - p[-1]
print(k if n % k == 0 else n)
===

## p-148 | Количество различных подстрок | Строковые алгоритмы | 3
Дана строка (до 300 символов). Сколько у неё различных непустых подстрок?
in: abc
out: 6
in: aaa
out: 3
in: abab
out: 7
hint: Для коротких строк хватит множества всех подстрок.
===
s = input().strip()
print(len({s[i:j] for i in range(len(s)) for j in range(i + 1, len(s) + 1)}))
===

## p-149 | Проверка пароля | Строки | 2
Дан пароль. Он надёжный, если длина ≥ 8, есть строчная и заглавная латинская буква, цифра и спецсимвол (не буква и не цифра). Выведи OK или список недостающих требований через запятую в этом порядке: длина, строчная, заглавная, цифра, спецсимвол.
in: Qwerty12!
out: OK
in: qwerty
out: длина, заглавная, цифра, спецсимвол
in: QWERTY123456
out: строчная, спецсимвол
hint: Проверяй каждое условие отдельно и собирай названия невыполненных.
===
s = input().strip()
need = []
if len(s) < 8:
    need.append("длина")
if not any("a" <= c <= "z" for c in s):
    need.append("строчная")
if not any("A" <= c <= "Z" for c in s):
    need.append("заглавная")
if not any(c.isdigit() for c in s):
    need.append("цифра")
if all(c.isalnum() for c in s):
    need.append("спецсимвол")
print("OK" if not need else ", ".join(need))
===

## p-150 | Римские числа | Строки | 2
Переведи число от 1 до 3999 в римскую запись.
in: 1994
out: MCMXCIV
in: 4
out: IV
in: 3999
out: MMMCMXCIX
hint: Таблица значений от 1000 (M) до 1 (I), включая 900 (CM), 400 (CD), 90, 40, 9, 4.
===
n = int(input())
vals = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"), (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
r = ""
for v, sym in vals:
    while n >= v:
        r += sym
        n -= v
print(r)
===

## p-151 | Из римских | Строки | 2
Переведи римскую запись (до 3999) в обычное число.
in: MCMXCIV
out: 1994
in: IV
out: 4
in: MMMCMXCIX
out: 3999
hint: Если символ меньше следующего — вычитай его, иначе прибавляй.
===
s = input().strip()
v = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
r = 0
for i, c in enumerate(s):
    if i + 1 < len(s) and v[c] < v[s[i + 1]]:
        r -= v[c]
    else:
        r += v[c]
print(r)
===

## p-152 | Календарь | Моделирование | 3
Дана дата ДД.ММ.ГГГГ (годы 1900–2100). Выведи день недели по-английски (Monday … Sunday). Известно, что 01.01.1900 — понедельник. Не пользуйся библиотеками дат.
in: 01.01.1900
out: Monday
in: 07.11.2026
out: Saturday
in: 29.02.2000
out: Tuesday
hint: Посчитай число дней от 01.01.1900 (учитывая високосные годы) и возьми остаток от деления на 7.
===
d, m, y = map(int, input().split("."))
def leap(y):
    return (y % 4 == 0 and y % 100 != 0) or y % 400 == 0
days = sum(366 if leap(yy) else 365 for yy in range(1900, y))
mlen = [31, 29 if leap(y) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
days += sum(mlen[: m - 1]) + d - 1
names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
print(names[days % 7])
===
