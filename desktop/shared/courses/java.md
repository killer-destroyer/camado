# Java

Java — строгий язык с классами: на нём пишут серверы банков и маркетплейсов, Android-приложения и большие системы. Здесь всё объявляется явно — это дисциплинирует и хорошо учит ООП. 26 уроков в 7 модулях: основы, массивы и рекурсия, ООП (equals/hashCode, enum, обобщения), коллекции и Stream API, исключения, алгоритмы (сортировки, бинпоиск по ответу, графы, динамика) и два проекта. В каждом уроке несколько задач от ★ до ★★★, в конце модуля — итоговый тест.

### Модуль: Основы

## java-01 | Первая программа, переменные и типы
Любая программа на Java живёт внутри класса, а выполнение начинается с метода `main`:

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
        System.out.print("без перевода строки ");
        System.out.println(2 + 3);
    }
}
```

Имя файла совпадает с именем класса: `Main.java`. Каждая команда заканчивается `;`.

Переменные объявляются **с типом**:

```java
int age = 18;            // целое, до ~2·10⁹
long big = 10_000_000_000L; // большое целое
double pi = 3.14;        // дробное
boolean ok = true;
char c = 'A';            // один символ — в одинарных кавычках
String name = "Аня";     // строка — в двойных
```

Арифметика: `+ - * / %`. Деление целых даёт целое: `7 / 2 == 3`, а `7 / 2.0 == 3.5`.

`final int MAX = 100;` — константа, менять нельзя.

?? Что выведет `System.out.println(7 / 2);`?
- 3.5
+ 3
- 4
- ошибка
= Оба числа целые — деление целочисленное.

?? Какой тип подойдёт для 5 000 000 000?
- int
+ long
- char
- boolean
= int вмещает только до ~2,1 млрд.

?? Чем `'A'` отличается от `"A"`?
+ 'A' — символ char, "A" — строка String
- ничем
- 'A' — строка, "A" — символ
- 'A' — ошибка
= Одинарные кавычки — один символ, двойные — строка.

!! Выведи две строки: `Hello, Java!` и количество минут в неделе (посчитай выражением).
<<<
public class Main {
    public static void main(String[] args) {
        // твой код
    }
}
<<<
in:
out: Hello, Java!\n10080
hint: Две команды System.out.println.
hint: Минут в неделе: 7 * 24 * 60.
===
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
        System.out.println(7 * 24 * 60);
    }
}
===
!! {1} Выведи на трёх строках: 2 в степени 10 (через умножение или `Math.pow` с приведением к int), остаток от деления 100 на 7 и результат `7 / 2.0`.
<<<
public class Main {
    public static void main(String[] args) {
    }
}
<<<
in:
out: 1024\n2\n3.5
hint: `(int) Math.pow(2, 10)`, `100 % 7`, `7 / 2.0`.
===
public class Main {
    public static void main(String[] args) {
        System.out.println((int) Math.pow(2, 10));
        System.out.println(100 % 7);
        System.out.println(7 / 2.0);
    }
}
===
!! {2} Объяви переменные `int a = 2_000_000_000;` и `int b = 2_000_000_000;`. Выведи их сумму как `int` (увидишь переполнение) и как `long` — на двух строках.
<<<
public class Main {
    public static void main(String[] args) {
        int a = 2_000_000_000;
        int b = 2_000_000_000;
    }
}
<<<
in:
out: -294967296\n4000000000
hint: `System.out.println(a + b);` и `System.out.println((long) a + b);`
===
public class Main {
    public static void main(String[] args) {
        int a = 2_000_000_000;
        int b = 2_000_000_000;
        System.out.println(a + b);
        System.out.println((long) a + b);
    }
}
===
card: С какого метода начинается программа на Java? :: `public static void main(String[] args)`
card: Чему равно `7 / 2` в Java? :: `3` — деление целых даёт целое. `7 / 2.0` → `3.5`.
card: Как объявить константу? :: `final int MAX = 100;`

## java-02 | Ввод с клавиатуры: Scanner
Для чтения ввода используют `Scanner`:

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int a = in.nextInt();
        int b = in.nextInt();
        String word = in.next();       // одно слово
        in.nextLine();                 // дочитать конец строки
        String line = in.nextLine();   // вся строка
        System.out.println(a + b);
    }
}
```

`nextInt`, `nextLong`, `nextDouble` читают числа, пропуская пробелы и переводы строк.

Ловушка: после `nextInt()` в буфере остаётся перевод строки, и следующий `nextLine()` вернёт пустую строку — поэтому сначала «дочитывают» `in.nextLine()`.

Приведение типов: `(double) a / b` — дробное деление, `(int) 3.9` → 3 (отбрасывает дробь).

Форматированный вывод: `System.out.printf("%.2f%n", x);` — два знака после точки.

?? Что выведет код при a = 7, b = 2?
```java
System.out.println((double) a / b);
```
- 3
+ 3.5
- 3.0
- ошибка
= Сначала a становится double, и деление уже дробное.

?? Чему равно `(int) 3.99`?
+ 3
- 4
- 3.99
- ошибка
= Приведение к int отбрасывает дробную часть, не округляет.

!! Даны два целых числа a и b. Выведи их среднее арифметическое ровно с двумя знаками после точки.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        // твой код
    }
}
<<<
in: 3 4
out: 3.50
in: -1 2
out: 0.50
hint: Прочитай `int a = in.nextInt(); int b = in.nextInt();`
hint: `System.out.printf("%.2f%n", (a + b) / 2.0);` — printf может поставить запятую в русской системе, поэтому добавь `java.util.Locale.US` первым аргументом.
===
import java.util.Locale;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int a = in.nextInt();
        int b = in.nextInt();
        System.out.printf(Locale.US, "%.2f%n", (a + b) / 2.0);
    }
}
===
!! {1} Дано время в минутах с начала суток. Выведи его как `ЧЧ:ММ` (с ведущими нулями).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int t = new Scanner(System.in).nextInt();
    }
}
<<<
in: 75
out: 01:15
in: 1439
out: 23:59
in: 0
out: 00:00
hint: `System.out.printf("%02d:%02d%n", t / 60, t % 60);`
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int t = new Scanner(System.in).nextInt();
        System.out.printf("%02d:%02d%n", t / 60, t % 60);
    }
}
===
!! {2} Даны имя (одно слово) и год рождения. Выведи строку `Привет, ИМЯ! В 2030 году тебе будет N.`
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: Миша 2007
out: Привет, Миша! В 2030 году тебе будет 23.
in: Ада 1815
out: Привет, Ада! В 2030 году тебе будет 215.
hint: `String name = in.next(); int year = in.nextInt();` и склейка строк через `+`.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String name = in.next();
        int year = in.nextInt();
        System.out.println("Привет, " + name + "! В 2030 году тебе будет " + (2030 - year) + ".");
    }
}
===
card: Почему после `nextInt()` следующий `nextLine()` возвращает пустую строку? :: В буфере остался перевод строки. Дочитай его лишним `in.nextLine()`.
card: Как вывести число с двумя знаками после точки? :: `System.out.printf(Locale.US, "%.2f%n", x);`

## java-03 | Условия и switch
```java
if (t > 25) {
    System.out.println("hot");
} else if (t > 10) {
    System.out.println("ok");
} else {
    System.out.println("cold");
}
```

Сравнения: `==`, `!=`, `<`, `>`, `<=`, `>=`. Логика: `&&` (и), `||` (или), `!` (не).

**Строки сравнивают через `equals`**, а не `==`: `==` проверяет, тот ли это объект.

```java
if (name.equals("admin")) { ... }
```

Тернарный оператор: `String s = x > 0 ? "plus" : "minus";`

`switch` для выбора по значению (новый синтаксис со стрелками):

```java
String day = switch (n) {
    case 6, 7 -> "weekend";
    default -> "workday";
};
```

?? Как правильно сравнить строки s и t?
- s == t
+ s.equals(t)
- s = t
- s.compare(t)
= == сравнивает ссылки на объекты, equals — содержимое.

?? Что выведет код при x = 0?
```java
System.out.println(x > 0 ? "plus" : x < 0 ? "minus" : "zero");
```
- plus
- minus
+ zero
- ошибка
= Оба условия ложны — срабатывает последний вариант.

!! Дано целое число — номер месяца. Выведи `winter`, `spring`, `summer` или `autumn`. Если число не от 1 до 12 — выведи `error`.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int m = new Scanner(System.in).nextInt();
        // твой код
    }
}
<<<
in: 1
out: winter
in: 7
out: summer
in: 11
out: autumn
in: 13
out: error
hint: Удобно через switch: `case 12, 1, 2 -> "winter";`
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int m = new Scanner(System.in).nextInt();
        String s = switch (m) {
            case 12, 1, 2 -> "winter";
            case 3, 4, 5 -> "spring";
            case 6, 7, 8 -> "summer";
            case 9, 10, 11 -> "autumn";
            default -> "error";
        };
        System.out.println(s);
    }
}
===
!! {1} Даны три числа — стороны треугольника. Выведи `equilateral`, `isosceles`, `scalene` или `impossible` (если такого треугольника нет).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        long a = in.nextLong(), b = in.nextLong(), c = in.nextLong();
    }
}
<<<
in: 3 3 3
out: equilateral
in: 3 3 5
out: isosceles
in: 3 4 5
out: scalene
in: 1 2 3
out: impossible
hint: Треугольник существует, если каждая сторона меньше суммы двух других.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        long a = in.nextLong(), b = in.nextLong(), c = in.nextLong();
        if (a >= b + c || b >= a + c || c >= a + b) System.out.println("impossible");
        else if (a == b && b == c) System.out.println("equilateral");
        else if (a == b || b == c || a == c) System.out.println("isosceles");
        else System.out.println("scalene");
    }
}
===
!! {2} Дан балл от 0 до 100. Выведи оценку: 90+ → `5`, 75–89 → `4`, 60–74 → `3`, иначе `2`. Если балл вне диапазона — `error`.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int s = new Scanner(System.in).nextInt();
    }
}
<<<
in: 95
out: 5
in: 75
out: 4
in: 59
out: 2
in: 101
out: error
hint: Сначала проверь диапазон, потом цепочку `if`/`else if` сверху вниз.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int s = new Scanner(System.in).nextInt();
        if (s < 0 || s > 100) System.out.println("error");
        else if (s >= 90) System.out.println(5);
        else if (s >= 75) System.out.println(4);
        else if (s >= 60) System.out.println(3);
        else System.out.println(2);
    }
}
===
card: Как сравнить две строки по содержимому? :: `a.equals(b)` — не `==`.
card: Как записать «если x > 0, то "plus", иначе "minus"» одним выражением? :: `x > 0 ? "plus" : "minus"`

## java-04 | Циклы
```java
for (int i = 0; i < 5; i++) {       // 0 1 2 3 4
    System.out.print(i + " ");
}

int n = 1;
while (n < 100) {
    n *= 2;
}

do {
    // выполнится хотя бы один раз
} while (false);
```

`for` состоит из трёх частей: начало; условие; шаг. `i++` — то же, что `i = i + 1`.

`break` — выйти из цикла, `continue` — к следующему шагу.

Вложенные циклы — таблица умножения:

```java
for (int i = 1; i <= 9; i++) {
    for (int j = 1; j <= 9; j++) {
        System.out.print(i * j + "\t");
    }
    System.out.println();
}
```

Переполнение: `int` после 2 147 483 647 «перескакивает» в минус. Для больших сумм — `long`.

?? Сколько раз выполнится тело `for (int i = 10; i > 0; i -= 3)`?
- 3
+ 4
- 10
- бесконечно
= i = 10, 7, 4, 1 — четыре раза.

?? Чем `do-while` отличается от `while`?
+ тело do-while выполнится хотя бы один раз
- ничем
- do-while быстрее
- do-while не бывает в Java
= Условие проверяется после тела.

!! Дано n. Выведи сумму цифр числа n и количество его цифр через пробел (n ≥ 0, может быть до 10¹⁸).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        long n = new Scanner(System.in).nextLong();
        // твой код
    }
}
<<<
in: 12345
out: 15 5
in: 0
out: 0 1
in: 999999999999999999
out: 162 18
hint: Последняя цифра — `n % 10`, убрать её — `n /= 10`.
hint: Ноль — отдельный случай: у него одна цифра. Удобно через do-while.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        long n = new Scanner(System.in).nextLong();
        long sum = 0;
        int count = 0;
        do {
            sum += n % 10;
            count++;
            n /= 10;
        } while (n > 0);
        System.out.println(sum + " " + count);
    }
}
===
!! {1} Дано n. Выведи «ёлочку» из звёздочек: в i-й строке i звёздочек (i от 1 до n).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
    }
}
<<<
in: 3
out: *\n**\n***
in: 1
out: *
hint: `"*".repeat(i)` или вложенный цикл.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
        for (int i = 1; i <= n; i++) System.out.println("*".repeat(i));
    }
}
===
!! {3} Дано n (до 10^6). Выведи количество простых чисел от 2 до n (решето Эратосфена).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
    }
}
<<<
in: 10
out: 4
in: 1000000
out: 78498
in: 2
out: 1
hint: `boolean[] composite = new boolean[n + 1];` для каждого простого i вычёркивай i*i, i*i+i, …
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
        boolean[] comp = new boolean[n + 1];
        int cnt = 0;
        for (int i = 2; i <= n; i++) {
            if (comp[i]) continue;
            cnt++;
            for (long j = (long) i * i; j <= n; j += i) comp[(int) j] = true;
        }
        System.out.println(cnt);
    }
}
===
card: Как получить последнюю цифру числа n? :: `n % 10`, а убрать её — `n / 10`.
card: Что будет, если к `Integer.MAX_VALUE` прибавить 1? :: Переполнение: получится `Integer.MIN_VALUE` (отрицательное). Нужен long.

### Модуль: Массивы, строки, рекурсия

## java-05 | Массивы
Массив — фиксированное число элементов одного типа:

```java
int[] a = new int[5];          // пять нулей
int[] b = {3, 1, 4, 1, 5};
System.out.println(b.length);  // 5 — без скобок!
b[0] = 10;
for (int x : b) {              // перебор всех элементов
    System.out.print(x + " ");
}
```

Индексы с нуля; выход за границы — `ArrayIndexOutOfBoundsException`.

Полезное из `java.util.Arrays`:

```java
Arrays.sort(b);                       // сортировка
System.out.println(Arrays.toString(b)); // [1, 1, 3, 4, 5]
int[] c = Arrays.copyOf(b, b.length);   // копия
```

Двумерный массив: `int[][] grid = new int[3][4]; grid[1][2] = 7;`

Как и у объектов, `int[] c = b;` — это не копия, а второе имя того же массива.

?? Что выведет код?
```java
int[] a = {1, 2, 3};
int[] b = a;
b[0] = 9;
System.out.println(a[0]);
```
- 1
+ 9
- 0
- ошибка
= a и b указывают на один массив.

?? Как узнать длину массива a?
+ a.length
- a.length()
- a.size()
- len(a)
= У массивов — поле length без скобок; у строк — метод length().

!! Дано n, затем n целых чисел. Выведи второй по величине различный элемент; если его нет — `NONE`.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
        // твой код
    }
}
<<<
in: 5\n4 9 2 9 7
out: 7
in: 3\n5 5 5
out: NONE
hint: Отсортируй `Arrays.sort(a)` и иди с конца, пока элемент равен максимуму.
hint: Или за один проход храни max и second.
===
import java.util.Arrays;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
        Arrays.sort(a);
        int max = a[n - 1];
        for (int i = n - 2; i >= 0; i--) {
            if (a[i] != max) {
                System.out.println(a[i]);
                return;
            }
        }
        System.out.println("NONE");
    }
}
===
!! {1} Дано n и n чисел. Выведи массив в обратном порядке, не создавая второй массив (обмен элементов).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
    }
}
<<<
in: 5\n1 2 3 4 5
out: 5 4 3 2 1
in: 2\n7 8
out: 8 7
hint: Меняй a[i] и a[n - 1 - i] для i < n / 2.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
        for (int i = 0; i < n / 2; i++) {
            int t = a[i];
            a[i] = a[n - 1 - i];
            a[n - 1 - i] = t;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(a[i]).append(i + 1 < n ? " " : "");
        System.out.println(sb);
    }
}
===
!! {2} Дано n, затем n оценок от 1 до 5. Выведи, сколько раз встретилась каждая оценка — в формате «оценка: количество» для 5, 4, 3, 2, 1.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 6\n5 4 5 3 5 2
out: 5: 3\n4: 1\n3: 1\n2: 1\n1: 0
in: 1\n1
out: 5: 0\n4: 0\n3: 0\n2: 0\n1: 1
hint: Массив-счётчик `int[] cnt = new int[6];` и `cnt[x]++`.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] cnt = new int[6];
        for (int i = 0; i < n; i++) cnt[in.nextInt()]++;
        for (int g = 5; g >= 1; g--) System.out.println(g + ": " + cnt[g]);
    }
}
===
card: Как красиво напечатать массив? :: `Arrays.toString(a)` → `[1, 2, 3]`
card: Чем `a.length` отличается от `s.length()`? :: У массива length — поле, у строки length() — метод.

## java-06 | Строки и StringBuilder
`String` неизменяем: любая «правка» создаёт новую строку.

```java
String s = "Hello";
s.length();          // 5
s.charAt(1);         // 'e'
s.substring(1, 3);   // "el" — конец не входит
s.indexOf("l");      // 2, или -1
s.toUpperCase();     // "HELLO"
s.contains("ell");   // true
s.split(" ");        // массив слов
String.join("-", "a", "b"); // "a-b"
```

Склеивать строку в цикле через `+` медленно (каждый раз новая строка). Для этого есть `StringBuilder`:

```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) sb.append(i).append(' ');
sb.reverse();
String result = sb.toString();
```

Символы: `Character.isDigit(c)`, `Character.isLetter(c)`, `Character.toUpperCase(c)`. Цифру-символ в число: `c - '0'`.

?? Что вернёт `"programming".substring(3, 7)`?
- "ogra"
+ "gram"
- "gramm"
- "rogr"
= Индексы 3, 4, 5, 6: g, r, a, m. Седьмой не входит.

?? Зачем нужен StringBuilder?
+ быстро собирать строку по кусочкам в цикле
- чтобы сравнивать строки
- для чисел
- он нужен только для reverse
= String неизменяем: s += x каждый раз копирует всю строку.

!! Дана строка. Сожми её: подряд идущие одинаковые символы замени на символ и число повторов (если повтор один — только символ). Например, aaabcc → a3bc2.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        String s = new Scanner(System.in).nextLine();
        // твой код
    }
}
<<<
in: aaabcc
out: a3bc2
in: abc
out: abc
in: zzzzzzzzzzzz
out: z12
hint: Иди по строке и считай длину текущей серии одинаковых символов.
hint: Когда символ сменился (или строка кончилась) — допиши в StringBuilder символ и, если серия > 1, её длину.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        String s = new Scanner(System.in).nextLine();
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < s.length()) {
            int j = i;
            while (j < s.length() && s.charAt(j) == s.charAt(i)) j++;
            sb.append(s.charAt(i));
            if (j - i > 1) sb.append(j - i);
            i = j;
        }
        System.out.println(sb);
    }
}
===
!! {1} Дана строка. Выведи её, где каждое слово начинается с заглавной буквы, а остальные буквы строчные.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        String s = new Scanner(System.in).nextLine();
    }
}
<<<
in: hELLO wORLD from java
out: Hello World From Java
in: x
out: X
hint: `split(" ")`, для каждого слова `Character.toUpperCase(w.charAt(0)) + w.substring(1).toLowerCase()`.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        String s = new Scanner(System.in).nextLine();
        String[] w = s.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < w.length; i++) {
            if (i > 0) sb.append(' ');
            sb.append(Character.toUpperCase(w[i].charAt(0))).append(w[i].substring(1).toLowerCase());
        }
        System.out.println(sb);
    }
}
===
!! {2} Даны две строки (латиница). Выведи `YES`, если это анаграммы (одинаковые буквы в любом порядке, без учёта регистра и пробелов), иначе `NO`.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String a = in.nextLine(), b = in.nextLine();
    }
}
<<<
in: Listen\nSilent
out: YES
in: Dormitory\ndirty room
out: YES
in: abc\nabd
out: NO
hint: Убери пробелы, приведи к нижнему регистру, `toCharArray()`, `Arrays.sort`, сравни `Arrays.equals`.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String a = in.nextLine(), b = in.nextLine();
        char[] x = a.replace(" ", "").toLowerCase().toCharArray();
        char[] y = b.replace(" ", "").toLowerCase().toCharArray();
        Arrays.sort(x);
        Arrays.sort(y);
        System.out.println(Arrays.equals(x, y) ? "YES" : "NO");
    }
}
===
card: Как превратить символ-цифру '7' в число 7? :: `c - '0'`
card: Почему `s += x` в цикле — плохо? :: String неизменяем, каждый раз копируется вся строка: O(n²). Используй StringBuilder.

## java-14 | Двумерные массивы
Двумерный массив — массив массивов:

```java
int[][] grid = new int[3][4];      // 3 строки, 4 столбца, всё нули
grid[1][2] = 7;
int rows = grid.length, cols = grid[0].length;
for (int[] row : grid) {
    System.out.println(Arrays.toString(row));
}
int[][] m = { {1, 2}, {3, 4} };    // сразу со значениями
```

Строки могут быть разной длины («рваный» массив): `int[][] tri = new int[n][]; tri[i] = new int[i + 1];` — так удобно хранить треугольник Паскаля.

Обход соседей клетки — массивы сдвигов:

```java
int[] dx = {1, -1, 0, 0}, dy = {0, 0, 1, -1};
for (int k = 0; k < 4; k++) {
    int x = i + dx[k], y = j + dy[k];
    if (x >= 0 && x < n && y >= 0 && y < m) { ... }
}
```

?? Что такое `grid[0].length`?
+ число столбцов (длина первой строки)
- число строк
- число всех элементов
- ошибка
= `grid.length` — строки, `grid[i].length` — длина i-й строки.

?? Чем заполнен `new int[2][3]`?
+ нулями
- случайными числами
- null
- ничем — ошибка
= Числовые массивы в Java заполняются нулями, объектные — null.

!! {1} Дано n m и матрица. Выведи суммы по строкам (через пробел), а на второй строке — суммы по столбцам.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), m = in.nextInt();
        int[][] a = new int[n][m];
        for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) a[i][j] = in.nextInt();
    }
}
<<<
in: 2 3\n1 2 3\n4 5 6
out: 6 15\n5 7 9
in: 1 1\n7
out: 7\n7
hint: Два массива сумм: `rows[i] += a[i][j]`, `cols[j] += a[i][j]`.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), m = in.nextInt();
        int[][] a = new int[n][m];
        for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) a[i][j] = in.nextInt();
        long[] rows = new long[n], cols = new long[m];
        for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) { rows[i] += a[i][j]; cols[j] += a[i][j]; }
        StringBuilder r = new StringBuilder(), c = new StringBuilder();
        for (int i = 0; i < n; i++) r.append(i > 0 ? " " : "").append(rows[i]);
        for (int j = 0; j < m; j++) c.append(j > 0 ? " " : "").append(cols[j]);
        System.out.println(r);
        System.out.println(c);
    }
}
===
!! {2} Дано n. Выведи первые n строк треугольника Паскаля (каждая строка — числа через пробел).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
    }
}
<<<
in: 5
out: 1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1
in: 1
out: 1
hint: «Рваный» массив `long[][] t = new long[n][];` — в строке i элементов i+1, края равны 1, внутри `t[i-1][j-1] + t[i-1][j]`.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
        long[][] t = new long[n][];
        for (int i = 0; i < n; i++) {
            t[i] = new long[i + 1];
            t[i][0] = t[i][i] = 1;
            for (int j = 1; j < i; j++) t[i][j] = t[i - 1][j - 1] + t[i - 1][j];
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j <= i; j++) sb.append(j > 0 ? " " : "").append(t[i][j]);
            System.out.println(sb);
        }
    }
}
===
!! {3} Дано n m и матрица. Поверни её на 90° по часовой стрелке и выведи.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), m = in.nextInt();
    }
}
<<<
in: 2 3\n1 2 3\n4 5 6
out: 4 1\n5 2\n6 3
in: 3 1\n1\n2\n3
out: 3 2 1
hint: Новая матрица m×n: `r[j][n - 1 - i] = a[i][j]`.
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), m = in.nextInt();
        int[][] a = new int[n][m];
        for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) a[i][j] = in.nextInt();
        int[][] r = new int[m][n];
        for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) r[j][n - 1 - i] = a[i][j];
        for (int[] row : r) {
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < n; j++) sb.append(j > 0 ? " " : "").append(row[j]);
            System.out.println(sb);
        }
    }
}
===
card: Как узнать число строк и столбцов в int[][] a? :: Строки — `a.length`, столбцы — `a[0].length`.
card: Что такое «рваный» массив? :: Двумерный массив, где строки разной длины: `int[][] t = new int[n][]; t[i] = new int[i + 1];`

## java-07 | Методы
Метод — именованный кусок кода. Пока без объектов пишем `static`:

```java
public class Main {
    static int square(int x) {
        return x * x;
    }

    static void hello(String name) {     // void — ничего не возвращает
        System.out.println("Hi, " + name);
    }

    public static void main(String[] args) {
        System.out.println(square(5));
        hello("Anna");
    }
}
```

Сигнатура: модификаторы, тип результата, имя, параметры с типами.

**Перегрузка** — одно имя, разные параметры:

```java
static int max(int a, int b) { return a > b ? a : b; }
static double max(double a, double b) { return a > b ? a : b; }
```

Примитивы (`int`, `double`…) передаются **копией** — метод не изменит переменную снаружи. А массивы и объекты передаются ссылкой — изменения внутри видны снаружи.

?? Что выведет код?
```java
static void inc(int x) { x++; }
// в main:
int a = 5;
inc(a);
System.out.println(a);
```
+ 5
- 6
- 0
- ошибка
= int передаётся копией — внутри меняется копия.

?? Что значит `void` у метода?
+ метод ничего не возвращает
- метод пустой
- метод приватный
- метод статический
= Для результата пишут его тип: int, String…

!! Напиши метод `static long gcd(long a, long b)` (наибольший общий делитель, алгоритм Евклида). Даны два числа — выведи их НОД и НОК через пробел.
<<<
import java.util.Scanner;

public class Main {
    static long gcd(long a, long b) {
        // твой код
        return 0;
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        long a = in.nextLong(), b = in.nextLong();
    }
}
<<<
in: 12 18
out: 6 36
in: 7 13
out: 1 91
in: 1000000000 999999999
out: 1 999999999000000000
hint: Евклид: пока b ≠ 0, (a, b) = (b, a % b). Ответ — a.
hint: НОК = a / gcd(a, b) * b — сначала делим, чтобы не переполнить.
===
import java.util.Scanner;

public class Main {
    static long gcd(long a, long b) {
        while (b != 0) {
            long t = a % b;
            a = b;
            b = t;
        }
        return a;
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        long a = in.nextLong(), b = in.nextLong();
        long g = gcd(a, b);
        System.out.println(g + " " + (a / g * b));
    }
}
===
!! {1} Напиши метод `static boolean isPrime(int n)` и выведи все простые от 2 до n через пробел.
<<<
import java.util.Scanner;

public class Main {
    static boolean isPrime(int n) {
        return false;
    }

    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
    }
}
<<<
in: 20
out: 2 3 5 7 11 13 17 19
in: 2
out: 2
hint: Делители проверяй до `d * d <= n`.
===
import java.util.Scanner;

public class Main {
    static boolean isPrime(int n) {
        if (n < 2) return false;
        for (int d = 2; (long) d * d <= n; d++) if (n % d == 0) return false;
        return true;
    }

    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
        StringBuilder sb = new StringBuilder();
        for (int i = 2; i <= n; i++) if (isPrime(i)) sb.append(sb.length() > 0 ? " " : "").append(i);
        System.out.println(sb);
    }
}
===
!! {2} Перегрузка: методы `max(int, int)`, `max(int, int, int)` и `max(int[])`. Дано n и n чисел — выведи max первых двух, max первых трёх и max всего массива через пробел (n ≥ 3).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
    }
}
<<<
in: 5\n3 9 4 12 1
out: 9 9 12
in: 3\n-5 -2 -9
out: -2 -2 -2
hint: `max(a, b, c)` можно выразить через `max(max(a, b), c)`.
===
import java.util.Scanner;

public class Main {
    static int max(int a, int b) { return a > b ? a : b; }
    static int max(int a, int b, int c) { return max(max(a, b), c); }
    static int max(int[] a) {
        int m = a[0];
        for (int x : a) m = max(m, x);
        return m;
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
        System.out.println(max(a[0], a[1]) + " " + max(a[0], a[1], a[2]) + " " + max(a));
    }
}
===
card: Алгоритм Евклида для НОД? :: Пока b ≠ 0: (a, b) = (b, a % b). Ответ — a.
card: Что такое перегрузка метода? :: Несколько методов с одним именем, но разными параметрами.

## java-15 | Рекурсия
Метод может вызывать сам себя. Обязательна **база** — случай без рекурсии.

```java
static long fact(int n) {
    if (n <= 1) return 1;          // база
    return n * fact(n - 1);
}

static void hanoi(int n, char from, char to, char via) {
    if (n == 0) return;
    hanoi(n - 1, from, via, to);
    System.out.println(from + " -> " + to);
    hanoi(n - 1, via, to, from);
}
```

Каждый вызов занимает место в **стеке вызовов**; слишком глубокая рекурсия — `StackOverflowError`.

Перебор вариантов (backtracking) — классика рекурсии: добавили элемент, ушли глубже, убрали.

Повторяющиеся подзадачи ускоряют **мемоизацией**: `long[] memo` или `HashMap`.

?? Что будет без базы рекурсии?
+ StackOverflowError
- бесконечный цикл без ошибки
- вернёт 0
- ошибка компиляции
= Каждый вызов кладётся в стек, пока он не переполнится.

?? Сколько ходов нужно для Ханойской башни из n дисков?
+ 2ⁿ − 1
- n²
- 2n
- n!
= Для 3 дисков — 7 ходов.

!! {1} Рекурсивно найди НОД двух чисел (`gcd(a, b) = gcd(b, a % b)`).
<<<
import java.util.Scanner;

public class Main {
    static long gcd(long a, long b) {
        return 0;
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        System.out.println(gcd(in.nextLong(), in.nextLong()));
    }
}
<<<
in: 48 18
out: 6
in: 17 5
out: 1
in: 0 9
out: 9
hint: База: `b == 0` → `a`.
===
import java.util.Scanner;

public class Main {
    static long gcd(long a, long b) {
        return b == 0 ? a : gcd(b, a % b);
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        System.out.println(gcd(in.nextLong(), in.nextLong()));
    }
}
===
!! {2} Ханойская башня: дано n. Выведи все ходы в формате `A -> C` (перенести все диски с A на C, вспомогательный B).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
    }
}
<<<
in: 2
out: A -> B\nA -> C\nB -> C
in: 3
out: A -> C\nA -> B\nC -> B\nA -> C\nB -> A\nB -> C\nA -> C
hint: Код — в гайде. Копи вывод в StringBuilder.
===
import java.util.Scanner;

public class Main {
    static StringBuilder out = new StringBuilder();

    static void hanoi(int n, char from, char to, char via) {
        if (n == 0) return;
        hanoi(n - 1, from, via, to);
        out.append(from).append(" -> ").append(to).append('\n');
        hanoi(n - 1, via, to, from);
    }

    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
        hanoi(n, 'A', 'C', 'B');
        System.out.print(out);
    }
}
===
!! {3} Дана строка из различных букв. Выведи все её перестановки в лексикографическом порядке, каждую на своей строке.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        String s = new Scanner(System.in).next();
    }
}
<<<
in: abc
out: abc\nacb\nbac\nbca\ncab\ncba
in: ba
out: ab\nba
hint: Отсортируй буквы; рекурсия `gen(StringBuilder cur, boolean[] used)`: перебирай неиспользованные буквы по порядку.
===
import java.util.*;

public class Main {
    static char[] c;
    static boolean[] used;
    static StringBuilder out = new StringBuilder();

    static void gen(StringBuilder cur) {
        if (cur.length() == c.length) {
            out.append(cur).append('\n');
            return;
        }
        for (int i = 0; i < c.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            cur.append(c[i]);
            gen(cur);
            cur.deleteCharAt(cur.length() - 1);
            used[i] = false;
        }
    }

    public static void main(String[] args) {
        c = new Scanner(System.in).next().toCharArray();
        Arrays.sort(c);
        used = new boolean[c.length];
        gen(new StringBuilder());
        System.out.print(out);
    }
}
===
card: Что такое мемоизация? :: Запоминание результатов рекурсивных вызовов (в массиве или Map), чтобы не считать одно и то же повторно.
card: Какая ошибка при слишком глубокой рекурсии в Java? :: StackOverflowError — переполнение стека вызовов.

### Модуль: ООП

## java-08 | Классы, объекты, инкапсуляция
Класс описывает поля и методы, объект — конкретный экземпляр:

```java
class Account {
    private final String owner;   // private — снаружи не трогать
    private long balance;

    Account(String owner) {       // конструктор
        this.owner = owner;
    }

    void deposit(long amount) {
        if (amount <= 0) throw new IllegalArgumentException("amount");
        balance += amount;
    }

    long getBalance() { return balance; }

    @Override
    public String toString() { return owner + ": " + balance; }
}

Account acc = new Account("Anna");
acc.deposit(100);
System.out.println(acc);   // Anna: 100
```

**Инкапсуляция**: поля закрыты (`private`), менять их можно только через методы, которые проверяют правила.

`this` — ссылка на текущий объект. `static` поле общее для всех объектов класса.

В одном файле может быть один `public` класс, остальные — без public.

?? Зачем делать поля private?
+ чтобы менять их только через методы с проверками
- чтобы работало быстрее
- private поля нельзя читать даже внутри класса
- так требует компилятор
= Так объект сам следит, чтобы баланс не стал, например, отрицательным.

?? Что такое конструктор?
+ метод с именем класса, который заполняет новый объект
- метод, удаляющий объект
- любой static-метод
- поле класса
= Вызывается при new Account(...).

!! Напиши класс `Stack` на массиве с методами push, pop, isEmpty. Дальше даны команды: `push X`, `pop` (выведи снятое число или `EMPTY`), `end`.
<<<
import java.util.Scanner;

class Stack {
    // твой код
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        Stack st = new Stack();
    }
}
<<<
in: push 1\npush 2\npop\npush 5\npop\npop\npop\nend
out: 2\n5\n1\nEMPTY
in: pop\npush 7\npop\npop\nend
out: EMPTY\n7\nEMPTY
hint: Внутри: `private int[] data = new int[16]; private int size;` — когда места нет, удвой массив `Arrays.copyOf`.
hint: В main читай `in.next()` до "end"; на "push" читай число `in.nextInt()`.
===
import java.util.Arrays;
import java.util.Scanner;

class Stack {
    private int[] data = new int[16];
    private int size;

    void push(int x) {
        if (size == data.length) data = Arrays.copyOf(data, size * 2);
        data[size++] = x;
    }

    int pop() {
        return data[--size];
    }

    boolean isEmpty() {
        return size == 0;
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        Stack st = new Stack();
        StringBuilder out = new StringBuilder();
        while (true) {
            String cmd = in.next();
            if (cmd.equals("end")) break;
            if (cmd.equals("push")) st.push(in.nextInt());
            else out.append(st.isEmpty() ? "EMPTY" : String.valueOf(st.pop())).append('\n');
        }
        System.out.print(out);
    }
}
===
!! {1} Класс `Student` с приватными полями `name` и `score`, конструктором, геттерами и методом `boolean passed()` (балл ≥ 60). Дано n строк «имя балл» — выведи имена сдавших через пробел или `NONE`.
<<<
import java.util.*;

class Student {
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 3\nann 75\nbob 40\neve 60
out: ann eve
in: 1\nkid 10
out: NONE
hint: `List<Student>`, затем собери имена тех, у кого `passed()`.
===
import java.util.*;

class Student {
    private final String name;
    private final int score;
    Student(String name, int score) { this.name = name; this.score = score; }
    String getName() { return name; }
    int getScore() { return score; }
    boolean passed() { return score >= 60; }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<String> ok = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            Student s = new Student(in.next(), in.nextInt());
            if (s.passed()) ok.add(s.getName());
        }
        System.out.println(ok.isEmpty() ? "NONE" : String.join(" ", ok));
    }
}
===
!! {3} Очередь на кольцевом массиве: класс `Queue` с `add(int)`, `poll()` и `size()`. Команды до `end`: `add X`, `poll` (выведи число или `EMPTY`), `size`.
<<<
import java.util.Scanner;

class Queue {
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: add 1\nadd 2\npoll\nadd 3\nsize\npoll\npoll\npoll\nend
out: 1\n2\n2\n3\nEMPTY
in: poll\nadd 1\nadd 2\nadd 3\nadd 4\nadd 5\npoll\nadd 6\nsize\npoll\npoll\npoll\npoll\npoll\nend
out: EMPTY\n1\n5\n2\n3\n4\n5\n6
hint: Поля `head`, `size`, массив `data`. Хвост — `(head + size) % data.length`. При переполнении — увеличь массив, переложив элементы по порядку.
===
import java.util.Scanner;

class Queue {
    private int[] data = new int[4];
    private int head, size;

    void add(int x) {
        if (size == data.length) {
            int[] nd = new int[data.length * 2];
            for (int i = 0; i < size; i++) nd[i] = data[(head + i) % data.length];
            data = nd;
            head = 0;
        }
        data[(head + size) % data.length] = x;
        size++;
    }

    int poll() {
        int x = data[head];
        head = (head + 1) % data.length;
        size--;
        return x;
    }

    int size() { return size; }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        Queue q = new Queue();
        StringBuilder out = new StringBuilder();
        while (true) {
            String cmd = in.next();
            if (cmd.equals("end")) break;
            if (cmd.equals("add")) q.add(in.nextInt());
            else if (cmd.equals("size")) out.append(q.size()).append('\n');
            else out.append(q.size() == 0 ? "EMPTY" : String.valueOf(q.poll())).append('\n');
        }
        System.out.print(out);
    }
}
===
card: Что такое инкапсуляция? :: Поля закрыты (private), доступ — через методы, которые соблюдают правила объекта.
card: Что делает `@Override public String toString()`? :: Задаёт, как объект выглядит при печати и склейке со строкой.

## java-09 | Наследование, интерфейсы, полиморфизм
**Наследование** — класс расширяет другой и получает его поля и методы:

```java
abstract class Shape {
    abstract double area();          // реализация — в наследниках
}

class Circle extends Shape {
    private final double r;
    Circle(double r) { this.r = r; }
    @Override double area() { return Math.PI * r * r; }
}

class Rect extends Shape {
    private final double w, h;
    Rect(double w, double h) { this.w = w; this.h = h; }
    @Override double area() { return w * h; }
}
```

**Полиморфизм**: работаем с общим типом, а вызывается метод настоящего объекта:

```java
Shape[] shapes = { new Circle(1), new Rect(2, 3) };
for (Shape s : shapes) System.out.println(s.area());
```

**Интерфейс** — набор методов без полей, «умение». Класс может реализовать много интерфейсов, но наследоваться только от одного класса:

```java
interface Payable { long price(); }
class Ticket implements Payable { public long price() { return 500; } }
```

`super(...)` вызывает конструктор родителя.

?? Сколько классов может быть родителем одного класса в Java?
+ один (но интерфейсов — сколько угодно)
- сколько угодно
- два
- ни одного
= Множественное наследование есть только у интерфейсов.

?? Что такое полиморфизм?
+ вызов через общий тип выполняет метод реального объекта
- много конструкторов
- перегрузка операторов
- копирование объектов
= s.area() для круга считает по формуле круга, для прямоугольника — прямоугольника.

!! Даны фигуры: n, затем строки `circle r`, `rect w h` или `square a`. Сделай классы-наследники Shape и выведи сумму площадей с двумя знаками после точки.
<<<
import java.util.Locale;
import java.util.Scanner;

abstract class Shape {
    abstract double area();
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in).useLocale(Locale.US);
        int n = in.nextInt();
    }
}
<<<
in: 3\nrect 2 3\nsquare 2\ncircle 1
out: 13.14
in: 1\ncircle 2.5
out: 19.63
hint: Square можно сделать наследником Rect: `super(a, a)`.
hint: Сумма: `total += s.area()`, вывод `System.out.printf(Locale.US, "%.2f%n", total)`.
===
import java.util.Locale;
import java.util.Scanner;

abstract class Shape {
    abstract double area();
}

class Circle extends Shape {
    private final double r;
    Circle(double r) { this.r = r; }
    @Override double area() { return Math.PI * r * r; }
}

class Rect extends Shape {
    private final double w, h;
    Rect(double w, double h) { this.w = w; this.h = h; }
    @Override double area() { return w * h; }
}

class Square extends Rect {
    Square(double a) { super(a, a); }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in).useLocale(Locale.US);
        int n = in.nextInt();
        double total = 0;
        for (int i = 0; i < n; i++) {
            String kind = in.next();
            Shape s = switch (kind) {
                case "circle" -> new Circle(in.nextDouble());
                case "square" -> new Square(in.nextDouble());
                default -> new Rect(in.nextDouble(), in.nextDouble());
            };
            total += s.area();
        }
        System.out.printf(Locale.US, "%.2f%n", total);
    }
}
===
!! {1} Интерфейс `Greeter` с методом `String greet(String name)`. Реализации `Formal` («Здравствуйте, NAME.») и `Friendly` («Привет, NAME!»). Даны тип и имя — выведи приветствие.
<<<
import java.util.Scanner;

interface Greeter {
    String greet(String name);
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String type = in.next(), name = in.next();
    }
}
<<<
in: formal Анна
out: Здравствуйте, Анна.
in: friendly Боря
out: Привет, Боря!
hint: `Greeter g = type.equals("formal") ? new Formal() : new Friendly();`
===
import java.util.Scanner;

interface Greeter {
    String greet(String name);
}

class Formal implements Greeter {
    public String greet(String name) { return "Здравствуйте, " + name + "."; }
}

class Friendly implements Greeter {
    public String greet(String name) { return "Привет, " + name + "!"; }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String type = in.next(), name = in.next();
        Greeter g = type.equals("formal") ? new Formal() : new Friendly();
        System.out.println(g.greet(name));
    }
}
===
!! {3} Абстрактный класс `Animal(name)` с абстрактным `String sound()` и методом `String describe()` = «NAME говорит SOUND». Наследники `Cat` (мяу), `Dog` (гав), `Cow` (му). Дано n строк «вид имя» — выведи описания.
<<<
import java.util.Scanner;

abstract class Animal {
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 3\ncat Барсик\ndog Шарик\ncow Зорька
out: Барсик говорит мяу\nШарик говорит гав\nЗорька говорит му
in: 1\ncat Мурка
out: Мурка говорит мяу
hint: `describe()` объявлен в родителе и вызывает абстрактный `sound()` — работает для любого наследника.
===
import java.util.Scanner;

abstract class Animal {
    protected final String name;
    Animal(String name) { this.name = name; }
    abstract String sound();
    String describe() { return name + " говорит " + sound(); }
}

class Cat extends Animal { Cat(String n) { super(n); } String sound() { return "мяу"; } }
class Dog extends Animal { Dog(String n) { super(n); } String sound() { return "гав"; } }
class Cow extends Animal { Cow(String n) { super(n); } String sound() { return "му"; } }

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        for (int i = 0; i < n; i++) {
            String kind = in.next(), name = in.next();
            Animal a = switch (kind) {
                case "cat" -> new Cat(name);
                case "dog" -> new Dog(name);
                default -> new Cow(name);
            };
            System.out.println(a.describe());
        }
    }
}
===
card: Чем абстрактный класс отличается от интерфейса? :: Абстрактный класс может иметь поля и конструктор, наследоваться можно от одного. Интерфейс — только «умения», реализовать можно много.
card: Что делает `super(a, a)` в конструкторе? :: Вызывает конструктор родительского класса.

## java-16 | equals, hashCode, Comparable
Чтобы свои объекты правильно работали в `HashSet`, `HashMap` и сортировке, им нужны три вещи:

```java
class Point implements Comparable<Point> {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }

    @Override public boolean equals(Object o) {
        if (!(o instanceof Point p)) return false;
        return x == p.x && y == p.y;
    }
    @Override public int hashCode() { return Objects.hash(x, y); }
    @Override public int compareTo(Point o) {
        return x != o.x ? Integer.compare(x, o.x) : Integer.compare(y, o.y);
    }
    @Override public String toString() { return "(" + x + ", " + y + ")"; }
}
```

Правило: **равные объекты обязаны иметь одинаковый hashCode**. Если переопределил equals — переопредели и hashCode, иначе HashSet будет хранить «одинаковые» точки дважды.

`record Point(int x, int y) {}` даёт equals/hashCode/toString автоматически.

?? Что будет, если переопределить equals, но не hashCode?
+ HashSet и HashMap перестанут находить равные объекты
- ошибка компиляции
- ничего страшного
- объекты станут неизменяемыми
= Хеш-коллекции сначала смотрят hashCode, и у «равных» он разный.

?? Что возвращает compareTo?
+ отрицательное, ноль или положительное — меньше, равно, больше
- true или false
- разницу полей всегда
- индекс в массиве
= Для чисел удобно `Integer.compare(a, b)`.

!! {1} Дано n точек. Выведи количество различных точек (используй `HashSet` и свой класс с equals/hashCode).
<<<
import java.util.*;

class Point {
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 5\n1 2\n3 4\n1 2\n0 0\n3 4
out: 3
in: 1\n5 5
out: 1
hint: Код класса — в гайде; добавляй `new Point(x, y)` в `HashSet`.
===
import java.util.*;

class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        if (!(o instanceof Point p)) return false;
        return x == p.x && y == p.y;
    }
    @Override public int hashCode() { return Objects.hash(x, y); }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        Set<Point> s = new HashSet<>();
        for (int i = 0; i < n; i++) s.add(new Point(in.nextInt(), in.nextInt()));
        System.out.println(s.size());
    }
}
===
!! {2} Дано n точек. Отсортируй их по расстоянию от начала координат (при равенстве — по x, затем по y) через `Comparable` и выведи в формате `(x, y)` по одной.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 4\n3 4\n1 1\n-1 -1\n0 5
out: (-1, -1)\n(1, 1)\n(0, 5)\n(3, 4)
in: 1\n0 0
out: (0, 0)
hint: Сравнивай квадраты расстояний `x*x + y*y` — без дробей.
===
import java.util.*;

class Point implements Comparable<Point> {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    long d() { return (long) x * x + (long) y * y; }
    public int compareTo(Point o) {
        if (d() != o.d()) return Long.compare(d(), o.d());
        if (x != o.x) return Integer.compare(x, o.x);
        return Integer.compare(y, o.y);
    }
    public String toString() { return "(" + x + ", " + y + ")"; }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<Point> p = new ArrayList<>();
        for (int i = 0; i < n; i++) p.add(new Point(in.nextInt(), in.nextInt()));
        Collections.sort(p);
        for (Point q : p) System.out.println(q);
    }
}
===
!! {3} Класс `Fraction(num, den)` — неизменяемый, всегда сокращённый, с `add`, `equals`, `hashCode`, `compareTo`, `toString` (`a/b`). Дано n дробей — выведи их сумму, количество различных дробей и наибольшую.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 4\n1/2 2/4 1/3 3/4
out: 25/12 3 3/4
in: 2\n-1/2 1/2
out: 0/1 2 1/2
hint: Сокращай в конструкторе через НОД, знаменатель делай положительным. Сравнение: `a*d` против `c*b` (long).
===
import java.util.*;

final class Fraction implements Comparable<Fraction> {
    final long num, den;
    Fraction(long num, long den) {
        long g = gcd(Math.abs(num), Math.abs(den));
        if (g == 0) g = 1;
        if (den < 0) { num = -num; den = -den; }
        this.num = num / g;
        this.den = den / g;
    }
    static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }
    Fraction add(Fraction o) { return new Fraction(num * o.den + o.num * den, den * o.den); }
    public boolean equals(Object o) { return o instanceof Fraction f && f.num == num && f.den == den; }
    public int hashCode() { return Objects.hash(num, den); }
    public int compareTo(Fraction o) { return Long.compare(num * o.den, o.num * den); }
    public String toString() { return num + "/" + den; }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        Fraction sum = new Fraction(0, 1), best = null;
        Set<Fraction> set = new HashSet<>();
        for (int i = 0; i < n; i++) {
            String[] p = in.next().split("/");
            Fraction f = new Fraction(Long.parseLong(p[0]), Long.parseLong(p[1]));
            sum = sum.add(f);
            set.add(f);
            if (best == null || f.compareTo(best) > 0) best = f;
        }
        System.out.println(sum + " " + set.size() + " " + best);
    }
}
===
card: Какое правило связывает equals и hashCode? :: Равные (по equals) объекты обязаны иметь одинаковый hashCode.
card: Как сделать класс сортируемым через Collections.sort? :: Реализовать `Comparable<T>` и метод `compareTo`.

## java-17 | enum и switch
**enum** — тип с фиксированным набором значений:

```java
enum Day { MON, TUE, WED, THU, FRI, SAT, SUN;
    boolean weekend() { return this == SAT || this == SUN; }
}

Day d = Day.valueOf("SAT");     // из строки
d.ordinal();                    // номер: 5
Day.values();                   // все значения
switch (d) {
    case SAT, SUN -> System.out.println("отдых");
    default -> System.out.println("учёба");
}
```

У enum могут быть поля и конструктор:

```java
enum Coin {
    PENNY(1), NICKEL(5), DIME(10);
    final int cents;
    Coin(int c) { cents = c; }
}
```

`EnumMap` и `EnumSet` — быстрые коллекции для enum-ключей.

?? Что вернёт `Day.SAT.ordinal()` для порядка MON..SUN?
+ 5
- 6
- "SAT"
- 0
= Нумерация с нуля.

?? Что будет при `Day.valueOf("sat")`?
+ IllegalArgumentException — регистр важен
- вернёт SAT
- вернёт null
- ошибка компиляции
= Имена констант сравниваются точно.

!! {1} Дан день недели (`MON`…`SUN`). Выведи `weekend` или `workday` и номер дня от 1.
<<<
import java.util.Scanner;

enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

public class Main {
    public static void main(String[] args) {
        Day d = Day.valueOf(new Scanner(System.in).next());
    }
}
<<<
in: SAT
out: weekend 6
in: MON
out: workday 1
hint: `d.ordinal() + 1`, а выходные — `d == Day.SAT || d == Day.SUN`.
===
import java.util.Scanner;

enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

public class Main {
    public static void main(String[] args) {
        Day d = Day.valueOf(new Scanner(System.in).next());
        System.out.println((d == Day.SAT || d == Day.SUN ? "weekend" : "workday") + " " + (d.ordinal() + 1));
    }
}
===
!! {2} enum `Op` с символом и методом `apply(a, b)`: PLUS(+), MINUS(-), TIMES(*). Дано выражение «a op b» — выведи результат.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        long a = in.nextLong();
        String op = in.next();
        long b = in.nextLong();
    }
}
<<<
in: 6 * 7
out: 42
in: 10 - 15
out: -5
in: 1 + 1
out: 2
hint: Поле `final String sym;` и метод `static Op of(String s)`, который ищет по `values()`.
===
import java.util.Scanner;

enum Op {
    PLUS("+"), MINUS("-"), TIMES("*");
    final String sym;
    Op(String s) { sym = s; }
    long apply(long a, long b) {
        return switch (this) {
            case PLUS -> a + b;
            case MINUS -> a - b;
            case TIMES -> a * b;
        };
    }
    static Op of(String s) {
        for (Op o : values()) if (o.sym.equals(s)) return o;
        throw new IllegalArgumentException(s);
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        long a = in.nextLong();
        String op = in.next();
        long b = in.nextLong();
        System.out.println(Op.of(op).apply(a, b));
    }
}
===
!! {3} Светофор-автомат: enum `Light` (RED → GREEN → YELLOW → RED) с длительностями 30, 25, 5 секунд. Дано начальное состояние и t секунд — выведи, какой свет будет через t секунд (в начале момента 0 свет только включился).
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String start = in.next();
        long t = in.nextLong();
    }
}
<<<
in: RED 29
out: RED
in: RED 30
out: GREEN
in: GREEN 1000
out: RED
hint: Метод `next()` у enum и поле `duration`. t можно сразу взять по модулю 60 (полный цикл).
===
import java.util.Scanner;

enum Light {
    RED(30), GREEN(25), YELLOW(5);
    final int duration;
    Light(int d) { duration = d; }
    Light next() { return values()[(ordinal() + 1) % values().length]; }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        Light l = Light.valueOf(in.next());
        long t = in.nextLong() % 60;
        while (t >= l.duration) {
            t -= l.duration;
            l = l.next();
        }
        System.out.println(l);
    }
}
===
card: Как получить enum из строки? :: `Day.valueOf("SAT")` (регистр важен), все значения — `Day.values()`.
card: Могут ли у enum быть поля и методы? :: Да: поля, конструктор (приватный по смыслу) и любые методы.

## java-18 | Обобщения (Generics)
Обобщения позволяют писать классы и методы для любого типа без потери проверки типов:

```java
class Box<T> {
    private T value;
    void set(T v) { value = v; }
    T get() { return value; }
}
Box<String> b = new Box<>();

static <T extends Comparable<T>> T maxOf(List<T> list) {
    T best = list.get(0);
    for (T x : list) if (x.compareTo(best) > 0) best = x;
    return best;
}

record Pair<A, B>(A first, B second) {}
```

- `<T>` — параметр типа
- `<T extends Comparable<T>>` — ограничение: T умеет сравниваться
- `List<?>` — список чего угодно, `List<? extends Number>` — чисел любого типа

В рантайме типы стираются (type erasure): нельзя `new T()` и `new T[10]`.

?? Зачем `<T extends Comparable<T>>`?
+ чтобы внутри метода можно было вызывать compareTo у T
- чтобы T был числом
- для скорости
- это наследование классов
= Компилятор гарантирует, что T умеет сравниваться.

?? Можно ли написать `new T()` внутри Box<T>?
+ нет — из-за стирания типов T неизвестен в рантайме
- да
- только для чисел
- только в record
= Обходят через передачу фабрики или Class<T>.

!! {1} Обобщённый метод `static <T extends Comparable<T>> T maxOf(List<T>)`. Дано n чисел и m слов — выведи максимальное число и максимальное (по алфавиту) слово.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: 3\n5 -2 9\n2\napple pear
out: 9 pear
in: 1\n0\n1\nz
out: 0 z
hint: Один метод — два вызова: `maxOf(nums)` и `maxOf(words)`.
===
import java.util.*;

public class Main {
    static <T extends Comparable<T>> T maxOf(List<T> list) {
        T best = list.get(0);
        for (T x : list) if (x.compareTo(best) > 0) best = x;
        return best;
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<Integer> nums = new ArrayList<>();
        for (int i = 0; i < n; i++) nums.add(in.nextInt());
        int m = in.nextInt();
        List<String> words = new ArrayList<>();
        for (int i = 0; i < m; i++) words.add(in.next());
        System.out.println(maxOf(nums) + " " + maxOf(words));
    }
}
===
!! {2} Свой обобщённый стек `Stack<T>` на `ArrayList` с `push`, `pop`, `peek`, `isEmpty`. Проверь правильность скобок `()[]{}` в строке (выведи `YES`/`NO`).
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        String s = new Scanner(System.in).next();
    }
}
<<<
in: ([]{})
out: YES
in: ([)]
out: NO
in: (((
out: NO
hint: `class Stack<T> { private final List<T> data = new ArrayList<>(); ... }` и стек `Stack<Character>`.
===
import java.util.*;

class Stack<T> {
    private final List<T> data = new ArrayList<>();
    void push(T x) { data.add(x); }
    T pop() { return data.remove(data.size() - 1); }
    T peek() { return data.get(data.size() - 1); }
    boolean isEmpty() { return data.isEmpty(); }
}

public class Main {
    public static void main(String[] args) {
        String s = new Scanner(System.in).next();
        Stack<Character> st = new Stack<>();
        String open = "([{", close = ")]}";
        boolean ok = true;
        for (char c : s.toCharArray()) {
            if (open.indexOf(c) >= 0) st.push(c);
            else {
                int k = close.indexOf(c);
                if (st.isEmpty() || st.pop() != open.charAt(k)) { ok = false; break; }
            }
        }
        System.out.println(ok && st.isEmpty() ? "YES" : "NO");
    }
}
===
!! {3} Обобщённый класс `Cache<K, V>` (LRU) вместимостью c: при добавлении сверх меры удаляется давно не использованный ключ. Команды до `end`: `put k v`, `get k` (выведи значение или `MISS`). Подсказка: `LinkedHashMap` с порядком доступа.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int cap = in.nextInt();
    }
}
<<<
in: 2\nput a 1\nput b 2\nget a\nput c 3\nget b\nget a\nget c\nend
out: 1\nMISS\n1\n3
in: 1\nput x 1\nput y 2\nget x\nget y\nend
out: MISS\n2
hint: `new LinkedHashMap<>(16, 0.75f, true)` и переопредели `removeEldestEntry`.
===
import java.util.*;

class Cache<K, V> extends LinkedHashMap<K, V> {
    private final int cap;
    Cache(int cap) {
        super(16, 0.75f, true);
        this.cap = cap;
    }
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > cap; }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int cap = in.nextInt();
        Cache<String, String> c = new Cache<>(cap);
        StringBuilder out = new StringBuilder();
        while (true) {
            String cmd = in.next();
            if (cmd.equals("end")) break;
            if (cmd.equals("put")) c.put(in.next(), in.next());
            else {
                String v = c.get(in.next());
                out.append(v == null ? "MISS" : v).append('\n');
            }
        }
        System.out.print(out);
    }
}
===
card: Что такое стирание типов (type erasure)? :: Параметры обобщений есть только при компиляции; в рантайме List<String> — просто List. Поэтому нельзя `new T()`.
card: Что значит `<T extends Comparable<T>>`? :: T — любой тип, который умеет сравниваться сам с собой; внутри можно вызывать compareTo.

### Модуль: Коллекции и потоки

## java-10 | Коллекции: List, Map, Set
Массив фиксированной длины, а коллекции растут сами:

```java
import java.util.*;

List<Integer> list = new ArrayList<>();
list.add(5);
list.add(3);
list.get(0);          // 5
list.size();          // 2
Collections.sort(list);

Map<String, Integer> count = new HashMap<>();
count.put("a", 1);
count.merge("a", 1, Integer::sum);   // +1 к значению
count.getOrDefault("b", 0);

Set<String> seen = new HashSet<>();
seen.add("x");
seen.contains("x");   // true
```

В угловых скобках — тип элементов. Примитивы туда нельзя: вместо `int` пишут `Integer`, вместо `double` — `Double`.

`TreeMap` и `TreeSet` хранят ключи **отсортированными**. `ArrayDeque` — очередь и стек.

Перебор словаря:

```java
for (Map.Entry<String, Integer> e : count.entrySet()) {
    System.out.println(e.getKey() + " " + e.getValue());
}
```

?? Почему нельзя написать `List<int>`?
+ в коллекциях только объекты — нужен Integer
- можно, это нормально
- нужно писать List<number>
- List не хранит числа
= Примитивы автоматически упаковываются в Integer.

?? Какая коллекция хранит ключи по возрастанию?
- HashMap
+ TreeMap
- ArrayList
- HashSet
= HashMap — без порядка, TreeMap — отсортировано.

!! Дан текст (одна строка, слова через пробел, латиница в нижнем регистре). Выведи каждое слово и число его повторов в алфавитном порядке слов, по одному на строку.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        String line = new Scanner(System.in).nextLine();
    }
}
<<<
in: the cat and the dog and the bird
out: and 2\nbird 1\ncat 1\ndog 1\nthe 3
in: a a a
out: a 3
hint: TreeMap сам отсортирует ключи по алфавиту.
hint: `map.merge(word, 1, Integer::sum)` прибавляет 1.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        String line = new Scanner(System.in).nextLine();
        Map<String, Integer> count = new TreeMap<>();
        for (String w : line.trim().split("\\s+")) count.merge(w, 1, Integer::sum);
        for (Map.Entry<String, Integer> e : count.entrySet()) System.out.println(e.getKey() + " " + e.getValue());
    }
}
===
!! {1} Дано n чисел. Выведи уникальные числа в порядке первого появления (используй `LinkedHashSet`).
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 7\n3 1 3 2 1 5 3
out: 3 1 2 5
in: 3\n9 9 9
out: 9
hint: `Set<Integer> s = new LinkedHashSet<>();` хранит порядок добавления.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        Set<Integer> s = new LinkedHashSet<>();
        for (int i = 0; i < n; i++) s.add(in.nextInt());
        StringBuilder sb = new StringBuilder();
        for (int x : s) sb.append(sb.length() > 0 ? " " : "").append(x);
        System.out.println(sb);
    }
}
===
!! {2} Дано n строк «студент предмет». Выведи для каждого предмета (по алфавиту) список студентов по алфавиту: «предмет: имя1, имя2».
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 4\nann math\nbob physics\neve math\ndan math
out: math: ann, dan, eve\nphysics: bob
in: 1\nmax art
out: art: max
hint: `Map<String, TreeSet<String>> m = new TreeMap<>();` и `m.computeIfAbsent(subj, k -> new TreeSet<>()).add(name)`.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        Map<String, TreeSet<String>> m = new TreeMap<>();
        for (int i = 0; i < n; i++) {
            String name = in.next(), subj = in.next();
            m.computeIfAbsent(subj, k -> new TreeSet<>()).add(name);
        }
        for (Map.Entry<String, TreeSet<String>> e : m.entrySet()) System.out.println(e.getKey() + ": " + String.join(", ", e.getValue()));
    }
}
===
card: Чем HashMap отличается от TreeMap? :: HashMap — быстрый, без порядка. TreeMap — ключи отсортированы, операции O(log n).
card: Как прибавить 1 к счётчику в Map одной строкой? :: `map.merge(key, 1, Integer::sum)`

## java-19 | Deque, PriorityQueue, TreeMap
Больше структур из `java.util`:

```java
Deque<Integer> dq = new ArrayDeque<>();    // и стек, и очередь
dq.addLast(1); dq.addFirst(0);
dq.pollFirst(); dq.pollLast(); dq.peekFirst();

PriorityQueue<Integer> pq = new PriorityQueue<>();          // сверху минимум
PriorityQueue<Integer> maxPq = new PriorityQueue<>(Comparator.reverseOrder());
pq.add(5); pq.poll(); pq.peek();

TreeMap<Integer, String> tm = new TreeMap<>();
tm.floorKey(7);      // наибольший ключ ≤ 7
tm.ceilingKey(7);    // наименьший ≥ 7
tm.firstKey(); tm.lastKey(); tm.headMap(5); tm.tailMap(5);
```

PriorityQueue (куча) — «дай минимум» за O(log n): планировщики задач, Дейкстра, k наибольших. TreeMap/TreeSet — упорядоченные данные и поиск ближайшего.

?? Что вернёт `poll()` у `new PriorityQueue<>()` после add(5), add(1), add(3)?
+ 1
- 5
- 3
- [1, 3, 5]
= По умолчанию куча отдаёт минимум.

?? Что делает `floorKey(x)` у TreeMap?
+ наибольший ключ, не больший x (или null)
- округляет x
- наименьший ключ
- удаляет ключи меньше x
= ceilingKey — наоборот, наименьший ≥ x.

!! {1} Дано n чисел и k. Выведи k наибольших по убыванию, используя PriorityQueue размера k.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 6\n5 1 9 3 7 2\n3
out: 9 7 5
in: 3\n4 4 4\n2
out: 4 4
hint: Мин-куча: добавляй, а если размер > k — `poll()`. В конце достань всё и разверни.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
        int k = in.nextInt();
        PriorityQueue<Integer> pq = new PriorityQueue<>();
        for (int x : a) {
            pq.add(x);
            if (pq.size() > k) pq.poll();
        }
        List<Integer> res = new ArrayList<>(pq);
        res.sort(Comparator.reverseOrder());
        StringBuilder sb = new StringBuilder();
        for (int x : res) sb.append(sb.length() > 0 ? " " : "").append(x);
        System.out.println(sb);
    }
}
===
!! {2} Скользящий максимум: дано n чисел и окно k. Выведи максимум каждого окна за O(n) с помощью Deque (храни индексы убывающих элементов).
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 8\n1 3 -1 -3 5 3 6 7\n3
out: 3 3 5 5 6 7
in: 3\n2 1 2\n1
out: 2 1 2
hint: Удаляй с конца индексы элементов ≤ текущего; с начала — вышедшие за окно; голова — максимум.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
        int k = in.nextInt();
        Deque<Integer> dq = new ArrayDeque<>();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast();
            dq.addLast(i);
            if (dq.peekFirst() <= i - k) dq.pollFirst();
            if (i >= k - 1) sb.append(sb.length() > 0 ? " " : "").append(a[dq.peekFirst()]);
        }
        System.out.println(sb);
    }
}
===
!! {3} Расписание: даны n занятий «начало конец» (минуты). Для q запросов «время» выведи начало последнего занятия, начавшегося не позже этого времени, или `NONE` (TreeMap.floorKey).
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 3\n540 630\n640 730\n800 890\n4\n500 600 640 1000
out: NONE\n540\n640\n800
in: 1\n100 200\n2\n99 100
out: NONE\n100
hint: Ключи TreeMap — начала занятий; `floorKey(t)` даст ответ.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        TreeMap<Integer, Integer> tm = new TreeMap<>();
        for (int i = 0; i < n; i++) tm.put(in.nextInt(), in.nextInt());
        int q = in.nextInt();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < q; i++) {
            Integer k = tm.floorKey(in.nextInt());
            sb.append(k == null ? "NONE" : String.valueOf(k)).append('\n');
        }
        System.out.print(sb);
    }
}
===
card: Как сделать PriorityQueue с максимумом сверху? :: `new PriorityQueue<>(Comparator.reverseOrder())`
card: Чем ArrayDeque лучше Stack и LinkedList? :: Быстрее и без лишней синхронизации; работает и как стек (push/pop), и как очередь (offer/poll).

## java-12 | Лямбды и Stream API
Лямбда — короткая функция: `(a, b) -> a + b`, `x -> x * 2`.

Сортировка своим правилом через `Comparator`:

```java
List<String> words = new ArrayList<>(List.of("pear", "fig", "apple"));
words.sort(Comparator.comparing(String::length).thenComparing(Comparator.naturalOrder()));
// [fig, pear, apple]
```

**Stream** — конвейер обработки коллекции:

```java
List<Integer> nums = List.of(5, 2, 8, 3);
int sumOfEvenSquares = nums.stream()
    .filter(x -> x % 2 == 0)   // оставить чётные
    .map(x -> x * x)           // возвести в квадрат
    .reduce(0, Integer::sum);  // сложить → 68

List<String> names = people.stream()
    .sorted(Comparator.comparingInt(Person::age).reversed())
    .map(Person::name)
    .toList();
```

`String::length` — ссылка на метод, то же что `s -> s.length()`.

**record** — короткий класс для данных: `record Person(String name, int age) {}` — сам даст конструктор, геттеры `name()`, `age()`, equals и toString.

?? Что вернёт `List.of(1, 2, 3, 4).stream().filter(x -> x > 2).count()`?
- 4
+ 2
- 7
- [3, 4]
= Остаются 3 и 4 — их два.

?? Что делает `record Point(int x, int y) {}`?
+ класс с полями, конструктором, x(), y(), equals и toString
- массив из двух чисел
- интерфейс
- переменную
= record избавляет от ручного кода для простых данных.

!! Дано n, затем n строк «имя возраст» (имя латиницей). Выведи имена тех, кому 18 и больше, отсортировав по возрасту по убыванию, а при равенстве — по имени. Имена через пробел. Если никого — `NONE`.
<<<
import java.util.*;

public class Main {
    record Person(String name, int age) {}

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 4\nanna 19\nboris 17\nvika 21\ngleb 19
out: vika anna gleb
in: 1\nkid 10
out: NONE
hint: Собери `List<Person>`, затем stream().filter(p -> p.age() >= 18).
hint: `.sorted(Comparator.comparingInt(Person::age).reversed().thenComparing(Person::name))`, потом `.map(Person::name)` и `String.join(" ", ...)`.
===
import java.util.*;

public class Main {
    record Person(String name, int age) {}

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<Person> people = new ArrayList<>();
        for (int i = 0; i < n; i++) people.add(new Person(in.next(), in.nextInt()));
        List<String> adults = people.stream()
            .filter(p -> p.age() >= 18)
            .sorted(Comparator.comparingInt(Person::age).reversed().thenComparing(Person::name))
            .map(Person::name)
            .toList();
        System.out.println(adults.isEmpty() ? "NONE" : String.join(" ", adults));
    }
}
===
!! {1} Дано n чисел. Через Stream API выведи сумму квадратов чётных чисел.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<Integer> a = new ArrayList<>();
        for (int i = 0; i < n; i++) a.add(in.nextInt());
    }
}
<<<
in: 5\n1 2 3 4 5
out: 20
in: 2\n1 3
out: 0
hint: `a.stream().filter(x -> x % 2 == 0).mapToLong(x -> (long) x * x).sum()`
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<Integer> a = new ArrayList<>();
        for (int i = 0; i < n; i++) a.add(in.nextInt());
        System.out.println(a.stream().filter(x -> x % 2 == 0).mapToLong(x -> (long) x * x).sum());
    }
}
===
!! {2} Дано n слов. Через `Collectors.groupingBy` сгруппируй слова по длине и выведи для каждой длины (по возрастанию): «длина: слова через пробел» (слова по алфавиту, без повторов).
<<<
import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 6\ncat dog apple ox pear cat
out: 2: ox\n3: cat dog\n4: pear\n5: apple
in: 1\nz
out: 1: z
hint: `Collectors.groupingBy(String::length, TreeMap::new, Collectors.toCollection(TreeSet::new))`
===
import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<String> w = new ArrayList<>();
        for (int i = 0; i < n; i++) w.add(in.next());
        Map<Integer, TreeSet<String>> g = w.stream().collect(Collectors.groupingBy(String::length, TreeMap::new, Collectors.toCollection(TreeSet::new)));
        g.forEach((len, set) -> System.out.println(len + ": " + String.join(" ", set)));
    }
}
===
card: Что делает `stream().filter(...).map(...).toList()`? :: Оставляет подходящие элементы, преобразует каждый и собирает в список.
card: Как отсортировать по возрасту по убыванию, а при равенстве по имени? :: `Comparator.comparingInt(Person::age).reversed().thenComparing(Person::name)`

## java-20 | Collectors, Optional и обработка данных
Продвинутые стримы:

```java
Map<String, Long> cnt = words.stream()
    .collect(Collectors.groupingBy(w -> w, TreeMap::new, Collectors.counting()));

Map<Boolean, List<Integer>> parts = nums.stream()
    .collect(Collectors.partitioningBy(x -> x % 2 == 0));

String joined = names.stream().collect(Collectors.joining(", ", "[", "]"));

double avg = people.stream().mapToInt(Person::age).average().orElse(0);

Optional<Person> oldest = people.stream().max(Comparator.comparingInt(Person::age));
oldest.map(Person::name).orElse("никого");
```

**Optional** — «значение или пусто» вместо null: `isPresent()`, `orElse(x)`, `map(...)`, `ifPresent(...)`.

`IntStream.range(0, n)`, `.boxed()`, `.distinct()`, `.limit(k)`, `.skip(k)`, `.anyMatch(...)`.

?? Что вернёт `Stream.of(3, 1, 2).max(Integer::compare)`?
+ Optional[3]
- 3
- null
- [3]
= Поток может быть пустым — поэтому Optional.

?? Что делает `Collectors.partitioningBy(p)`?
+ делит элементы на две группы: true и false по условию
- сортирует
- считает элементы
- удаляет дубли
= Результат — Map<Boolean, List<T>>.

!! {1} Дано n чисел. Через `partitioningBy` выведи на первой строке чётные, на второй — нечётные (в исходном порядке, через пробел; пустая группа — `-`).
<<<
import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 6\n1 2 3 4 5 6
out: 2 4 6\n1 3 5
in: 2\n1 3
out: -\n1 3
hint: `parts.get(true)` и `parts.get(false)`; строку собери `Collectors.joining(" ")`.
===
import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<Integer> a = new ArrayList<>();
        for (int i = 0; i < n; i++) a.add(in.nextInt());
        Map<Boolean, List<Integer>> p = a.stream().collect(Collectors.partitioningBy(x -> x % 2 == 0));
        for (boolean key : new boolean[] {true, false}) {
            List<Integer> l = p.get(key);
            System.out.println(l.isEmpty() ? "-" : l.stream().map(String::valueOf).collect(Collectors.joining(" ")));
        }
    }
}
===
!! {2} Дано n строк «город температура». Для каждого города (по алфавиту) выведи среднюю температуру с 1 знаком (`String.format(Locale.US, "%.1f", ...)`).
<<<
import java.util.*;
import java.util.stream.*;

public class Main {
    record Row(String city, int t) {}

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 4\nMoscow -5\nSochi 12\nMoscow -1\nSochi 14
out: Moscow -3.0\nSochi 13.0
in: 1\nPerm 0
out: Perm 0.0
hint: `groupingBy(Row::city, TreeMap::new, Collectors.averagingInt(Row::t))`
===
import java.util.*;
import java.util.stream.*;

public class Main {
    record Row(String city, int t) {}

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<Row> rows = new ArrayList<>();
        for (int i = 0; i < n; i++) rows.add(new Row(in.next(), in.nextInt()));
        Map<String, Double> avg = rows.stream().collect(Collectors.groupingBy(Row::city, TreeMap::new, Collectors.averagingInt(Row::t)));
        avg.forEach((c, a) -> System.out.println(c + " " + String.format(Locale.US, "%.1f", a)));
    }
}
===
!! {3} Дано n строк «имя возраст город». Выведи: самого старшего (имя, при равенстве — первый по алфавиту), средний возраст с 1 знаком, и город с наибольшим числом жителей (при равенстве — по алфавиту). Если n = 0 — `EMPTY`.
<<<
import java.util.*;
import java.util.stream.*;

public class Main {
    record P(String name, int age, String city) {}

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 4\nann 30 Kazan\nbob 41 Perm\neve 41 Kazan\ndan 20 Omsk
out: bob 33.0 Kazan
in: 0
out: EMPTY
hint: `max(Comparator.comparingInt(P::age).thenComparing(P::name, Comparator.reverseOrder()))` — старший, а при равенстве первый по алфавиту.
===
import java.util.*;
import java.util.stream.*;

public class Main {
    record P(String name, int age, String city) {}

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<P> ps = new ArrayList<>();
        for (int i = 0; i < n; i++) ps.add(new P(in.next(), in.nextInt(), in.next()));
        Optional<P> oldest = ps.stream().max(Comparator.comparingInt(P::age).thenComparing(P::name, Comparator.reverseOrder()));
        if (oldest.isEmpty()) {
            System.out.println("EMPTY");
            return;
        }
        double avg = ps.stream().mapToInt(P::age).average().orElse(0);
        Map<String, Long> byCity = ps.stream().collect(Collectors.groupingBy(P::city, TreeMap::new, Collectors.counting()));
        String city = byCity.entrySet().stream().max(Map.Entry.<String, Long>comparingByValue().thenComparing(Map.Entry.comparingByKey(Comparator.reverseOrder()))).get().getKey();
        System.out.println(oldest.get().name() + " " + String.format(Locale.US, "%.1f", avg) + " " + city);
    }
}
===
card: Зачем Optional вместо null? :: Явно показывает «значения может не быть» и даёт orElse/map/ifPresent вместо проверок на null.
card: Как посчитать частоты слов стримом? :: `groupingBy(w -> w, Collectors.counting())` (с TreeMap::new — по алфавиту).

### Модуль: Ошибки и файлы

## java-11 | Исключения
Ошибка во время работы — **исключение**. Его можно поймать:

```java
try {
    int x = Integer.parseInt("12a");
} catch (NumberFormatException e) {
    System.out.println("not a number: " + e.getMessage());
} finally {
    System.out.println("done");   // всегда
}
```

Два вида:
- **checked** (`IOException`) — компилятор заставит обработать или объявить `throws`
- **unchecked** (`RuntimeException`: `NullPointerException`, `ArithmeticException`, `IllegalArgumentException`) — можно не объявлять

Бросить своё:

```java
if (age < 0) throw new IllegalArgumentException("age < 0");
```

Свой тип ошибки — наследник Exception:

```java
class NotEnoughMoney extends RuntimeException {
    NotEnoughMoney(String msg) { super(msg); }
}
```

try-with-resources сам закроет файл: `try (var r = new BufferedReader(new FileReader("a.txt"))) { ... }`

?? Что выведет код?
```java
try {
    System.out.println(10 / 0);
} catch (ArithmeticException e) {
    System.out.println("zero");
} finally {
    System.out.println("end");
}
```
- 0 end
+ zero end
- zero
- программа упадёт
= Деление целого на 0 бросает ArithmeticException, finally выполняется всегда.

?? Что будет, если не обработать checked-исключение?
+ программа не скомпилируется
- программа упадёт при запуске
- ничего
- исключение превратится в unchecked
= Нужно поймать или написать throws в сигнатуре.

!! Даны строки до слова `end`. Каждая — либо целое число, либо мусор. Выведи сумму чисел и количество строк-мусора через пробел. Используй Integer.parseInt и try/catch.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: 10\nabc\n-4\n3.5\n7\nend
out: 13 2
in: end
out: 0 0
hint: Читай `in.nextLine()` в цикле, пока не встретишь "end".
hint: `try { sum += Integer.parseInt(s.trim()); } catch (NumberFormatException e) { bad++; }`
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        long sum = 0;
        int bad = 0;
        while (in.hasNextLine()) {
            String s = in.nextLine().trim();
            if (s.equals("end")) break;
            try {
                sum += Integer.parseInt(s);
            } catch (NumberFormatException e) {
                bad++;
            }
        }
        System.out.println(sum + " " + bad);
    }
}
===
!! {1} Дано a и b. Выведи `a / b` (целочисленно). Если b = 0 — поймай `ArithmeticException` и выведи `division by zero`.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int a = in.nextInt(), b = in.nextInt();
    }
}
<<<
in: 7 2
out: 3
in: 5 0
out: division by zero
hint: `try { System.out.println(a / b); } catch (ArithmeticException e) { ... }`
===
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int a = in.nextInt(), b = in.nextInt();
        try {
            System.out.println(a / b);
        } catch (ArithmeticException e) {
            System.out.println("division by zero");
        }
    }
}
===
!! {2} Метод `static int parsePositive(String s)` бросает `IllegalArgumentException("not positive")`, если число ≤ 0, и пропускает `NumberFormatException` дальше. Даны строки до `end` — для каждой выведи число, `not positive` или `not a number`.
<<<
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: 5\n-3\nabc\n0\n42\nend
out: 5\nnot positive\nnot a number\nnot positive\n42
in: 1000000\n99999999999\nend
out: 1000000\nnot a number
hint: Два `catch`: сначала `NumberFormatException`, потом `IllegalArgumentException` (первый — наследник второго!).
===
import java.util.Scanner;

public class Main {
    static int parsePositive(String s) {
        int x = Integer.parseInt(s);
        if (x <= 0) throw new IllegalArgumentException("not positive");
        return x;
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String s = in.nextLine().trim();
            if (s.equals("end")) break;
            try {
                System.out.println(parsePositive(s));
            } catch (NumberFormatException e) {
                System.out.println("not a number");
            } catch (IllegalArgumentException e) {
                System.out.println(e.getMessage());
            }
        }
    }
}
===
card: Чем checked-исключения отличаются от unchecked? :: Checked (IOException) компилятор требует обработать или объявить throws. Unchecked (RuntimeException) — нет.
card: Когда выполняется finally? :: Всегда — и после успеха, и после исключения.

## java-21 | Свои исключения и try-with-resources
Своё исключение — наследник `Exception` (checked) или `RuntimeException` (unchecked):

```java
class InsufficientFundsException extends Exception {
    final long need;
    InsufficientFundsException(long need) {
        super("не хватает " + need);
        this.need = need;
    }
}

void withdraw(long x) throws InsufficientFundsException {
    if (x > balance) throw new InsufficientFundsException(x - balance);
    balance -= x;
}
```

**try-with-resources** сам закрывает файлы и потоки, даже при ошибке:

```java
try (BufferedReader r = Files.newBufferedReader(Path.of("in.txt"))) {
    String line;
    while ((line = r.readLine()) != null) { ... }
} catch (IOException e) {
    System.out.println("не прочитать: " + e.getMessage());
}
```

Ресурс — любой класс с `AutoCloseable`. Несколько ресурсов — через `;` в скобках. Не глотай исключения пустым `catch {}` — хотя бы сообщи.

?? Когда своё исключение лучше сделать наследником RuntimeException?
+ когда это ошибка программиста или её не стоит обязательно обрабатывать
- всегда
- когда нужно сообщение
- никогда
= Checked — для ожидаемых ситуаций (нет файла, нет денег), которые вызывающий должен обработать.

?? Что гарантирует try-with-resources?
+ close() вызовется автоматически при выходе из блока
- что исключений не будет
- что файл существует
- что программа не упадёт
= Даже если внутри брошено исключение.

!! {1} Своё исключение `InsufficientFundsException` и счёт с `withdraw`. Дан начальный баланс и суммы снятий — для каждой выведи новый баланс или `не хватает N`.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        long balance = in.nextLong();
        int n = in.nextInt();
    }
}
<<<
in: 100\n3\n30 80 70
out: 70\nне хватает 10\n0
in: 0\n1\n5
out: не хватает 5
hint: Брось исключение с недостающей суммой и поймай его в цикле.
===
import java.util.*;

class InsufficientFundsException extends Exception {
    InsufficientFundsException(long need) { super("не хватает " + need); }
}

class Account {
    long balance;
    Account(long b) { balance = b; }
    void withdraw(long x) throws InsufficientFundsException {
        if (x > balance) throw new InsufficientFundsException(x - balance);
        balance -= x;
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        Account a = new Account(in.nextLong());
        int n = in.nextInt();
        for (int i = 0; i < n; i++) {
            try {
                a.withdraw(in.nextLong());
                System.out.println(a.balance);
            } catch (InsufficientFundsException e) {
                System.out.println(e.getMessage());
            }
        }
    }
}
===
!! {2} Свой ресурс `Logger implements AutoCloseable`: метод `log(String)` печатает `LOG: текст`, `close()` печатает `закрыт`. Даны строки до `end`; на строке `boom` брось исключение (поймай снаружи и выведи `ошибка: boom`). Логгер должен закрыться в любом случае.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: a\nb\nend
out: LOG: a\nLOG: b\nзакрыт
in: a\nboom\nc\nend
out: LOG: a\nзакрыт\nошибка: boom
hint: `try (Logger lg = new Logger()) { ... } catch (RuntimeException e) { ... }` — close вызовется до catch.
===
import java.util.*;

class Logger implements AutoCloseable {
    void log(String s) { System.out.println("LOG: " + s); }
    public void close() { System.out.println("закрыт"); }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        try (Logger lg = new Logger()) {
            while (in.hasNextLine()) {
                String s = in.nextLine().trim();
                if (s.equals("end")) break;
                if (s.equals("boom")) throw new RuntimeException("boom");
                lg.log(s);
            }
        } catch (RuntimeException e) {
            System.out.println("ошибка: " + e.getMessage());
        }
    }
}
===
!! {3} Валидатор анкет: строки «имя;возраст;email» до `end`. Для каждой брось и поймай своё `ValidationException` с понятной причиной: пустое имя → `пустое имя`, возраст не число или вне 14..120 → `плохой возраст`, email без `@` или точки после неё → `плохой email`. Выведи `ok имя` или `ошибка: причина`, в конце — `верно X из Y`.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: аня;19;ann@mail.ru\n;20;x@y.z\nборя;abc;b@b.ru\nвика;200;v@v.ru\nгена;30;gena.mail.ru\nдима;25;d@site\nend
out: ok аня\nошибка: пустое имя\nошибка: плохой возраст\nошибка: плохой возраст\nошибка: плохой email\nошибка: плохой email\nверно 1 из 6
in: ок;14;a@b.c\nok2;120;x@y.ru\nend
out: ok ок\nok ok2\nверно 2 из 2
hint: `split(";", -1)` сохранит пустые поля. Проверки по очереди, на первой неудаче — throw.
===
import java.util.*;

class ValidationException extends Exception {
    ValidationException(String m) { super(m); }
}

public class Main {
    static String check(String line) throws ValidationException {
        String[] p = line.split(";", -1);
        if (p.length < 3 || p[0].trim().isEmpty()) throw new ValidationException("пустое имя");
        int age;
        try {
            age = Integer.parseInt(p[1].trim());
        } catch (NumberFormatException e) {
            throw new ValidationException("плохой возраст");
        }
        if (age < 14 || age > 120) throw new ValidationException("плохой возраст");
        String email = p[2].trim();
        int at = email.indexOf('@');
        if (at <= 0 || email.indexOf('.', at) < 0) throw new ValidationException("плохой email");
        return p[0].trim();
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int ok = 0, total = 0;
        while (in.hasNextLine()) {
            String s = in.nextLine();
            if (s.trim().equals("end")) break;
            total++;
            try {
                System.out.println("ok " + check(s));
                ok++;
            } catch (ValidationException e) {
                System.out.println("ошибка: " + e.getMessage());
            }
        }
        System.out.println("верно " + ok + " из " + total);
    }
}
===
card: Как создать своё checked-исключение? :: `class MyException extends Exception { MyException(String m) { super(m); } }` и `throws MyException` в сигнатуре.
card: Что нужно классу, чтобы использовать его в try-with-resources? :: Реализовать `AutoCloseable` (метод close()).

### Модуль: Алгоритмы

## java-13 | Алгоритмы: сортировка, бинпоиск, очередь
В Java многое уже реализовано и быстро:
- `Arrays.sort(int[])` — O(n log n)
- `Arrays.binarySearch(a, x)` — O(log n), массив должен быть отсортирован
- `Collections.sort(list)`

Для быстрого ввода больших данных `Scanner` медленный — используют `BufferedReader`:

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
StringTokenizer st = new StringTokenizer(br.readLine());
int n = Integer.parseInt(st.nextToken());
```

Вывод много строк — копи в `StringBuilder` и печатай один раз.

**Очередь и BFS**:

```java
ArrayDeque<Integer> q = new ArrayDeque<>();
q.add(start);
while (!q.isEmpty()) {
    int v = q.poll();
    for (int to : g.get(v)) { ... }
}
```

**Префиксные суммы**: `pref[i + 1] = pref[i] + a[i]` — сумма на отрезке [l, r] за O(1): `pref[r + 1] - pref[l]`.

?? Как за O(1) найти сумму элементов с l по r, если есть префиксные суммы pref?
+ pref[r + 1] - pref[l]
- pref[r] + pref[l]
- pref[r] - pref[l - 1] * 2
- нужен цикл
= pref[i] — сумма первых i элементов.

?? Почему для большого ввода берут BufferedReader, а не Scanner?
+ Scanner заметно медленнее на больших данных
- Scanner не читает числа
- BufferedReader сам сортирует
- это одно и то же
= Scanner разбирает ввод регулярными выражениями — это дорого.

!! Дан массив из n чисел и q запросов «l r» (индексы с 1). Для каждого запроса выведи сумму на отрезке [l, r]. Используй префиксные суммы (long!).
<<<
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    }
}
<<<
in: 5 3\n1 2 3 4 5\n1 5\n2 3\n4 4
out: 15\n5\n4
in: 3 1\n1000000000 1000000000 1000000000\n1 3
out: 3000000000
hint: pref — массив long длины n + 1; pref[i + 1] = pref[i] + a[i].
hint: Ответ на запрос: pref[r] - pref[l - 1] (индексы с 1).
===
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken());
        int q = Integer.parseInt(st.nextToken());
        long[] pref = new long[n + 1];
        st = new StringTokenizer(br.readLine());
        for (int i = 0; i < n; i++) pref[i + 1] = pref[i] + Long.parseLong(st.nextToken());
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < q; i++) {
            st = new StringTokenizer(br.readLine());
            int l = Integer.parseInt(st.nextToken());
            int r = Integer.parseInt(st.nextToken());
            out.append(pref[r] - pref[l - 1]).append('\n');
        }
        System.out.print(out);
    }
}
===
!! {2} Дан отсортированный массив и q запросов x. Для каждого выведи `YES`, если x есть в массиве (`Arrays.binarySearch`), иначе `NO`.
<<<
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    }
}
<<<
in: 5\n1 3 5 7 9\n3\n3 4 9
out: YES\nNO\nYES
in: 1\n0\n1\n0
out: YES
hint: `Arrays.binarySearch(a, x) >= 0` — найдено.
===
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());
        int[] a = Arrays.stream(br.readLine().trim().split("\\s+")).mapToInt(Integer::parseInt).toArray();
        int q = Integer.parseInt(br.readLine().trim());
        StringTokenizer st = new StringTokenizer(br.readLine());
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < q; i++) out.append(Arrays.binarySearch(a, Integer.parseInt(st.nextToken())) >= 0 ? "YES" : "NO").append('\n');
        System.out.print(out);
    }
}
===
!! {3} Дано n чисел. Найди максимальную сумму подотрезка (алгоритм Кадане, O(n)). Числа могут быть отрицательными, отрезок непустой.
<<<
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    }
}
<<<
in: 9\n-2 1 -3 4 -1 2 1 -5 4
out: 6
in: 3\n-5 -1 -3
out: -1
hint: `cur = max(x, cur + x); best = max(best, cur);`
===
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());
        StringTokenizer st = new StringTokenizer(br.readLine());
        long best = Long.MIN_VALUE, cur = 0;
        for (int i = 0; i < n; i++) {
            long x = Long.parseLong(st.nextToken());
            cur = Math.max(x, cur + x);
            best = Math.max(best, cur);
        }
        System.out.println(best);
    }
}
===
card: Что такое префиксные суммы? :: pref[i] — сумма первых i элементов. Сумма на отрезке [l, r] = pref[r + 1] − pref[l] за O(1).
card: Как быстро вывести много строк в Java? :: Собрать в StringBuilder и напечатать один раз.

## java-22 | Сортировки и бинарный поиск
`Arrays.sort` для примитивов — быстрая сортировка (dual-pivot quicksort), для объектов — устойчивая сортировка слиянием (TimSort).

Сортировка с компаратором:

```java
Integer[] a = {3, 1, 2};
Arrays.sort(a, Comparator.reverseOrder());
int[][] segs = ...;
Arrays.sort(segs, (x, y) -> x[1] != y[1] ? Integer.compare(x[1], y[1]) : Integer.compare(x[0], y[0]));
```

Осторожно: `(x, y) -> x - y` может переполниться — используй `Integer.compare`.

**Бинпоиск по ответу**: если «можно ли за X?» монотонно (при большем X тоже можно) — ищем минимальный X бинпоиском:

```java
long lo = 0, hi = 1_000_000_000L;
while (lo < hi) {
    long mid = (lo + hi) / 2;
    if (can(mid)) hi = mid; else lo = mid + 1;
}
```

?? Почему компаратор `(x, y) -> x - y` опасен?
+ разность может переполнить int и дать неверный знак
- он медленный
- не компилируется
- сортирует по убыванию
= Integer.compare(x, y) безопасен.

?? Когда применим бинпоиск по ответу?
+ когда проверка «подходит ли X» монотонна по X
- всегда
- только для отсортированных массивов
- только для целых чисел
= Например: «успеем ли за X дней» — если успеем за X, то и за X+1.

!! {1} Дано n слов. Отсортируй по длине по убыванию, при равной длине — по алфавиту, и выведи через пробел.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 5\npear fig apple kiwi plum
out: apple kiwi pear plum fig
in: 1\nx
out: x
hint: `Comparator.comparingInt(String::length).reversed().thenComparing(Comparator.naturalOrder())`
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        List<String> w = new ArrayList<>();
        for (int i = 0; i < n; i++) w.add(in.next());
        w.sort(Comparator.comparingInt(String::length).reversed().thenComparing(Comparator.naturalOrder()));
        System.out.println(String.join(" ", w));
    }
}
===
!! {2} Реализуй быструю сортировку (quicksort) сам, без Arrays.sort, и выведи результат.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
    }
}
<<<
in: 7\n5 2 9 1 5 6 0
out: 0 1 2 5 5 6 9
in: 1\n3
out: 3
in: 4\n2 2 2 1
out: 1 2 2 2
hint: Опорный — средний элемент; два указателя i, j сходятся, меняя «неправильные» элементы; рекурсивно левую и правую части.
===
import java.util.*;

public class Main {
    static void qs(int[] a, int l, int r) {
        if (l >= r) return;
        int p = a[(l + r) >>> 1], i = l, j = r;
        while (i <= j) {
            while (a[i] < p) i++;
            while (a[j] > p) j--;
            if (i <= j) {
                int t = a[i]; a[i] = a[j]; a[j] = t;
                i++; j--;
            }
        }
        qs(a, l, j);
        qs(a, i, r);
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = in.nextInt();
        qs(a, 0, n - 1);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(i > 0 ? " " : "").append(a[i]);
        System.out.println(sb);
    }
}
===
!! {3} Бинпоиск по ответу: n книг с числом страниц и k студентов. Книги раздают подряд (каждому — непрерывный кусок). Минимизируй максимальное число страниц у одного студента и выведи его.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), k = in.nextInt();
    }
}
<<<
in: 4 2\n12 34 67 90
out: 113
in: 3 3\n5 5 5
out: 5
in: 5 1\n1 2 3 4 5
out: 15
hint: `can(X)` — жадно набирай книги студенту, пока сумма ≤ X; считай студентов. Ищи минимальный X с `can(X)` от max(a) до sum(a).
===
import java.util.*;

public class Main {
    static int[] a;

    static boolean can(long x, int k) {
        int students = 1;
        long cur = 0;
        for (int v : a) {
            if (v > x) return false;
            if (cur + v > x) {
                students++;
                cur = 0;
            }
            cur += v;
        }
        return students <= k;
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), k = in.nextInt();
        a = new int[n];
        long lo = 0, hi = 0;
        for (int i = 0; i < n; i++) {
            a[i] = in.nextInt();
            lo = Math.max(lo, a[i]);
            hi += a[i];
        }
        while (lo < hi) {
            long mid = (lo + hi) / 2;
            if (can(mid, k)) hi = mid;
            else lo = mid + 1;
        }
        System.out.println(lo);
    }
}
===
card: Какая сортировка у Arrays.sort для объектов? :: Устойчивая сортировка слиянием (TimSort); для примитивов — dual-pivot quicksort.
card: Шаблон бинпоиска «минимальный X, при котором можно»? :: `while (lo < hi) { mid = (lo + hi) / 2; if (can(mid)) hi = mid; else lo = mid + 1; }`

## java-23 | Графы: BFS и DFS
Граф храним списком смежности:

```java
List<List<Integer>> g = new ArrayList<>();
for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
g.get(u).add(v);
g.get(v).add(u);
```

**BFS** — кратчайшие пути по числу рёбер:

```java
int[] dist = new int[n + 1];
Arrays.fill(dist, -1);
ArrayDeque<Integer> q = new ArrayDeque<>();
dist[s] = 0; q.add(s);
while (!q.isEmpty()) {
    int v = q.poll();
    for (int to : g.get(v))
        if (dist[to] == -1) { dist[to] = dist[v] + 1; q.add(to); }
}
```

**DFS** итеративно (стеком) — чтобы не упасть с StackOverflow на больших графах. Применения: компоненты связности, проверка двудольности (раскраска в 2 цвета), поиск цикла.

?? Почему BFS находит кратчайший путь?
+ вершины обходятся слоями: сначала все на расстоянии 1, потом 2…
- он смотрит все пути
- он идёт по рёбрам с меньшим весом
- случайно
= Для графа с весами нужен Дейкстра.

?? Что значит «граф двудольный»?
+ вершины можно раскрасить в 2 цвета так, что каждое ребро соединяет разные цвета
- у графа две компоненты
- у каждой вершины по 2 соседа
- граф — дерево
= Проверяется BFS/DFS с раскраской; нечётный цикл — не двудольный.

!! {1} Дан граф (n m, затем m рёбер) и вершины s, t. Выведи длину кратчайшего пути из s в t (в рёбрах) или -1.
<<<
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    }
}
<<<
in: 5 5\n1 2\n2 3\n3 4\n1 5\n5 4\n1 4
out: 2
in: 3 1\n1 2\n1 3
out: -1
hint: BFS из s; ответ — dist[t].
===
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken()), m = Integer.parseInt(st.nextToken());
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            st = new StringTokenizer(br.readLine());
            int u = Integer.parseInt(st.nextToken()), v = Integer.parseInt(st.nextToken());
            g.get(u).add(v);
            g.get(v).add(u);
        }
        st = new StringTokenizer(br.readLine());
        int s = Integer.parseInt(st.nextToken()), t = Integer.parseInt(st.nextToken());
        int[] dist = new int[n + 1];
        Arrays.fill(dist, -1);
        ArrayDeque<Integer> q = new ArrayDeque<>();
        dist[s] = 0;
        q.add(s);
        while (!q.isEmpty()) {
            int v = q.poll();
            for (int to : g.get(v)) if (dist[to] == -1) { dist[to] = dist[v] + 1; q.add(to); }
        }
        System.out.println(dist[t]);
    }
}
===
!! {2} Проверь, двудольный ли граф (n m и рёбра). Выведи `YES` или `NO`.
<<<
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    }
}
<<<
in: 4 4\n1 2\n2 3\n3 4\n4 1
out: YES
in: 3 3\n1 2\n2 3\n3 1
out: NO
in: 3 0
out: YES
hint: color[v] = -1 — не покрашена. BFS из каждой непокрашенной: соседу — противоположный цвет; совпадение — NO.
===
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken()), m = Integer.parseInt(st.nextToken());
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            st = new StringTokenizer(br.readLine());
            int u = Integer.parseInt(st.nextToken()), v = Integer.parseInt(st.nextToken());
            g.get(u).add(v);
            g.get(v).add(u);
        }
        int[] color = new int[n + 1];
        Arrays.fill(color, -1);
        for (int s = 1; s <= n; s++) {
            if (color[s] != -1) continue;
            color[s] = 0;
            ArrayDeque<Integer> q = new ArrayDeque<>(List.of(s));
            while (!q.isEmpty()) {
                int v = q.poll();
                for (int to : g.get(v)) {
                    if (color[to] == -1) { color[to] = 1 - color[v]; q.add(to); }
                    else if (color[to] == color[v]) { System.out.println("NO"); return; }
                }
            }
        }
        System.out.println("YES");
    }
}
===
!! {3} Острова: дана карта n×m из `#` (суша) и `.` (вода). Выведи количество островов и размер самого большого (соседи — по 4 сторонам). Обходи стеком, без рекурсии.
<<<
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    }
}
<<<
in: 4 5\n##..#\n#...#\n..#..\n.....
out: 3 3
in: 1 1\n.
out: 0 0
hint: Клетку кодируй числом `i * m + j`, стек — `ArrayDeque<Integer>`.
===
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken()), m = Integer.parseInt(st.nextToken());
        char[][] g = new char[n][];
        for (int i = 0; i < n; i++) g[i] = br.readLine().toCharArray();
        boolean[][] used = new boolean[n][m];
        int[] dx = {1, -1, 0, 0}, dy = {0, 0, 1, -1};
        int count = 0, best = 0;
        for (int i = 0; i < n; i++)
            for (int j = 0; j < m; j++) {
                if (g[i][j] != '#' || used[i][j]) continue;
                count++;
                int size = 0;
                ArrayDeque<Integer> stack = new ArrayDeque<>();
                stack.push(i * m + j);
                used[i][j] = true;
                while (!stack.isEmpty()) {
                    int c = stack.pop(), x = c / m, y = c % m;
                    size++;
                    for (int k = 0; k < 4; k++) {
                        int nx = x + dx[k], ny = y + dy[k];
                        if (nx >= 0 && nx < n && ny >= 0 && ny < m && g[nx][ny] == '#' && !used[nx][ny]) {
                            used[nx][ny] = true;
                            stack.push(nx * m + ny);
                        }
                    }
                }
                best = Math.max(best, size);
            }
        System.out.println(count + " " + best);
    }
}
===
card: Почему DFS на больших графах лучше писать стеком? :: Рекурсия в Java может упасть со StackOverflowError на глубине ~10⁴.
card: Как проверить граф на двудольность? :: Красить BFS-ом в 2 цвета; если ребро соединяет одинаковые цвета — не двудольный.

## java-24 | Динамическое программирование
ДП в Java — массивы `long[]` и `long[][]`. Пример — число путей в сетке с препятствиями:

```java
long[][] dp = new long[n][m];
dp[0][0] = grid[0][0] == '.' ? 1 : 0;
for (int i = 0; i < n; i++)
    for (int j = 0; j < m; j++) {
        if (grid[i][j] == '#') { dp[i][j] = 0; continue; }
        if (i > 0) dp[i][j] += dp[i - 1][j];
        if (j > 0) dp[i][j] += dp[i][j - 1];
    }
```

Большие ответы берут **по модулю** `1_000_000_007` — прибавляй и сразу бери `% MOD`.

Ещё классика: **расстояние Левенштейна** (минимум вставок/удалений/замен, чтобы одна строка стала другой) — `dp[i][j]` по префиксам; **разбиение числа**, **рюкзак**, **НОП**.

?? Зачем считать ответ по модулю 10⁹+7?
+ число путей растёт экспоненциально и не влезает даже в long
- чтобы было быстрее
- так требует Java
- для отрицательных чисел
= Модуль — простое число, удобное для деления по модулю.

?? Что хранит dp[i][j] в задаче Левенштейна?
+ минимальное число правок, чтобы первые i символов a превратить в первые j символов b
- длину общей подстроки
- число совпадающих букв
- позицию ошибки
= Переход — минимум из удаления, вставки и замены (или совпадения).

!! {1} Сетка n×m, двигаться можно только вправо и вниз. Сколько путей из левого верхнего угла в правый нижний? Ответ по модулю 10^9+7.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), m = in.nextInt();
    }
}
<<<
in: 3 3
out: 6
in: 1 5
out: 1
in: 100 100
out: 690285631
hint: `dp[i][j] = dp[i-1][j] + dp[i][j-1]`, первая строка и столбец — единицы.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), m = in.nextInt();
        final long MOD = 1_000_000_007L;
        long[][] dp = new long[n][m];
        for (int i = 0; i < n; i++)
            for (int j = 0; j < m; j++) {
                if (i == 0 || j == 0) dp[i][j] = 1;
                else dp[i][j] = (dp[i - 1][j] + dp[i][j - 1]) % MOD;
            }
        System.out.println(dp[n - 1][m - 1]);
    }
}
===
!! {2} То же, но в сетке есть препятствия `#` (n m, затем строки из `.` и `#`). Ответ по модулю 10^9+7.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), m = in.nextInt();
    }
}
<<<
in: 3 3\n...\n.#.\n...
out: 2
in: 2 2\n.#\n#.
out: 0
in: 1 1\n.
out: 1
hint: Код — в гайде; на клетке `#` путей 0.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt(), m = in.nextInt();
        char[][] g = new char[n][];
        for (int i = 0; i < n; i++) g[i] = in.next().toCharArray();
        final long MOD = 1_000_000_007L;
        long[][] dp = new long[n][m];
        for (int i = 0; i < n; i++)
            for (int j = 0; j < m; j++) {
                if (g[i][j] == '#') continue;
                if (i == 0 && j == 0) dp[i][j] = 1;
                if (i > 0) dp[i][j] += dp[i - 1][j];
                if (j > 0) dp[i][j] += dp[i][j - 1];
                dp[i][j] %= MOD;
            }
        System.out.println(dp[n - 1][m - 1]);
    }
}
===
!! {3} Расстояние Левенштейна: даны две строки. Выведи минимальное число вставок, удалений и замен символов, чтобы получить из первой вторую.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String a = in.next(), b = in.next();
    }
}
<<<
in: kitten\nsitting
out: 3
in: abc\nabc
out: 0
in: a\nxyz
out: 3
hint: `dp[i][0] = i`, `dp[0][j] = j`; `dp[i][j] = min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] != b[j-1] ? 1 : 0))`.
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        String a = in.next(), b = in.next();
        int n = a.length(), m = b.length();
        int[][] dp = new int[n + 1][m + 1];
        for (int i = 0; i <= n; i++) dp[i][0] = i;
        for (int j = 0; j <= m; j++) dp[0][j] = j;
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= m; j++)
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + (a.charAt(i - 1) != b.charAt(j - 1) ? 1 : 0));
        System.out.println(dp[n][m]);
    }
}
===
card: Почему ответы в ДП часто берут по модулю 1e9+7? :: Числа растут экспоненциально и переполняют даже long; модуль — простое, удобное число.
card: Переход в расстоянии Левенштейна? :: `min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (символы различны ? 1 : 0))`.

### Модуль: Проекты

## java-25 | Проект: библиотека книг (ООП + коллекции)
Соберём консольную систему учёта: классы-сущности, сервис с логикой и разбор команд.

```java
record Book(int id, String title, String author) {}

class Library {
    private final Map<Integer, Book> books = new TreeMap<>();
    private final Map<Integer, String> taken = new HashMap<>();  // id → кто взял
    void add(Book b) { books.put(b.id(), b); }
    boolean take(int id, String who) {
        if (!books.containsKey(id) || taken.containsKey(id)) return false;
        taken.put(id, who);
        return true;
    }
}
```

Принципы:
- **сущности** (Book) — только данные;
- **сервис** (Library) — правила: нельзя взять уже выданную книгу;
- **main** — только читает команды и печатает ответы.

Так код легко менять: правило поменялось — правим только сервис.

?? Зачем отделять логику (Library) от ввода-вывода (main)?
+ чтобы правила можно было проверить и переиспользовать без консоли
- так быстрее
- иначе не компилируется
- чтобы было больше классов
= Тот же Library подойдёт для сайта или бота.

?? Почему для книг взят TreeMap?
+ чтобы список книг всегда выводился по возрастанию id
- он быстрее HashMap
- в HashMap нельзя хранить record
- TreeMap экономит память
= TreeMap хранит ключи отсортированными.

!! {1} Шаг 1. Команды до `end`: `add id название автор` (слова без пробелов), `list` — все книги по id: «id название автор». Если книг нет — `пусто`.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: add 2 Идиот Достоевский\nadd 1 Онегин Пушкин\nlist\nend
out: 1 Онегин Пушкин\n2 Идиот Достоевский
in: list\nend
out: пусто
hint: `record Book` и `TreeMap<Integer, Book>`.
===
import java.util.*;

record Book(int id, String title, String author) {}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        Map<Integer, Book> books = new TreeMap<>();
        while (true) {
            String cmd = in.next();
            if (cmd.equals("end")) break;
            if (cmd.equals("add")) {
                int id = in.nextInt();
                books.put(id, new Book(id, in.next(), in.next()));
            } else if (cmd.equals("list")) {
                if (books.isEmpty()) System.out.println("пусто");
                for (Book b : books.values()) System.out.println(b.id() + " " + b.title() + " " + b.author());
            }
        }
    }
}
===
!! {2} Шаг 2. Добавь `take id кто` (выведи `выдана` или `нельзя`), `back id` (`возвращена` или `нельзя`), а в `list` у выданных книг допиши `(у кто)`.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: add 1 Онегин Пушкин\nadd 2 Идиот Достоевский\ntake 1 аня\ntake 1 боря\ntake 5 боря\nlist\nback 1\nback 1\nlist\nend
out: выдана\nнельзя\nнельзя\n1 Онегин Пушкин (у аня)\n2 Идиот Достоевский\nвозвращена\nнельзя\n1 Онегин Пушкин\n2 Идиот Достоевский
in: list\nback 1\nadd 7 Война Толстой\ntake 7 миша\nlist\nend
out: пусто\nнельзя\nвыдана\n7 Война Толстой (у миша)
hint: `Map<Integer, String> taken` — у кого книга.
===
import java.util.*;

record Book(int id, String title, String author) {}

class Library {
    private final Map<Integer, Book> books = new TreeMap<>();
    private final Map<Integer, String> taken = new HashMap<>();
    void add(Book b) { books.put(b.id(), b); }
    boolean take(int id, String who) {
        if (!books.containsKey(id) || taken.containsKey(id)) return false;
        taken.put(id, who);
        return true;
    }
    boolean back(int id) { return taken.remove(id) != null; }
    List<String> list() {
        List<String> out = new ArrayList<>();
        for (Book b : books.values()) out.add(b.id() + " " + b.title() + " " + b.author() + (taken.containsKey(b.id()) ? " (у " + taken.get(b.id()) + ")" : ""));
        return out;
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        Library lib = new Library();
        while (true) {
            String cmd = in.next();
            if (cmd.equals("end")) break;
            switch (cmd) {
                case "add" -> { int id = in.nextInt(); lib.add(new Book(id, in.next(), in.next())); }
                case "take" -> System.out.println(lib.take(in.nextInt(), in.next()) ? "выдана" : "нельзя");
                case "back" -> System.out.println(lib.back(in.nextInt()) ? "возвращена" : "нельзя");
                case "list" -> {
                    List<String> l = lib.list();
                    if (l.isEmpty()) System.out.println("пусто");
                    l.forEach(System.out::println);
                }
            }
        }
    }
}
===
!! {3} Шаг 3. Добавь `author имя` — книги автора по названию (или `нет`), `top` — читатели по числу когда-либо взятых книг по убыванию (при равенстве по алфавиту): «имя число» (или `нет`). Остальные команды — как в шаге 2.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
    }
}
<<<
in: add 1 Онегин Пушкин\nadd 2 Пиковая Пушкин\nadd 3 Идиот Достоевский\ntake 1 аня\nback 1\ntake 1 боря\ntake 2 аня\ntake 3 аня\nauthor Пушкин\nauthor Толстой\ntop\nend
out: выдана\nвозвращена\nвыдана\nвыдана\nвыдана\nОнегин Пиковая\nнет\nаня 3\nборя 1
in: top\nend
out: нет
hint: Счётчик `Map<String, Integer> reads`, увеличивай при успешном take. Для `top` — сортировка entrySet.
===
import java.util.*;

record Book(int id, String title, String author) {}

class Library {
    private final Map<Integer, Book> books = new TreeMap<>();
    private final Map<Integer, String> taken = new HashMap<>();
    private final Map<String, Integer> reads = new HashMap<>();
    void add(Book b) { books.put(b.id(), b); }
    boolean take(int id, String who) {
        if (!books.containsKey(id) || taken.containsKey(id)) return false;
        taken.put(id, who);
        reads.merge(who, 1, Integer::sum);
        return true;
    }
    boolean back(int id) { return taken.remove(id) != null; }
    List<String> list() {
        List<String> out = new ArrayList<>();
        for (Book b : books.values()) out.add(b.id() + " " + b.title() + " " + b.author() + (taken.containsKey(b.id()) ? " (у " + taken.get(b.id()) + ")" : ""));
        return out;
    }
    List<String> byAuthor(String a) {
        return books.values().stream().filter(b -> b.author().equals(a)).map(Book::title).sorted().toList();
    }
    List<String> top() {
        return reads.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
            .map(e -> e.getKey() + " " + e.getValue()).toList();
    }
}

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        Library lib = new Library();
        while (true) {
            String cmd = in.next();
            if (cmd.equals("end")) break;
            switch (cmd) {
                case "add" -> { int id = in.nextInt(); lib.add(new Book(id, in.next(), in.next())); }
                case "take" -> System.out.println(lib.take(in.nextInt(), in.next()) ? "выдана" : "нельзя");
                case "back" -> System.out.println(lib.back(in.nextInt()) ? "возвращена" : "нельзя");
                case "list" -> lib.list().forEach(System.out::println);
                case "author" -> {
                    List<String> l = lib.byAuthor(in.next());
                    System.out.println(l.isEmpty() ? "нет" : String.join(" ", l));
                }
                case "top" -> {
                    List<String> l = lib.top();
                    if (l.isEmpty()) System.out.println("нет");
                    l.forEach(System.out::println);
                }
            }
        }
    }
}
===
card: Как разделить код консольной программы? :: Сущности (данные) → сервис (правила) → main (ввод-вывод). Логику можно проверять и переиспользовать.
card: Как отсортировать Map по значению по убыванию, а при равенстве по ключу? :: `entrySet().stream().sorted(Map.Entry.<K,V>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))`

## java-26 | Проект: интернет-магазин (корзина, заказы, исключения)
Ещё один проект ближе к реальной работе: каталог товаров, корзина, оформление заказа с проверками.

```java
record Product(String sku, String name, long price, int stock) {}

class Cart {
    private final Map<String, Integer> items = new LinkedHashMap<>();
    void add(String sku, int qty) { items.merge(sku, qty, Integer::sum); }
}

class OutOfStockException extends Exception { ... }
```

Деньги храним в **целых копейках** (`long`), а не в `double`: 0.1 + 0.2 в double ≠ 0.3.

Заказ оформляется **атомарно**: сначала проверяем всё (наличие каждого товара), и только если всё хорошо — списываем остатки. Иначе — ничего не меняем.

?? Почему деньги не хранят в double?
+ двоичные дроби неточны: 0.1 + 0.2 = 0.30000000000000004
- double медленнее
- double не бывает отрицательным
- так принято только в Java
= Храни копейки в long или используй BigDecimal.

?? Что значит «оформить заказ атомарно»?
+ либо проходят все изменения, либо никакие
- очень быстро
- по одному товару
- без проверок
= Нельзя списать половину товаров и упасть на второй половине.

!! {1} Шаг 1. Каталог: n строк «sku цена_в_копейках остаток». Затем команды до `end`: `price sku` — цена в рублях с копейками `123.45` (или `нет товара`).
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 2\nmilk 8990 5\nbread 4505 2\nprice milk\nprice bread\nprice cheese\nend
out: 89.90\n45.05\nнет товара
in: 1\ntea 5 1\nprice tea\nend
out: 0.05
hint: `String.format("%d.%02d", p / 100, p % 100)`
===
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        Map<String, long[]> cat = new HashMap<>();
        for (int i = 0; i < n; i++) cat.put(in.next(), new long[] {in.nextLong(), in.nextLong()});
        while (true) {
            String cmd = in.next();
            if (cmd.equals("end")) break;
            if (cmd.equals("price")) {
                long[] p = cat.get(in.next());
                System.out.println(p == null ? "нет товара" : String.format("%d.%02d", p[0] / 100, p[0] % 100));
            }
        }
    }
}
===
!! {2} Шаг 2. Корзина: `add sku qty`, `total` — сумма корзины `123.45`, `remove sku`. Неизвестный sku в add — `нет товара`.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 2\nmilk 8990 5\nbread 4505 2\nadd milk 2\nadd bread 1\nadd cheese 1\ntotal\nremove milk\ntotal\nend
out: нет товара\n224.85\n45.05
in: 1\ntea 105 9\ntotal\nadd tea 3\nadd tea 2\ntotal\nend
out: 0.00\n5.25
hint: Корзина — `LinkedHashMap<String, Integer>`, сумма — цена × количество.
===
import java.util.*;

public class Main {
    static String money(long p) { return String.format("%d.%02d", p / 100, p % 100); }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        Map<String, long[]> cat = new HashMap<>();
        for (int i = 0; i < n; i++) cat.put(in.next(), new long[] {in.nextLong(), in.nextLong()});
        Map<String, Integer> cart = new LinkedHashMap<>();
        while (true) {
            String cmd = in.next();
            if (cmd.equals("end")) break;
            switch (cmd) {
                case "add" -> {
                    String sku = in.next();
                    int q = in.nextInt();
                    if (!cat.containsKey(sku)) System.out.println("нет товара");
                    else cart.merge(sku, q, Integer::sum);
                }
                case "remove" -> cart.remove(in.next());
                case "total" -> {
                    long s = 0;
                    for (var e : cart.entrySet()) s += cat.get(e.getKey())[0] * e.getValue();
                    System.out.println(money(s));
                }
            }
        }
    }
}
===
!! {3} Шаг 3. `order` — оформить: если какого-то товара не хватает, бросить и поймать `OutOfStockException` и вывести `не хватает sku` (первый по порядку добавления), ничего не списывая. Иначе списать остатки, очистить корзину и вывести `заказ на 123.45`. `stock sku` — остаток.
<<<
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
    }
}
<<<
in: 2\nmilk 8990 5\nbread 4505 2\nadd milk 2\nadd bread 3\norder\nstock bread\nremove bread\nadd bread 2\norder\nstock milk\nstock bread\ntotal\nend
out: не хватает bread\n2\nзаказ на 269.90\n3\n0\n0.00
in: 1\ntea 100 1\nadd tea 2\norder\nremove tea\nadd tea 1\norder\nstock tea\nadd tea 1\norder\nend
out: не хватает tea\nзаказ на 1.00\n0\nне хватает tea
hint: Сначала пройди корзину и проверь все остатки (throw при нехватке), только потом во втором цикле списывай.
===
import java.util.*;

class OutOfStockException extends Exception {
    OutOfStockException(String sku) { super("не хватает " + sku); }
}

class Shop {
    final Map<String, long[]> cat = new HashMap<>();
    final Map<String, Integer> cart = new LinkedHashMap<>();
    long total() {
        long s = 0;
        for (var e : cart.entrySet()) s += cat.get(e.getKey())[0] * e.getValue();
        return s;
    }
    long order() throws OutOfStockException {
        for (var e : cart.entrySet()) if (cat.get(e.getKey())[1] < e.getValue()) throw new OutOfStockException(e.getKey());
        long s = total();
        for (var e : cart.entrySet()) cat.get(e.getKey())[1] -= e.getValue();
        cart.clear();
        return s;
    }
}

public class Main {
    static String money(long p) { return String.format("%d.%02d", p / 100, p % 100); }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        Shop shop = new Shop();
        for (int i = 0; i < n; i++) shop.cat.put(in.next(), new long[] {in.nextLong(), in.nextLong()});
        while (true) {
            String cmd = in.next();
            if (cmd.equals("end")) break;
            switch (cmd) {
                case "add" -> {
                    String sku = in.next();
                    int q = in.nextInt();
                    if (!shop.cat.containsKey(sku)) System.out.println("нет товара");
                    else shop.cart.merge(sku, q, Integer::sum);
                }
                case "remove" -> shop.cart.remove(in.next());
                case "total" -> System.out.println(money(shop.total()));
                case "stock" -> System.out.println(shop.cat.get(in.next())[1]);
                case "order" -> {
                    try {
                        System.out.println("заказ на " + money(shop.order()));
                    } catch (OutOfStockException e) {
                        System.out.println(e.getMessage());
                    }
                }
            }
        }
    }
}
===
card: Как правильно хранить деньги в программе? :: В целых копейках (long) или BigDecimal — не в double.
card: Что значит атомарная операция (на примере заказа)? :: Сначала проверить всё, потом менять; либо все изменения проходят, либо ни одно.
