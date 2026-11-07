# Java

Java — строгий язык с классами: на нём пишут серверы банков и маркетплейсов, Android-приложения и большие системы. Здесь всё объявляется явно — это дисциплинирует и хорошо учит ООП. 13 уроков: от первой программы до коллекций, интерфейсов, исключений и стримов.

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
card: Как получить последнюю цифру числа n? :: `n % 10`, а убрать её — `n / 10`.
card: Что будет, если к `Integer.MAX_VALUE` прибавить 1? :: Переполнение: получится `Integer.MIN_VALUE` (отрицательное). Нужен long.

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
card: Как превратить символ-цифру '7' в число 7? :: `c - '0'`
card: Почему `s += x` в цикле — плохо? :: String неизменяем, каждый раз копируется вся строка: O(n²). Используй StringBuilder.

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
card: Алгоритм Евклида для НОД? :: Пока b ≠ 0: (a, b) = (b, a % b). Ответ — a.
card: Что такое перегрузка метода? :: Несколько методов с одним именем, но разными параметрами.

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
card: Чем абстрактный класс отличается от интерфейса? :: Абстрактный класс может иметь поля и конструктор, наследоваться можно от одного. Интерфейс — только «умения», реализовать можно много.
card: Что делает `super(a, a)` в конструкторе? :: Вызывает конструктор родительского класса.

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
card: Чем HashMap отличается от TreeMap? :: HashMap — быстрый, без порядка. TreeMap — ключи отсортированы, операции O(log n).
card: Как прибавить 1 к счётчику в Map одной строкой? :: `map.merge(key, 1, Integer::sum)`

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
card: Чем checked-исключения отличаются от unchecked? :: Checked (IOException) компилятор требует обработать или объявить throws. Unchecked (RuntimeException) — нет.
card: Когда выполняется finally? :: Всегда — и после успеха, и после исключения.

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
card: Что делает `stream().filter(...).map(...).toList()`? :: Оставляет подходящие элементы, преобразует каждый и собирает в список.
card: Как отсортировать по возрасту по убыванию, а при равенстве по имени? :: `Comparator.comparingInt(Person::age).reversed().thenComparing(Person::name)`

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
card: Что такое префиксные суммы? :: pref[i] — сумма первых i элементов. Сумма на отрезке [l, r] = pref[r + 1] − pref[l] за O(1).
card: Как быстро вывести много строк в Java? :: Собрать в StringBuilder и напечатать один раз.
