# C++

C++ — быстрый язык «близко к железу»: игры, браузеры, движки, олимпиадное программирование и почти все курсы алгоритмов в вузах. Ты сам управляешь памятью и типами, зато программа летает. 28 уроков в 6 модулях: основы, массивы и функции, память и ООП (RAII, умные указатели, операторы, виртуальные функции), STL, алгоритмы (бинпоиск по ответу, префиксы, монотонный стек, ДП, графы, DSU, биты) и два проекта. В каждом уроке несколько задач от ★ до ★★★, в конце модуля — итоговый тест.

### Модуль: Основы

## cpp-01 | Первая программа, cout и переменные
```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, C++!" << endl;
    cout << 2 + 3 << "\n";
    return 0;
}
```

- `#include <iostream>` подключает ввод-вывод
- `using namespace std;` — чтобы писать `cout`, а не `std::cout`
- программа начинается с `main`, `return 0` — «всё хорошо»
- `<<` отправляет значение в поток вывода; `endl` или `"\n"` — новая строка

Типы:

```cpp
int a = 5;              // целое, до ~2·10⁹
long long big = 1e18;   // большое целое
double x = 3.14;
bool ok = true;
char c = 'A';
string s = "text";      // нужен #include <string>
```

Целочисленное деление: `7 / 2 == 3`, остаток `7 % 2 == 1`.

`const int N = 100;` — константа.

?? Что выведет `cout << 7 / 2 << " " << 7 % 2;`?
- 3.5 1
+ 3 1
- 3 0
- 4 1
= Целые делятся нацело, % — остаток.

?? Зачем `using namespace std;`?
+ чтобы писать cout вместо std::cout
- чтобы подключить iostream
- без неё не работает main
- для скорости
= Это открывает пространство имён стандартной библиотеки.

!! Выведи две строки: `Hello, C++!` и количество секунд в часе (посчитай выражением).
<<<
#include <iostream>
using namespace std;

int main() {
    // твой код
    return 0;
}
<<<
in:
out: Hello, C++!\n3600
hint: Две строки cout с "\n" или endl.
hint: Секунд в часе: 60 * 60.
===
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, C++!" << "\n";
    cout << 60 * 60 << "\n";
    return 0;
}
===
!! {1} Выведи на трёх строках: 2 в 30-й степени (через сдвиг `1 << 30`), остаток от деления 1000 на 7 и `7 / 2.0`.
<<<
#include <iostream>
using namespace std;

int main() {
    return 0;
}
<<<
in:
out: 1073741824\n6\n3.5
hint: `cout << (1 << 30)`. Дробное деление — когда хотя бы одно число дробное.
===
#include <iostream>
using namespace std;

int main() {
    cout << (1 << 30) << "\n" << 1000 % 7 << "\n" << 7 / 2.0 << "\n";
    return 0;
}
===
!! {2} Есть `int a = 17, b = 5;`. Поменяй их местами через третью переменную и выведи `a b`, а на второй строке — `std::swap` их обратно и выведи снова.
<<<
#include <iostream>
#include <utility>
using namespace std;

int main() {
    int a = 17, b = 5;
    return 0;
}
<<<
in:
out: 5 17\n17 5
hint: `int t = a; a = b; b = t;`, затем `swap(a, b);`.
===
#include <iostream>
#include <utility>
using namespace std;

int main() {
    int a = 17, b = 5;
    int t = a;
    a = b;
    b = t;
    cout << a << " " << b << "\n";
    swap(a, b);
    cout << a << " " << b << "\n";
    return 0;
}
===
card: С чего начинается программа на C++? :: С функции `int main()`.
card: Как вывести значение и перевод строки? :: `cout << x << "\n";` (или `endl`, он ещё и сбрасывает буфер — медленнее).

## cpp-02 | Ввод, типы и переполнение
`cin >>` читает значения через пробелы и переводы строк:

```cpp
int a, b;
cin >> a >> b;
cout << a + b << "\n";

string line;
getline(cin, line);   // вся строка целиком
```

**Переполнение**: `int` вмещает примерно ±2,1·10⁹. Умножение двух больших `int` молча даст мусор:

```cpp
int x = 100000;
cout << x * x;               // мусор!
cout << (long long)x * x;    // 10000000000
```

Дробные с нужной точностью:

```cpp
#include <iomanip>
cout << fixed << setprecision(2) << 3.14159;   // 3.14
```

Приведение: `(double)a / b` — дробное деление, `(int)3.9` → 3.

Ускорение ввода-вывода для больших данных: `ios::sync_with_stdio(false); cin.tie(nullptr);` в начале main.

?? Что будет при `int x = 100000; cout << x * x;`?
+ переполнение — выведется неправильное число
- 10000000000
- ошибка компиляции
- 0
= Результат не влезает в int. Нужно long long.

?? Как вывести число ровно с тремя знаками после точки?
+ cout << fixed << setprecision(3) << x;
- cout << x.3;
- cout << round(x, 3);
- printf("%3", x);
= fixed + setprecision задают число знаков после точки.

!! Даны два целых числа a и b (до 10⁹ по модулю). Выведи их произведение, а на второй строке — частное a / b как дробное с 3 знаками после точки.
<<<
#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    long long a, b;
    cin >> a >> b;
    // твой код
    return 0;
}
<<<
in: 1000000000 3
out: 3000000000\n333333333.333
in: -7 2
out: -14\n-3.500
hint: a и b уже long long — произведение влезет.
hint: `cout << fixed << setprecision(3) << (double)a / b;`
===
#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    long long a, b;
    cin >> a >> b;
    cout << a * b << "\n";
    cout << fixed << setprecision(3) << (double)a / b << "\n";
    return 0;
}
===
!! {1} Дано время в секундах. Выведи его как `ЧЧ:ММ:СС` с ведущими нулями (можно `setw(2)` и `setfill('0')`).
<<<
#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    long long t;
    cin >> t;
    return 0;
}
<<<
in: 3725
out: 01:02:05
in: 86399
out: 23:59:59
in: 0
out: 00:00:00
hint: `cout << setfill('0') << setw(2) << h << ":" << setw(2) << m ...`
===
#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    long long t;
    cin >> t;
    cout << setfill('0') << setw(2) << t / 3600 << ":" << setw(2) << t % 3600 / 60 << ":" << setw(2) << t % 60 << "\n";
    return 0;
}
===
!! {2} Даны n и n чисел (каждое до 10^9). Выведи их сумму и среднее с двумя знаками. Сумма может не влезть в int.
<<<
#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 3\n1000000000 1000000000 1000000000
out: 3000000000 1000000000.00
in: 2\n1 2
out: 3 1.50
hint: Сумма — `long long`, среднее — `(double)sum / n` с `fixed << setprecision(2)`.
===
#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    int n;
    cin >> n;
    long long s = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        s += x;
    }
    cout << s << " " << fixed << setprecision(2) << (double)s / n << "\n";
    return 0;
}
===
card: Какой тип брать для чисел больше 2·10⁹? :: `long long` (до ~9·10¹⁸).
card: Как ускорить cin/cout? :: `ios::sync_with_stdio(false); cin.tie(nullptr);`

## cpp-03 | Условия
```cpp
if (t > 25) {
    cout << "hot\n";
} else if (t > 10) {
    cout << "ok\n";
} else {
    cout << "cold\n";
}
```

Сравнения: `== != < > <= >=`. Логика: `&&`, `||`, `!`.

Классическая ловушка: `if (x = 5)` — это **присваивание**, условие всегда истинно. Сравнение — `==`.

Тернарный оператор: `cout << (x % 2 == 0 ? "even" : "odd");`

`switch` по целым и символам:

```cpp
switch (op) {
    case '+': cout << a + b; break;
    case '-': cout << a - b; break;
    default: cout << "?";
}
```

Без `break` выполнение «проваливается» в следующий case.

?? Что выведет код при x = 3?
```cpp
if (x = 0) cout << "A"; else cout << "B";
```
- A
+ B
- ошибка
- ничего
= x = 0 присваивает ноль, а 0 — это false.

?? Что будет, если в case забыть break?
+ выполнятся и следующие case до break
- ошибка компиляции
- ничего
- программа зависнет
= Это называется fall-through.

!! Простой калькулятор: дано выражение «a op b» (целые, op — один из + - * /). Выведи результат. При делении — целочисленный результат; при делении на ноль — `error`.
<<<
#include <iostream>
using namespace std;

int main() {
    long long a, b;
    char op;
    cin >> a >> op >> b;
    // твой код
    return 0;
}
<<<
in: 7 + 5
out: 12
in: 7 / 2
out: 3
in: 3 / 0
out: error
in: -4 * 6
out: -24
hint: switch по op с case '+', '-', '*', '/'.
hint: В case '/' сначала проверь b == 0.
===
#include <iostream>
using namespace std;

int main() {
    long long a, b;
    char op;
    cin >> a >> op >> b;
    switch (op) {
        case '+': cout << a + b; break;
        case '-': cout << a - b; break;
        case '*': cout << a * b; break;
        case '/':
            if (b == 0) cout << "error";
            else cout << a / b;
            break;
    }
    cout << "\n";
    return 0;
}
===
!! {1} Дан год. Выведи `YES`, если он високосный, иначе `NO` (делится на 4 и не на 100, или делится на 400).
<<<
#include <iostream>
using namespace std;

int main() {
    int y;
    cin >> y;
    return 0;
}
<<<
in: 2024
out: YES
in: 1900
out: NO
in: 2000
out: YES
hint: `(y % 4 == 0 && y % 100 != 0) || y % 400 == 0`
===
#include <iostream>
using namespace std;

int main() {
    int y;
    cin >> y;
    cout << (((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) ? "YES" : "NO") << "\n";
    return 0;
}
===
!! {2} Даны координаты точки (x, y) — целые. Выведи номер координатной четверти (1–4), `axis`, если точка на оси, или `origin` для (0, 0).
<<<
#include <iostream>
using namespace std;

int main() {
    long long x, y;
    cin >> x >> y;
    return 0;
}
<<<
in: 3 5
out: 1
in: -2 4
out: 2
in: -1 -1
out: 3
in: 7 -3
out: 4
in: 0 5
out: axis
in: 0 0
out: origin
hint: Сначала частные случаи: (0, 0), потом x == 0 или y == 0.
===
#include <iostream>
using namespace std;

int main() {
    long long x, y;
    cin >> x >> y;
    if (x == 0 && y == 0) cout << "origin";
    else if (x == 0 || y == 0) cout << "axis";
    else if (x > 0 && y > 0) cout << 1;
    else if (x < 0 && y > 0) cout << 2;
    else if (x < 0) cout << 3;
    else cout << 4;
    cout << "\n";
    return 0;
}
===
card: Чем опасно `if (x = 5)`? :: Это присваивание, а не сравнение — условие всегда истинно. Сравнение: `==`.
card: Что произойдёт без `break` в switch? :: Выполнение «провалится» в следующие case.

## cpp-04 | Циклы
```cpp
for (int i = 0; i < 5; i++) cout << i << " ";   // 0 1 2 3 4

int n = 1;
while (n < 100) n *= 2;

do {
    // хотя бы один раз
} while (false);
```

`break` — выйти, `continue` — следующий шаг.

Читать числа до конца ввода:

```cpp
int x;
long long sum = 0;
while (cin >> x) sum += x;
```

Вложенные циклы — O(n²): при n = 10⁵ это 10¹⁰ операций, слишком долго. За секунду C++ успевает примерно 10⁸ простых действий.

?? Сколько раз выполнится `for (int i = 1; i < 100; i *= 3)`?
- 33
+ 5
- 4
- 100
= i = 1, 3, 9, 27, 81 — пять раз.

?? Что делает `while (cin >> x)`?
+ читает числа, пока ввод не закончится
- читает одно число
- бесконечный цикл
- ошибка
= cin >> x возвращает «ложь», когда читать больше нечего.

!! Дано n. Выведи все делители n по возрастанию через пробел (n до 10¹²). Перебор до n слишком долгий — иди до √n.
<<<
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    long long n;
    cin >> n;
    // твой код
    return 0;
}
<<<
in: 12
out: 1 2 3 4 6 12
in: 1
out: 1
in: 1000000000000
out: 1 2 4 5 8 10 16 20 25 32 40 50 64 80 100 125 128 160 200 250 256 320 400 500 512 625 640 800 1000 1024 1250 1280 1600 2000 2048 2500 2560 3125 3200 4000 4096 5000 5120 6250 6400 8000 10000 10240 12500 12800 15625 16000 20000 20480 25000 25600 31250 32000 40000 50000 51200 62500 64000 78125 80000 100000 102400 125000 128000 156250 160000 200000 250000 256000 312500 320000 390625 400000 500000 512000 625000 640000 781250 800000 1000000 1250000 1280000 1562500 1600000 1953125 2000000 2500000 2560000 3125000 3200000 3906250 4000000 5000000 6250000 6400000 7812500 8000000 9765625 10000000 12500000 12800000 15625000 16000000 19531250 20000000 25000000 31250000 32000000 39062500 40000000 48828125 50000000 62500000 64000000 78125000 80000000 97656250 100000000 125000000 156250000 160000000 195312500 200000000 244140625 250000000 312500000 320000000 390625000 400000000 488281250 500000000 625000000 781250000 800000000 976562500 1000000000 1250000000 1562500000 1600000000 1953125000 2000000000 2500000000 3125000000 3906250000 4000000000 5000000000 6250000000 7812500000 8000000000 10000000000 12500000000 15625000000 20000000000 25000000000 31250000000 40000000000 50000000000 62500000000 100000000000 125000000000 200000000000 250000000000 500000000000 1000000000000
hint: Для каждого d от 1, пока d * d <= n: если n % d == 0, то d и n / d — делители.
hint: Сложи их в vector, отсортируй и выведи; не забудь, что при d * d == n делитель один.
===
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    long long n;
    cin >> n;
    vector<long long> d;
    for (long long i = 1; i * i <= n; i++) {
        if (n % i == 0) {
            d.push_back(i);
            if (i != n / i) d.push_back(n / i);
        }
    }
    sort(d.begin(), d.end());
    for (size_t i = 0; i < d.size(); i++) cout << d[i] << (i + 1 < d.size() ? " " : "\n");
    return 0;
}
===
!! {1} Числа вводятся до конца ввода. Выведи их количество, сумму, минимум и максимум.
<<<
#include <iostream>
#include <climits>
using namespace std;

int main() {
    return 0;
}
<<<
in: 5 -2 8 3
out: 4 14 -2 8
in: 7
out: 1 7 7 7
hint: `while (cin >> x)` и переменные `mn = LLONG_MAX`, `mx = LLONG_MIN`.
===
#include <iostream>
#include <climits>
using namespace std;

int main() {
    long long x, cnt = 0, s = 0, mn = LLONG_MAX, mx = LLONG_MIN;
    while (cin >> x) {
        cnt++;
        s += x;
        mn = min(mn, x);
        mx = max(mx, x);
    }
    cout << cnt << " " << s << " " << mn << " " << mx << "\n";
    return 0;
}
===
!! {3} Гипотеза Коллатца: из n, пока n ≠ 1, делаем n/2 (чётное) или 3n+1 (нечётное). Дано n — выведи число шагов и максимальное значение по пути.
<<<
#include <iostream>
using namespace std;

int main() {
    long long n;
    cin >> n;
    return 0;
}
<<<
in: 6
out: 8 16
in: 1
out: 0 1
in: 27
out: 111 9232
hint: Цикл `while (n != 1)`; максимум обновляй на каждом шаге; long long — числа растут.
===
#include <iostream>
using namespace std;

int main() {
    long long n;
    cin >> n;
    long long steps = 0, mx = n;
    while (n != 1) {
        n = n % 2 == 0 ? n / 2 : 3 * n + 1;
        mx = max(mx, n);
        steps++;
    }
    cout << steps << " " << mx << "\n";
    return 0;
}
===
card: Сколько простых операций C++ успевает примерно за секунду? :: Порядка 10⁸.
card: Почему делители ищут только до √n? :: Делители идут парами d и n/d, и один из пары всегда ≤ √n.

### Модуль: Массивы, строки, функции

## cpp-05 | Массивы и vector
Статический массив фиксированного размера:

```cpp
int a[5] = {3, 1, 4, 1, 5};
cout << a[0];
```

Чаще используют **vector** — массив, который умеет расти:

```cpp
#include <vector>
vector<int> v;            // пустой
vector<int> w(n, 0);      // n нулей
v.push_back(7);
v.size();
v.back();                 // последний
v.pop_back();
for (int x : v) cout << x << " ";
```

Сортировка и прочее — в `<algorithm>`:

```cpp
sort(v.begin(), v.end());                 // по возрастанию
sort(v.rbegin(), v.rend());               // по убыванию
reverse(v.begin(), v.end());
int mx = *max_element(v.begin(), v.end());
```

Двумерный: `vector<vector<int>> grid(n, vector<int>(m));`

Выход за границы массива в C++ **не проверяется** — программа может молча испортить память. `v.at(i)` проверяет и бросает ошибку.

?? Что делает `vector<int> w(5, 1)`?
+ создаёт вектор из пяти единиц
- создаёт вектор {5, 1}
- создаёт пустой вектор
- ошибка
= Первое число — размер, второе — чем заполнить.

?? Что будет при обращении к a[10] у массива из 5 элементов?
- исключение
+ неопределённое поведение: мусор или падение
- вернёт 0
- ошибка компиляции
= C++ не проверяет границы ради скорости.

!! Дано n и n чисел. Выведи их без повторов в порядке возрастания (через пробел), а на второй строке — сколько разных чисел.
<<<
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    // твой код
    return 0;
}
<<<
in: 7\n5 3 5 1 3 3 9
out: 1 3 5 9\n4
in: 1\n42
out: 42\n1
hint: Отсортируй, затем `a.erase(unique(a.begin(), a.end()), a.end());`
hint: unique сдвигает повторы в конец, erase их отрезает.
===
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    sort(a.begin(), a.end());
    a.erase(unique(a.begin(), a.end()), a.end());
    for (size_t i = 0; i < a.size(); i++) cout << a[i] << (i + 1 < a.size() ? " " : "\n");
    cout << a.size() << "\n";
    return 0;
}
===
!! {1} Дано n и n чисел. Выведи элементы, стоящие на чётных позициях (0, 2, 4…), затем — на нечётных, всё в одну строку через пробел.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    return 0;
}
<<<
in: 6\n10 11 12 13 14 15
out: 10 12 14 11 13 15
in: 1\n5
out: 5
hint: Собери результат в новый vector двумя циклами с шагом 2.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    vector<int> r;
    for (int i = 0; i < n; i += 2) r.push_back(a[i]);
    for (int i = 1; i < n; i += 2) r.push_back(a[i]);
    for (size_t i = 0; i < r.size(); i++) cout << r[i] << (i + 1 < r.size() ? " " : "\n");
    return 0;
}
===
!! {2} Дано n и n чисел. Выведи длину самой длинной цепочки подряд идущих равных чисел и само это число (при равных длинах — то, что встретилось раньше).
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    return 0;
}
<<<
in: 8\n1 2 2 3 3 3 2 2
out: 3 3
in: 3\n7 7 7
out: 3 7
in: 4\n1 2 3 4
out: 1 1
hint: Счётчик текущей серии: если `a[i] == a[i-1]` — увеличивай, иначе сбрасывай в 1. Обновляй лучшее строго при `>`.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    int best = 1, val = a[0], cur = 1;
    for (int i = 1; i < n; i++) {
        cur = a[i] == a[i - 1] ? cur + 1 : 1;
        if (cur > best) {
            best = cur;
            val = a[i];
        }
    }
    cout << best << " " << val << "\n";
    return 0;
}
===
card: Как убрать повторы из вектора? :: `sort`, затем `v.erase(unique(v.begin(), v.end()), v.end());`
card: Как отсортировать вектор по убыванию? :: `sort(v.rbegin(), v.rend());`

## cpp-06 | Строки std::string
```cpp
#include <string>
string s = "hello";
s.size();            // 5
s[0];                // 'h'
s += " world";       // склейка
s.substr(1, 3);      // "ell" — с позиции 1, длина 3
s.find("lo");        // 3, или string::npos
reverse(s.begin(), s.end());
```

Символы — это маленькие числа (`char`). Удобные функции из `<cctype>`: `isdigit(c)`, `isalpha(c)`, `tolower(c)`, `toupper(c)`. Цифра-символ в число: `c - '0'`.

Строки сравниваются обычными `==`, `<` (по алфавиту).

Числа ↔ строки: `to_string(42)`, `stoi("42")`, `stoll("123456789012")`.

Чтение строки с пробелами: `getline(cin, s);`. Если перед этим был `cin >> n`, сначала съешь перевод строки: `cin.ignore();`.

?? Что вернёт `string("programming").substr(3, 4)`?
- "gramm"
+ "gram"
- "ogra"
- "ram"
= substr(позиция, длина): с индекса 3 четыре символа.

?? Как узнать, что find ничего не нашёл?
+ результат равен string::npos
- результат равен -1 типа int
- результат равен 0
- find бросает исключение
= npos — специальное «нет такого места».

!! Дана строка (латиница, пробелы, знаки). Выведи `YES`, если это анаграмма-палиндром: из её букв (без учёта регистра, только буквы) можно составить палиндром. Иначе `NO`.
<<<
#include <iostream>
#include <string>
#include <cctype>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    // твой код
    return 0;
}
<<<
in: Tact Coa
out: YES
in: hello
out: NO
in: Taco cat!
out: YES
hint: Посчитай буквы: `int cnt[26] = {}; cnt[tolower(c) - 'a']++` для букв.
hint: Палиндром можно собрать, если нечётных счётчиков не больше одного.
===
#include <iostream>
#include <string>
#include <cctype>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    int cnt[26] = {};
    for (char c : s)
        if (isalpha((unsigned char)c)) cnt[tolower((unsigned char)c) - 'a']++;
    int odd = 0;
    for (int k : cnt) odd += k % 2;
    cout << (odd <= 1 ? "YES" : "NO") << "\n";
    return 0;
}
===
!! {1} Дана строка из слов через пробел. Выведи слова в обратном порядке.
<<<
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    return 0;
}
<<<
in: i love cpp
out: cpp love i
in: одно
out: одно
hint: Читай слова `while (cin >> w)` в vector, затем выведи с конца.
===
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    vector<string> w;
    string s;
    while (cin >> s) w.push_back(s);
    for (int i = (int)w.size() - 1; i >= 0; i--) cout << w[i] << (i ? " " : "\n");
    return 0;
}
===
!! {2} Дана строка. Сожми её «run-length»: aaabcc → a3b1c2 (у каждой серии — число, даже если 1). Затем во второй строке выведи распакованную обратно строку, чтобы проверить себя.
<<<
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    return 0;
}
<<<
in: aaabcc
out: a3b1c2\naaabcc
in: z
out: z1\nz
hint: Для распаковки: читай букву и число после неё (цифр может быть несколько) — `string(k, c)`.
===
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    string z;
    for (size_t i = 0; i < s.size();) {
        size_t j = i;
        while (j < s.size() && s[j] == s[i]) j++;
        z += s[i] + to_string(j - i);
        i = j;
    }
    string back;
    for (size_t i = 0; i < z.size();) {
        char c = z[i++];
        int k = 0;
        while (i < z.size() && isdigit((unsigned char)z[i])) k = k * 10 + (z[i++] - '0');
        back += string(k, c);
    }
    cout << z << "\n" << back << "\n";
    return 0;
}
===
card: Как получить подстроку в C++? :: `s.substr(pos, len)`
card: Как перевести строку в число и обратно? :: `stoi("42")` / `stoll(...)` и `to_string(42)`.

## cpp-07 | Функции и ссылки
```cpp
int square(int x) {
    return x * x;
}

void hello() {             // void — ничего не возвращает
    cout << "hi\n";
}
```

Функцию нужно объявить **выше** места вызова (или написать её прототип).

По умолчанию параметры передаются **копией**. Чтобы функция меняла переменную — передай **ссылку** `&`:

```cpp
void inc(int& x) { x++; }
int a = 5;
inc(a);        // a == 6

void mySwap(int& a, int& b) { int t = a; a = b; b = t; }
```

Большие объекты (vector, string) передают по `const&` — без копирования и без права менять:

```cpp
long long sum(const vector<int>& v) {
    long long s = 0;
    for (int x : v) s += x;
    return s;
}
```

Перегрузка: `int maxOf(int, int)` и `double maxOf(double, double)` — разные функции.

?? Что выведет код?
```cpp
void f(int x) { x = 10; }
void g(int& x) { x = 20; }
int a = 1; f(a); cout << a; g(a); cout << a;
```
- 1020
+ 120
- 1010
- 11
= f меняет копию, g — сам a через ссылку.

?? Зачем писать `const vector<int>& v` вместо `vector<int> v`?
+ чтобы не копировать вектор и случайно его не изменить
- так быстрее компилируется
- иначе нельзя передать вектор
- чтобы вектор стал константой навсегда
= Копия большого вектора — это время и память.

!! Напиши функцию `void normalize(vector<int>& v)`, которая вычитает из каждого элемента минимум массива. Дано n и n чисел — выведи результат через пробел.
<<<
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void normalize(vector<int>& v) {
    // твой код
}

int main() {
    int n;
    cin >> n;
    vector<int> v(n);
    for (int& x : v) cin >> x;
    for (int x : v) cout << x << " ";
    cout << "\n";
    return 0;
}
<<<
in: 4\n5 3 8 3
out: 2 0 5 0
in: 3\n-2 0 7
out: 0 2 9
hint: Минимум: `int mn = *min_element(v.begin(), v.end());`
hint: Пройди `for (int& x : v) x -= mn;` — ссылка, чтобы менять сам элемент. И вызови normalize в main.
===
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void normalize(vector<int>& v) {
    int mn = *min_element(v.begin(), v.end());
    for (int& x : v) x -= mn;
}

int main() {
    int n;
    cin >> n;
    vector<int> v(n);
    for (int& x : v) cin >> x;
    normalize(v);
    for (int x : v) cout << x << " ";
    cout << "\n";
    return 0;
}
===
!! {1} Напиши функцию `bool isPalindrome(const string& s)`. Даны слова до конца ввода — выведи только палиндромы через пробел (или `NONE`).
<<<
#include <iostream>
#include <string>
using namespace std;

bool isPalindrome(const string& s) {
    return false;
}

int main() {
    return 0;
}
<<<
in: racecar cat level abc a
out: racecar level a
in: abc
out: NONE
hint: Сравнивай `s[i]` и `s[n - 1 - i]` до середины.
===
#include <iostream>
#include <string>
#include <vector>
using namespace std;

bool isPalindrome(const string& s) {
    for (size_t i = 0; i < s.size() / 2; i++)
        if (s[i] != s[s.size() - 1 - i]) return false;
    return true;
}

int main() {
    string w;
    vector<string> r;
    while (cin >> w)
        if (isPalindrome(w)) r.push_back(w);
    if (r.empty()) cout << "NONE\n";
    for (size_t i = 0; i < r.size(); i++) cout << r[i] << (i + 1 < r.size() ? " " : "\n");
    return 0;
}
===
!! {3} Функция `void minmax(const vector<int>& a, int& mn, int& mx)` возвращает минимум и максимум через ссылки, а `double mean(const vector<int>&)` — среднее. Дано n и числа — выведи mn mx и среднее с 2 знаками.
<<<
#include <iostream>
#include <vector>
#include <iomanip>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    return 0;
}
<<<
in: 5\n3 1 4 1 5
out: 1 5 2.80
in: 1\n-7
out: -7 -7 -7.00
hint: Ссылки позволяют функции «вернуть» несколько значений.
===
#include <iostream>
#include <vector>
#include <iomanip>
using namespace std;

void minmax(const vector<int>& a, int& mn, int& mx) {
    mn = mx = a[0];
    for (int x : a) {
        if (x < mn) mn = x;
        if (x > mx) mx = x;
    }
}

double mean(const vector<int>& a) {
    long long s = 0;
    for (int x : a) s += x;
    return (double)s / a.size();
}

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    int mn, mx;
    minmax(a, mn, mx);
    cout << mn << " " << mx << " " << fixed << setprecision(2) << mean(a) << "\n";
    return 0;
}
===
card: Как передать переменную в функцию, чтобы функция могла её изменить? :: По ссылке: `void f(int& x)`.
card: Почему в `for (int& x : v)` стоит &? :: Без & x — копия элемента, изменения не попадут в вектор.

## cpp-14 | Рекурсия и перебор
Функция, вызывающая саму себя. Нужна **база** — где рекурсия останавливается.

```cpp
long long fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }

void gen(string& cur, int n) {           // все двоичные строки длины n
    if ((int)cur.size() == n) { cout << cur << "\n"; return; }
    for (char c : {'0', '1'}) {
        cur.push_back(c);
        gen(cur, n);
        cur.pop_back();                  // вернуть как было — «откат»
    }
}
```

**Перебор с откатом (backtracking)**: добавили — ушли глубже — убрали. Так решают «расставить ферзей», «все подмножества», «судоку».

Мемоизация: `vector<long long> memo(n + 1, -1)` и проверка `if (memo[n] != -1) return memo[n];`.

?? Сколько строк выведет `gen` для n = 3?
- 3
- 6
+ 8
- 9
= 2³ — каждая позиция бывает 0 или 1.

?? Зачем `cur.pop_back()` после рекурсивного вызова?
+ вернуть строку в прежнее состояние для следующего варианта
- освободить память
- ускорить программу
- это ошибка
= Иначе символы накопятся от разных веток перебора.

!! {1} Рекурсивно выведи число в двоичной записи (без bitset и циклов). n ≥ 1.
<<<
#include <iostream>
using namespace std;

void bin(long long n) {
}

int main() {
    long long n;
    cin >> n;
    bin(n);
    cout << "\n";
    return 0;
}
<<<
in: 10
out: 1010
in: 1
out: 1
in: 255
out: 11111111
hint: Сначала `bin(n / 2)` (если n > 1), потом печать `n % 2`.
===
#include <iostream>
using namespace std;

void bin(long long n) {
    if (n > 1) bin(n / 2);
    cout << n % 2;
}

int main() {
    long long n;
    cin >> n;
    bin(n);
    cout << "\n";
    return 0;
}
===
!! {2} Дано n чисел и S. Выведи `YES`, если можно выбрать подмножество с суммой ровно S (n до 20), иначе `NO`.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    long long s;
    cin >> n >> s;
    return 0;
}
<<<
in: 4 9\n3 34 4 5
out: YES
in: 3 100\n1 2 3
out: NO
in: 1 0\n5
out: YES
hint: Рекурсия `can(i, rest)`: либо берём a[i], либо нет. База — i == n: ответ `rest == 0`.
===
#include <iostream>
#include <vector>
using namespace std;

vector<long long> a;
int n;

bool can(int i, long long rest) {
    if (i == n) return rest == 0;
    return can(i + 1, rest - a[i]) || can(i + 1, rest);
}

int main() {
    long long s;
    cin >> n >> s;
    a.resize(n);
    for (auto& x : a) cin >> x;
    cout << (can(0, s) ? "YES" : "NO") << "\n";
    return 0;
}
===
!! {3} N ферзей: дано n (до 10). Выведи количество способов расставить n ферзей на доске n×n так, чтобы они не били друг друга.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 4
out: 2
in: 8
out: 92
in: 1
out: 1
hint: Ставь по ферзю в каждую строку; храни занятые столбцы и диагонали (`r + c` и `r - c + n`).
===
#include <iostream>
#include <vector>
using namespace std;

int n, cnt = 0;
vector<bool> col, d1, d2;

void place(int r) {
    if (r == n) { cnt++; return; }
    for (int c = 0; c < n; c++) {
        if (col[c] || d1[r + c] || d2[r - c + n]) continue;
        col[c] = d1[r + c] = d2[r - c + n] = true;
        place(r + 1);
        col[c] = d1[r + c] = d2[r - c + n] = false;
    }
}

int main() {
    cin >> n;
    col.assign(n, false);
    d1.assign(2 * n, false);
    d2.assign(2 * n + 1, false);
    place(0);
    cout << cnt << "\n";
    return 0;
}
===
card: Что такое backtracking (перебор с откатом)? :: Добавить элемент → рекурсивно продолжить → убрать элемент, чтобы попробовать следующий вариант.
card: Как ускорить рекурсию с повторяющимися подзадачами? :: Мемоизация: запоминать ответы в массиве и возвращать сохранённое.

## cpp-15 | Двумерные массивы и сетки
Сетку хранят как `vector<vector<int>>` или `vector<string>`:

```cpp
int n, m;
cin >> n >> m;
vector<string> g(n);
for (auto& row : g) cin >> row;           // каждая строка — клетки
vector<vector<int>> dist(n, vector<int>(m, -1));

int dx[] = {1, -1, 0, 0}, dy[] = {0, 0, 1, -1};
for (int k = 0; k < 4; k++) {
    int x = i + dx[k], y = j + dy[k];
    if (x < 0 || x >= n || y < 0 || y >= m) continue;
    ...
}
```

Префиксные суммы в 2D дают сумму любого прямоугольника за O(1):

```cpp
// p[i+1][j+1] = a[i][j] + p[i][j+1] + p[i+1][j] - p[i][j]
// сумма (r1..r2, c1..c2) = p[r2+1][c2+1] - p[r1][c2+1] - p[r2+1][c1] + p[r1][c1]
```

?? Как создать сетку n×m из нулей?
+ vector<vector<int>> g(n, vector<int>(m, 0));
- vector<int> g(n, m);
- int g[n][m] = 0;
- vector<vector<int>> g(n * m);
= Внешний вектор из n строк, каждая — вектор из m нулей.

?? Зачем 2D префиксные суммы?
+ чтобы за O(1) отвечать на сумму любого прямоугольника
- чтобы сортировать
- для поиска пути
- для экономии памяти
= Построение — O(n·m), каждый запрос — четыре обращения.

!! {1} Дано n m и сетка из `.` и `#`. Выведи количество `#` в каждой строке через пробел, а затем строку с номером (с 1), где их больше всего (первую из равных).
<<<
#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    return 0;
}
<<<
in: 3 4\n#..#\n####\n.#..
out: 2 4 1\n2
in: 1 2\n..
out: 0\n1
hint: `count(row.begin(), row.end(), '#')`.
===
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<string> g(n);
    for (auto& r : g) cin >> r;
    int best = 0, bi = 1;
    for (int i = 0; i < n; i++) {
        int c = count(g[i].begin(), g[i].end(), '#');
        cout << c << (i + 1 < n ? " " : "\n");
        if (c > best) { best = c; bi = i + 1; }
    }
    cout << bi << "\n";
    return 0;
}
===
!! {2} Матрица n×m и q запросов «r1 c1 r2 c2» (с 1). Для каждого выведи сумму в прямоугольнике через 2D префиксные суммы.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    return 0;
}
<<<
in: 3 3\n1 2 3\n4 5 6\n7 8 9\n3\n1 1 3 3\n2 2 3 3\n1 2 1 3
out: 45\n28\n5
in: 1 1\n5\n1\n1 1 1 1
out: 5
hint: Формулы — в гайде; заведи p размером (n+1)×(m+1) из long long.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<long long>> p(n + 1, vector<long long>(m + 1, 0));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            long long x;
            cin >> x;
            p[i + 1][j + 1] = x + p[i][j + 1] + p[i + 1][j] - p[i][j];
        }
    int q;
    cin >> q;
    while (q--) {
        int r1, c1, r2, c2;
        cin >> r1 >> c1 >> r2 >> c2;
        cout << p[r2][c2] - p[r1 - 1][c2] - p[r2][c1 - 1] + p[r1 - 1][c1 - 1] << "\n";
    }
    return 0;
}
===
!! {3} Заливка: сетка n×m из `.` и `#`, и клетка (r, c) с 1. Залей связную область точек, содержащую эту клетку, символом `*` (по 4 направлениям) и выведи сетку. Если в клетке `#` — сетка без изменений.
<<<
#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    return 0;
}
<<<
in: 4 5\n..#..\n.##..\n#....\n..#.#\n1 1
out: **#..\n*##..\n#....\n..#.#
in: 2 2\n#.\n.#\n1 1
out: #.\n.#
hint: BFS или стек от (r-1, c-1), красим `.` в `*`.
===
#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<string> g(n);
    for (auto& r : g) cin >> r;
    int r, c;
    cin >> r >> c;
    r--, c--;
    if (g[r][c] == '.') {
        vector<pair<int, int>> st = {{r, c}};
        g[r][c] = '*';
        int dx[] = {1, -1, 0, 0}, dy[] = {0, 0, 1, -1};
        while (!st.empty()) {
            auto [x, y] = st.back();
            st.pop_back();
            for (int k = 0; k < 4; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx >= 0 && nx < n && ny >= 0 && ny < m && g[nx][ny] == '.') {
                    g[nx][ny] = '*';
                    st.push_back({nx, ny});
                }
            }
        }
    }
    for (auto& row : g) cout << row << "\n";
    return 0;
}
===
card: Как найти сумму прямоугольника за O(1)? :: 2D префиксные суммы: `p[r2][c2] - p[r1-1][c2] - p[r2][c1-1] + p[r1-1][c1-1]`.
card: Как удобно перебирать 4 соседей клетки? :: Массивы `dx = {1,-1,0,0}`, `dy = {0,0,1,-1}` и проверка границ.

### Модуль: Память и ООП

## cpp-08 | Указатели и память
**Указатель** хранит адрес переменной в памяти:

```cpp
int a = 5;
int* p = &a;    // & — взять адрес
cout << *p;     // * — значение по адресу → 5
*p = 7;         // теперь a == 7
```

`nullptr` — «никуда не указывает». Разыменовать nullptr — падение.

Массив и указатель тесно связаны: `int arr[3]; int* q = arr;` → `*(q + 1)` то же, что `arr[1]`.

**Динамическая память** — выделить вручную и обязательно освободить:

```cpp
int* data = new int[n];
// ...
delete[] data;
```

Забыл `delete` — **утечка памяти**. Удалил дважды — падение. Поэтому в современном C++ почти всегда используют `vector` и «умные» указатели:

```cpp
#include <memory>
auto node = make_unique<Node>();   // сам удалится
```

Связный список — классика на указателях:

```cpp
struct Node {
    int val;
    Node* next;
};
```

?? Что выведет код?
```cpp
int a = 3;
int* p = &a;
*p += 4;
cout << a;
```
- 3
+ 7
- адрес
- 4
= *p — это сама переменная a.

?? Что будет, если выделить `new int[100]` и не вызвать delete[]?
+ утечка памяти
- ошибка компиляции
- память освободится сама сразу
- программа упадёт сразу
= Память вернётся системе только после завершения программы.

!! Реализуй односвязный список на указателях: дано n и n чисел. Построй список, разверни его (поменяй направление указателей, без нового массива) и выведи элементы через пробел. Освободи память.
<<<
#include <iostream>
using namespace std;

struct Node {
    int val;
    Node* next;
};

int main() {
    int n;
    cin >> n;
    // твой код
    return 0;
}
<<<
in: 5\n1 2 3 4 5
out: 5 4 3 2 1
in: 1\n9
out: 9
hint: Строй список через голову и хвост: `Node* node = new Node{x, nullptr};`
hint: Разворот: prev = nullptr; пока cur: next = cur->next; cur->next = prev; prev = cur; cur = next.
===
#include <iostream>
using namespace std;

struct Node {
    int val;
    Node* next;
};

int main() {
    int n;
    cin >> n;
    Node* head = nullptr;
    Node* tail = nullptr;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        Node* node = new Node{x, nullptr};
        if (!head) head = tail = node;
        else {
            tail->next = node;
            tail = node;
        }
    }
    Node* prev = nullptr;
    Node* cur = head;
    while (cur) {
        Node* next = cur->next;
        cur->next = prev;
        prev = cur;
        cur = next;
    }
    head = prev;
    for (Node* p = head; p; p = p->next) cout << p->val << (p->next ? " " : "\n");
    while (head) {
        Node* next = head->next;
        delete head;
        head = next;
    }
    return 0;
}
===
!! {1} Напиши `void mySwap(int* a, int* b)` через указатели. Даны два числа — поменяй их функцией и выведи.
<<<
#include <iostream>
using namespace std;

void mySwap(int* a, int* b) {
}

int main() {
    int x, y;
    cin >> x >> y;
    mySwap(&x, &y);
    cout << x << " " << y << "\n";
    return 0;
}
<<<
in: 1 2
out: 2 1
in: -5 9
out: 9 -5
hint: `int t = *a; *a = *b; *b = t;`
===
#include <iostream>
using namespace std;

void mySwap(int* a, int* b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main() {
    int x, y;
    cin >> x >> y;
    mySwap(&x, &y);
    cout << x << " " << y << "\n";
    return 0;
}
===
!! {2} Динамический массив: дано n, выдели `new int[n]`, прочитай числа, найди сумму через арифметику указателей (`*(p + i)`), выведи и освободи память.
<<<
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 4\n1 2 3 4
out: 10
in: 1\n100
out: 100
hint: `int* p = new int[n];` … `delete[] p;`
===
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int* p = new int[n];
    for (int i = 0; i < n; i++) cin >> *(p + i);
    long long s = 0;
    for (int* q = p; q != p + n; ++q) s += *q;
    cout << s << "\n";
    delete[] p;
    return 0;
}
===
card: Что делают `&a` и `*p`? :: `&a` — адрес переменной a. `*p` — значение по адресу из p.
card: Как избежать утечек памяти в современном C++? :: Не писать new/delete вручную: vector, string, make_unique / make_shared.

## cpp-09 | Структуры и классы
`struct` и `class` объединяют данные и функции. Разница только в доступе по умолчанию: у struct всё `public`, у class — `private`.

```cpp
class Account {
    string owner;
    long long balance = 0;
public:
    Account(string o) : owner(o) {}         // конструктор со списком инициализации
    void deposit(long long x) { balance += x; }
    long long getBalance() const { return balance; }   // const — не меняет объект
};

Account acc("Anna");
acc.deposit(100);
```

Сравнение своих объектов для сортировки — оператор `<`:

```cpp
struct Student {
    string name;
    int score;
    bool operator<(const Student& o) const {
        if (score != o.score) return score > o.score;   // по убыванию балла
        return name < o.name;
    }
};
sort(v.begin(), v.end());
```

Деструктор `~Account()` вызывается, когда объект исчезает — там освобождают ресурсы.

?? Чем struct отличается от class в C++?
+ только доступом по умолчанию: struct — public, class — private
- struct не может иметь методов
- class нельзя сортировать
- struct хранится на диске
= Во всём остальном это одно и то же.

?? Что значит const после метода: `int get() const`?
+ метод не меняет поля объекта
- метод возвращает константу
- метод нельзя вызвать
- метод статический
= Такой метод можно вызывать у const-объектов.

!! Дано n, затем n строк «имя балл». Выведи имена по убыванию балла, при равенстве — по алфавиту, каждое на своей строке. Сделай struct с оператором <.
<<<
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

struct Student {
    string name;
    int score;
};

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 4\nanna 90\nboris 75\nvika 90\ngleb 60
out: anna\nvika\nboris\ngleb
in: 3\nzed 5\namy 5\nbob 7
out: bob\namy\nzed
hint: Добавь в Student метод `bool operator<(const Student& o) const`.
hint: Сравнение: сначала score по убыванию, потом name по возрастанию. Затем `sort(v.begin(), v.end())`.
===
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

struct Student {
    string name;
    int score;
    bool operator<(const Student& o) const {
        if (score != o.score) return score > o.score;
        return name < o.name;
    }
};

int main() {
    int n;
    cin >> n;
    vector<Student> v(n);
    for (auto& s : v) cin >> s.name >> s.score;
    sort(v.begin(), v.end());
    for (auto& s : v) cout << s.name << "\n";
    return 0;
}
===
!! {1} `struct Point { double x, y; }` и функция `double dist(Point a, Point b)`. Даны n точек — выведи длину ломаной, проходящей через них по порядку, с 3 знаками.
<<<
#include <iostream>
#include <cmath>
#include <iomanip>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 3\n0 0\n3 4\n3 0
out: 9.000
in: 1\n5 5
out: 0.000
hint: `sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y))` или `hypot`.
===
#include <iostream>
#include <cmath>
#include <iomanip>
#include <vector>
using namespace std;

struct Point {
    double x, y;
};

double dist(Point a, Point b) { return hypot(a.x - b.x, a.y - b.y); }

int main() {
    int n;
    cin >> n;
    vector<Point> p(n);
    for (auto& q : p) cin >> q.x >> q.y;
    double s = 0;
    for (int i = 1; i < n; i++) s += dist(p[i - 1], p[i]);
    cout << fixed << setprecision(3) << s << "\n";
    return 0;
}
===
!! {2} Класс `BankAccount` с приватным балансом, методами `deposit`, `bool withdraw(long long)` и `balance() const`. Команды до `end`: `dep x`, `wd x` (выведи `ok` или `fail`), `bal`.
<<<
#include <iostream>
#include <string>
using namespace std;

int main() {
    return 0;
}
<<<
in: dep 100\nwd 30\nbal\nwd 100\nbal\nend
out: ok\n70\nfail\n70
in: bal\nwd 1\ndep 5\ndep 5\nwd 10\nbal\nend
out: 0\nfail\nok\n0
hint: В `withdraw` проверь, хватает ли денег; верни false, ничего не меняя.
===
#include <iostream>
#include <string>
using namespace std;

class BankAccount {
    long long bal = 0;
public:
    void deposit(long long x) { bal += x; }
    bool withdraw(long long x) {
        if (x > bal) return false;
        bal -= x;
        return true;
    }
    long long balance() const { return bal; }
};

int main() {
    BankAccount acc;
    string cmd;
    while (cin >> cmd && cmd != "end") {
        long long x;
        if (cmd == "dep") { cin >> x; acc.deposit(x); }
        else if (cmd == "wd") { cin >> x; cout << (acc.withdraw(x) ? "ok" : "fail") << "\n"; }
        else if (cmd == "bal") cout << acc.balance() << "\n";
    }
    return 0;
}
===
card: Что такое список инициализации в конструкторе? :: `Account(string o) : owner(o) {}` — поля заполняются до тела конструктора.
card: Как научить sort сортировать свои структуры? :: Определить `bool operator<(const T& o) const` или передать лямбду-компаратор.

## cpp-16 | Конструкторы, деструкторы, RAII и умные указатели
**RAII**: ресурс (память, файл, блокировка) захватывается в конструкторе и освобождается в деструкторе — автоматически, даже при ошибке.

```cpp
class Timer {
    string name;
public:
    Timer(string n) : name(n) { cout << "start " << name << "\n"; }
    ~Timer() { cout << "stop " << name << "\n"; }   // при выходе из области видимости
};

{
    Timer t("loop");
}   // здесь вызовется ~Timer
```

Объекты уничтожаются в **обратном** порядке создания.

**Умные указатели** (`#include <memory>`):
- `unique_ptr<T>` — единственный владелец; `make_unique<T>(...)`; нельзя копировать, можно `move`.
- `shared_ptr<T>` — общий владелец со счётчиком ссылок; `use_count()`.

**Правило трёх/пяти**: если классу нужен свой деструктор, скорее всего нужны и копирующий конструктор/присваивание (или их запрет `= delete`).

?? В каком порядке вызовутся деструкторы `Timer a("a"); Timer b("b");` при выходе из блока?
+ сначала b, потом a
- сначала a, потом b
- одновременно
- деструкторы не вызываются сами
= Обратный порядок создания.

?? Можно ли скопировать unique_ptr?
+ нет, только переместить (std::move)
- да, как обычный указатель
- да, но память удвоится
- только в shared_ptr
= У unique_ptr ровно один владелец.

!! {1} Класс `Tracer` печатает `+имя` в конструкторе и `-имя` в деструкторе. Даны n имён. Напиши рекурсивную функцию `make(i)`, которая создаёт локальный `Tracer` с i-м именем и вызывает `make(i + 1)`. Вызови `make(0)`, а после — выведи `end`. Посмотри, в каком порядке уничтожаются объекты.
<<<
#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 3\na b c
out: +a\n+b\n+c\n-c\n-b\n-a\nend
in: 1\nx
out: +x\n-x\nend
hint: Локальный объект живёт до конца функции — значит, он уничтожится после возврата из рекурсии.
===
#include <iostream>
#include <vector>
#include <string>
using namespace std;

struct Tracer {
    string name;
    Tracer(string n) : name(n) { cout << "+" << name << "\n"; }
    ~Tracer() { cout << "-" << name << "\n"; }
};

vector<string> names;

void make(size_t i) {
    if (i == names.size()) return;
    Tracer t(names[i]);
    make(i + 1);
}

int main() {
    int n;
    cin >> n;
    names.resize(n);
    for (auto& s : names) cin >> s;
    make(0);
    cout << "end\n";
    return 0;
}
===
!! {2} Связный список на `unique_ptr`: `struct Node { int val; unique_ptr<Node> next; };`. Дано n чисел — построй список (добавляя в начало), выведи элементы и их сумму. Ни одного `delete`.
<<<
#include <iostream>
#include <memory>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 4\n1 2 3 4
out: 4 3 2 1\n10
in: 1\n9
out: 9\n9
hint: Добавление в начало: `auto node = make_unique<Node>(); node->val = x; node->next = move(head); head = move(node);`
===
#include <iostream>
#include <memory>
using namespace std;

struct Node {
    int val;
    unique_ptr<Node> next;
};

int main() {
    int n;
    cin >> n;
    unique_ptr<Node> head;
    for (int i = 0; i < n; i++) {
        auto node = make_unique<Node>();
        cin >> node->val;
        node->next = move(head);
        head = move(node);
    }
    long long s = 0;
    for (Node* p = head.get(); p; p = p->next.get()) {
        cout << p->val << (p->next ? " " : "\n");
        s += p->val;
    }
    cout << s << "\n";
    return 0;
}
===
!! {3} `shared_ptr`: команды до `end`: `new имя` (создать объект и положить в «держатель» с этим именем), `share a b` (держатель b указывает на тот же объект, что a), `drop a` (держатель a отпускает объект), `count a` (сколько держателей у объекта a, или `0`, если a пуст). Объект печатает `free X` при уничтожении (X — имя, с которым создан).
<<<
#include <iostream>
#include <map>
#include <memory>
#include <string>
using namespace std;

int main() {
    return 0;
}
<<<
in: new a\nshare a b\ncount a\ndrop a\ncount b\ndrop b\ncount b\nend
out: 2\n1\nfree a\n0
in: new x\nnew x\nend
out: free x\nfree x
hint: `map<string, shared_ptr<Obj>> h;` — `use_count()` даёт число владельцев; `h[a].reset()` отпускает.
===
#include <iostream>
#include <map>
#include <memory>
#include <string>
using namespace std;

struct Obj {
    string name;
    Obj(string n) : name(n) {}
    ~Obj() { cout << "free " << name << "\n"; }
};

int main() {
    map<string, shared_ptr<Obj>> h;
    string cmd;
    while (cin >> cmd && cmd != "end") {
        string a, b;
        if (cmd == "new") { cin >> a; h[a] = make_shared<Obj>(a); }
        else if (cmd == "share") { cin >> a >> b; h[b] = h[a]; }
        else if (cmd == "drop") { cin >> a; h[a].reset(); }
        else if (cmd == "count") { cin >> a; cout << (h[a] ? h[a].use_count() : 0) << "\n"; }
    }
    h.clear();
    return 0;
}
===
card: Что такое RAII? :: Ресурс захватывается в конструкторе и освобождается в деструкторе — автоматически при выходе из области видимости.
card: Чем unique_ptr отличается от shared_ptr? :: unique_ptr — один владелец, только перемещение. shared_ptr — общий владелец со счётчиком ссылок; объект удаляется, когда последний отпустит.

## cpp-17 | Перегрузка операторов
Свои типы можно складывать, сравнивать и печатать как встроенные:

```cpp
struct Vec {
    long long x, y;
    Vec operator+(const Vec& o) const { return {x + o.x, y + o.y}; }
    Vec operator*(long long k) const { return {x * k, y * k}; }
    bool operator==(const Vec& o) const { return x == o.x && y == o.y; }
    bool operator<(const Vec& o) const { return x != o.x ? x < o.x : y < o.y; }
};

ostream& operator<<(ostream& os, const Vec& v) { return os << "(" << v.x << ", " << v.y << ")"; }
istream& operator>>(istream& is, Vec& v) { return is >> v.x >> v.y; }
```

`operator<` нужен для `sort`, `set`, `map`. В C++20 можно одним `auto operator<=>(const Vec&) const = default;`.

`+=` обычно реализуют как член, а `+` — через него.

?? Зачем `const` в `Vec operator+(const Vec& o) const`?
+ метод не меняет текущий объект, и его можно вызывать у const-объектов
- ускоряет сложение
- запрещает сложение
- это обязательно для всех операторов
= Второй const — про `this`, первый — про аргумент.

?? Какой оператор нужен, чтобы класть свои объекты в std::set?
+ operator<
- operator==
- operator+
- operator<<
= set упорядочивает элементы сравнением «меньше».

!! {1} `struct Vec` с `+`, `*` на число и `<<`. Даны n векторов и k — выведи k × (сумма векторов) в формате `(x, y)`.
<<<
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 3\n1 2\n3 4\n-1 0\n2
out: (6, 12)
in: 1\n5 5\n0
out: (0, 0)
hint: Начни с `Vec s{0, 0};` и прибавляй.
===
#include <iostream>
using namespace std;

struct Vec {
    long long x, y;
    Vec operator+(const Vec& o) const { return {x + o.x, y + o.y}; }
    Vec operator*(long long k) const { return {x * k, y * k}; }
};

ostream& operator<<(ostream& os, const Vec& v) { return os << "(" << v.x << ", " << v.y << ")"; }

int main() {
    int n;
    cin >> n;
    Vec s{0, 0};
    for (int i = 0; i < n; i++) {
        Vec v;
        cin >> v.x >> v.y;
        s = s + v;
    }
    long long k;
    cin >> k;
    cout << s * k << "\n";
    return 0;
}
===
!! {2} Класс `Fraction` с `+`, `-`, `*`, `/`, `<<` (всегда сокращённая, знаменатель > 0). Дано выражение «a/b op c/d» — выведи результат.
<<<
#include <iostream>
#include <numeric>
using namespace std;

int main() {
    return 0;
}
<<<
in: 1/2 + 1/3
out: 5/6
in: 3/4 - 1/4
out: 1/2
in: 2/3 * 9/4
out: 3/2
in: 1/2 / 3/4
out: 2/3
hint: Сокращай в конструкторе `gcd` из `<numeric>`; читай дробь как `long long a; char slash; long long b;`.
===
#include <iostream>
#include <numeric>
using namespace std;

struct Fraction {
    long long a, b;
    Fraction(long long x = 0, long long y = 1) {
        if (y < 0) x = -x, y = -y;
        long long g = gcd(x < 0 ? -x : x, y);
        if (g == 0) g = 1;
        a = x / g;
        b = y / g;
    }
    Fraction operator+(const Fraction& o) const { return {a * o.b + o.a * b, b * o.b}; }
    Fraction operator-(const Fraction& o) const { return {a * o.b - o.a * b, b * o.b}; }
    Fraction operator*(const Fraction& o) const { return {a * o.a, b * o.b}; }
    Fraction operator/(const Fraction& o) const { return {a * o.b, b * o.a}; }
};

ostream& operator<<(ostream& os, const Fraction& f) { return os << f.a << "/" << f.b; }
istream& operator>>(istream& is, Fraction& f) {
    long long x, y;
    char c;
    is >> x >> c >> y;
    f = Fraction(x, y);
    return is;
}

int main() {
    Fraction x, y;
    char op;
    cin >> x >> op >> y;
    Fraction r = op == '+' ? x + y : op == '-' ? x - y : op == '*' ? x * y : x / y;
    cout << r << "\n";
    return 0;
}
===
!! {3} Большие числа: класс `BigInt` (строка цифр) с `+` и `*` на int (до 10^9) и `<<`. Дано n — выведи n! (n до 300).
<<<
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 5
out: 120
in: 25
out: 15511210043330985984000000
in: 100
out: 93326215443944152681699238856266700490715968264381621468592963895217599993229915608941463976156518286253697920827223758251185210916864000000000000000000000000
hint: Храни цифры в `vector<int>` задом наперёд; умножение на k — по разрядам с переносом (перенос в long long).
===
#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct BigInt {
    vector<int> d;  // цифры задом наперёд
    BigInt(long long x = 0) {
        if (x == 0) d.push_back(0);
        while (x > 0) { d.push_back(x % 10); x /= 10; }
    }
    BigInt operator*(int k) const {
        BigInt r;
        r.d.clear();
        long long carry = 0;
        for (int digit : d) {
            long long cur = (long long)digit * k + carry;
            r.d.push_back(cur % 10);
            carry = cur / 10;
        }
        while (carry) { r.d.push_back(carry % 10); carry /= 10; }
        while (r.d.size() > 1 && r.d.back() == 0) r.d.pop_back();
        return r;
    }
};

ostream& operator<<(ostream& os, const BigInt& b) {
    for (int i = (int)b.d.size() - 1; i >= 0; i--) os << b.d[i];
    return os;
}

int main() {
    int n;
    cin >> n;
    BigInt f(1);
    for (int i = 2; i <= n; i++) f = f * i;
    cout << f << "\n";
    return 0;
}
===
card: Как научить cout печатать свой тип? :: Перегрузить `ostream& operator<<(ostream& os, const T& x)` и вернуть os.
card: Какие операторы нужны для sort и set? :: `operator<` (строгий порядок).

## cpp-18 | Наследование и виртуальные функции
Наследник расширяет базовый класс. **virtual** позволяет вызывать метод наследника через указатель или ссылку на базу:

```cpp
struct Shape {
    virtual double area() const = 0;      // чисто виртуальная: класс абстрактный
    virtual ~Shape() = default;           // виртуальный деструктор — обязательно!
};

struct Circle : Shape {
    double r;
    Circle(double r) : r(r) {}
    double area() const override { return 3.14159265358979 * r * r; }
};

vector<unique_ptr<Shape>> shapes;
shapes.push_back(make_unique<Circle>(1.0));
for (auto& s : shapes) cout << s->area();  // вызовется Circle::area
```

`override` просит компилятор проверить, что метод правда переопределяет виртуальный. Без виртуального деструктора удаление наследника через указатель на базу — утечка/неопределённое поведение.

?? Что будет без `virtual` у area() в базовом классе?
+ через указатель на Shape вызовется версия Shape, а не наследника
- ошибка компиляции
- всё будет так же
- вызовутся обе версии
= Динамический выбор метода работает только для virtual.

?? Зачем базовому классу виртуальный деструктор?
+ чтобы при delete через указатель на базу вызвался деструктор наследника
- чтобы класс нельзя было создать
- для скорости
- он не нужен
= Иначе ресурсы наследника не освободятся.

!! {1} Абстрактный `Shape` с `area()` и `name()`; `Rect`, `Circle` (π = 3.14159265358979), `Triangle` (по трём сторонам, Герон). Дано n фигур — выведи «имя площадь» (площадь с 2 знаками) по каждой.
<<<
#include <iostream>
#include <memory>
#include <vector>
#include <cmath>
#include <iomanip>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 3\nrect 2 3\ncircle 1\ntriangle 3 4 5
out: rect 6.00\ncircle 3.14\ntriangle 6.00
in: 1\ncircle 0.5
out: circle 0.79
hint: `vector<unique_ptr<Shape>>` и `make_unique<Rect>(w, h)` по первому слову.
===
#include <iostream>
#include <memory>
#include <vector>
#include <cmath>
#include <iomanip>
#include <string>
using namespace std;

struct Shape {
    virtual double area() const = 0;
    virtual string name() const = 0;
    virtual ~Shape() = default;
};
struct Rect : Shape {
    double w, h;
    Rect(double w, double h) : w(w), h(h) {}
    double area() const override { return w * h; }
    string name() const override { return "rect"; }
};
struct Circle : Shape {
    double r;
    Circle(double r) : r(r) {}
    double area() const override { return 3.14159265358979 * r * r; }
    string name() const override { return "circle"; }
};
struct Triangle : Shape {
    double a, b, c;
    Triangle(double a, double b, double c) : a(a), b(b), c(c) {}
    double area() const override {
        double p = (a + b + c) / 2;
        return sqrt(p * (p - a) * (p - b) * (p - c));
    }
    string name() const override { return "triangle"; }
};

int main() {
    int n;
    cin >> n;
    vector<unique_ptr<Shape>> v;
    for (int i = 0; i < n; i++) {
        string k;
        cin >> k;
        if (k == "rect") { double w, h; cin >> w >> h; v.push_back(make_unique<Rect>(w, h)); }
        else if (k == "circle") { double r; cin >> r; v.push_back(make_unique<Circle>(r)); }
        else { double a, b, c; cin >> a >> b >> c; v.push_back(make_unique<Triangle>(a, b, c)); }
    }
    cout << fixed << setprecision(2);
    for (auto& s : v) cout << s->name() << " " << s->area() << "\n";
    return 0;
}
===
!! {2} Иерархия «сотрудники»: базовый `Employee(name, base)` с виртуальным `salary()`; `Manager` (+ бонус за каждого подчинённого: 1000), `Engineer` (base × 1.2, округление вниз). Дано n строк — выведи суммарный фонд зарплат и самого высокооплачиваемого (при равенстве — первого).
<<<
#include <iostream>
#include <memory>
#include <vector>
#include <string>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 3\nmanager Ann 50000 4\nengineer Bob 45000\nemployee Eve 30000
out: 138000 Ann
in: 1\nengineer Max 10
out: 12 Max
hint: У Manager дополнительное поле «подчинённых»; строки: `manager имя оклад k`, `engineer имя оклад`, `employee имя оклад`.
===
#include <iostream>
#include <memory>
#include <vector>
#include <string>
using namespace std;

struct Employee {
    string name;
    long long base;
    Employee(string n, long long b) : name(n), base(b) {}
    virtual long long salary() const { return base; }
    virtual ~Employee() = default;
};
struct Manager : Employee {
    int team;
    Manager(string n, long long b, int t) : Employee(n, b), team(t) {}
    long long salary() const override { return base + 1000LL * team; }
};
struct Engineer : Employee {
    using Employee::Employee;
    long long salary() const override { return base * 12 / 10; }
};

int main() {
    int n;
    cin >> n;
    vector<unique_ptr<Employee>> v;
    for (int i = 0; i < n; i++) {
        string k, name;
        long long b;
        cin >> k >> name >> b;
        if (k == "manager") { int t; cin >> t; v.push_back(make_unique<Manager>(name, b, t)); }
        else if (k == "engineer") v.push_back(make_unique<Engineer>(name, b));
        else v.push_back(make_unique<Employee>(name, b));
    }
    long long total = 0;
    const Employee* best = nullptr;
    for (auto& e : v) {
        total += e->salary();
        if (!best || e->salary() > best->salary()) best = e.get();
    }
    cout << total << " " << best->name << "\n";
    return 0;
}
===
!! {3} Вычисление выражений деревом: узлы `Num`, `Add`, `Mul`, `Neg` с виртуальным `eval()` и `str()`. Выражение дано в польской (префиксной) записи: `+ 2 * 3 4`. Выведи выражение со скобками и значение: `(2 + (3 * 4)) = 14`.
<<<
#include <iostream>
#include <memory>
#include <string>
using namespace std;

int main() {
    return 0;
}
<<<
in: + 2 * 3 4
out: (2 + (3 * 4)) = 14
in: * - 5 + 1 1
out: (-5 * (1 + 1)) = -10
in: 7
out: 7 = 7
hint: Рекурсивный разбор: прочитал токен; если число — Num; если `+`/`*` — разбери два подвыражения; `-` — унарный минус (одно подвыражение).
===
#include <iostream>
#include <memory>
#include <string>
using namespace std;

struct Node {
    virtual long long eval() const = 0;
    virtual string str() const = 0;
    virtual ~Node() = default;
};
struct Num : Node {
    long long v;
    Num(long long v) : v(v) {}
    long long eval() const override { return v; }
    string str() const override { return to_string(v); }
};
struct Bin : Node {
    char op;
    unique_ptr<Node> l, r;
    Bin(char op, unique_ptr<Node> l, unique_ptr<Node> r) : op(op), l(move(l)), r(move(r)) {}
    long long eval() const override { return op == '+' ? l->eval() + r->eval() : l->eval() * r->eval(); }
    string str() const override { return "(" + l->str() + " " + op + " " + r->str() + ")"; }
};
struct Neg : Node {
    unique_ptr<Node> x;
    Neg(unique_ptr<Node> x) : x(move(x)) {}
    long long eval() const override { return -x->eval(); }
    string str() const override { return "-" + x->str(); }
};

unique_ptr<Node> parse() {
    string t;
    cin >> t;
    if (t == "+" || t == "*") {
        auto l = parse();
        auto r = parse();
        return make_unique<Bin>(t[0], move(l), move(r));
    }
    if (t == "-") return make_unique<Neg>(parse());
    return make_unique<Num>(stoll(t));
}

int main() {
    auto e = parse();
    cout << e->str() << " = " << e->eval() << "\n";
    return 0;
}
===
card: Что делает ключевое слово virtual? :: Позволяет вызвать метод наследника через указатель/ссылку на базовый класс (динамический полиморфизм).
card: Зачем писать override? :: Компилятор проверит, что метод правда переопределяет виртуальный метод базы (защита от опечаток в сигнатуре).

### Модуль: STL

## cpp-10 | STL: map, set, pair, очереди
Стандартная библиотека даёт готовые структуры данных:

```cpp
#include <map>
#include <set>
map<string, int> cnt;     // отсортированный словарь
cnt["cat"]++;             // нет ключа — создастся с 0
for (auto& [word, c] : cnt) cout << word << " " << c << "\n";

set<int> s = {5, 1, 3};   // уникальные, отсортированные
s.insert(2);
s.count(3);               // 1 — есть
s.erase(5);
auto it = s.lower_bound(2);  // первый ≥ 2

pair<int, string> p = {1, "a"};
p.first; p.second;
```

`unordered_map` / `unordered_set` — быстрее (O(1) в среднем), но без порядка.

Очереди:

```cpp
#include <queue>
queue<int> q;  q.push(1); q.front(); q.pop();
stack<int> st;
priority_queue<int> pq;   // сверху всегда максимум
priority_queue<int, vector<int>, greater<int>> minpq;   // минимум
```

?? Что произойдёт при `cnt["dog"]++`, если ключа "dog" нет?
+ создастся ключ со значением 0 и станет 1
- ошибка
- ничего
- вернётся -1
= operator[] у map сам создаёт элемент.

?? Какую структуру взять, чтобы быстро доставать минимальный элемент?
- vector
+ priority_queue с greater<int>
- map со значениями
- stack
= Куча отдаёт минимум за O(1), вставка и удаление — O(log n).

!! Даны n и n чисел. Затем q запросов: для каждого числа x выведи наименьшее число из набора, которое ≥ x, или `-1`. Используй set и lower_bound.
<<<
#include <iostream>
#include <set>
using namespace std;

int main() {
    int n;
    cin >> n;
    set<long long> s;
    // твой код
    return 0;
}
<<<
in: 5\n10 3 7 3 20\n4\n1 7 8 21
out: 3\n7\n10\n-1
in: 1\n5\n3\n5 6 -100
out: 5\n-1\n5
hint: Заполни set, затем для каждого запроса `auto it = s.lower_bound(x);`
hint: Если it == s.end() — ответ -1, иначе *it.
===
#include <iostream>
#include <set>
using namespace std;

int main() {
    int n;
    cin >> n;
    set<long long> s;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        s.insert(x);
    }
    int q;
    cin >> q;
    while (q--) {
        long long x;
        cin >> x;
        auto it = s.lower_bound(x);
        cout << (it == s.end() ? -1 : *it) << "\n";
    }
    return 0;
}
===
!! {1} Дан текст до конца ввода. Выведи количество различных слов (без учёта регистра) — используй `set`.
<<<
#include <iostream>
#include <set>
#include <string>
#include <cctype>
using namespace std;

int main() {
    return 0;
}
<<<
in: Cat cat DOG bird Bird dog
out: 3
in: one
out: 1
hint: Приведи слово к нижнему регистру: `for (char& c : w) c = tolower(c);`
===
#include <iostream>
#include <set>
#include <string>
#include <cctype>
using namespace std;

int main() {
    set<string> s;
    string w;
    while (cin >> w) {
        for (char& c : w) c = tolower((unsigned char)c);
        s.insert(w);
    }
    cout << s.size() << "\n";
    return 0;
}
===
!! {2} Дано n пар «имя балл». Выведи имена по убыванию балла (при равенстве — по алфавиту), используя `vector<pair<int, string>>` и сортировку.
<<<
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 4\nann 90\nbob 75\neve 90\ndan 60
out: ann\neve\nbob\ndan
in: 1\nmax 1
out: max
hint: Храни `{-балл, имя}` — тогда обычная сортировка пар даст нужный порядок.
===
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<pair<int, string>> v(n);
    for (auto& p : v) {
        cin >> p.second >> p.first;
        p.first = -p.first;
    }
    sort(v.begin(), v.end());
    for (auto& p : v) cout << p.second << "\n";
    return 0;
}
===
card: Чем map отличается от unordered_map? :: map — отсортирован, O(log n). unordered_map — без порядка, O(1) в среднем.
card: Что делает `s.lower_bound(x)` у set? :: Итератор на первый элемент ≥ x (или end(), если такого нет).

## cpp-11 | Лямбды, шаблоны и алгоритмы
**Лямбда** — функция прямо на месте:

```cpp
auto sq = [](int x) { return x * x; };
sort(v.begin(), v.end(), [](int a, int b) { return a > b; });   // по убыванию
int k = 3;
auto addK = [k](int x) { return x + k; };      // захват переменной
count_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
```

**Шаблон** — одна функция для разных типов:

```cpp
template <typename T>
T maxOf(T a, T b) { return a > b ? a : b; }

maxOf(3, 7);        // int
maxOf(2.5, 1.0);    // double
```

`vector<int>`, `map<K, V>` — тоже шаблоны.

Полезные алгоритмы из `<algorithm>` и `<numeric>`:
- `accumulate(v.begin(), v.end(), 0LL)` — сумма
- `count`, `find`, `any_of`, `all_of`
- `next_permutation` — следующая перестановка
- `binary_search`, `lower_bound`, `upper_bound` — на отсортированном

`auto` выводит тип сам: `auto it = m.find(key);`.

?? Что вернёт `count_if(v.begin(), v.end(), [](int x){ return x > 2; })` для v = {1, 5, 3, 2}?
- 3
+ 2
- 8
- 1
= Подходят 5 и 3.

?? Зачем нужны шаблоны (template)?
+ писать одну функцию или класс для разных типов
- для ускорения программы
- чтобы подключать библиотеки
- для красивого вывода
= vector<T> работает с любым T благодаря шаблонам.

!! Дано n (1 ≤ n ≤ 8). Выведи все перестановки чисел 1..n в лексикографическом порядке, каждую на своей строке, числа через пробел. Используй next_permutation.
<<<
#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 3
out: 1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1
in: 1
out: 1
hint: Заполни vector числами 1..n: `iota(p.begin(), p.end(), 1);`
hint: `do { вывод } while (next_permutation(p.begin(), p.end()));`
===
#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> p(n);
    iota(p.begin(), p.end(), 1);
    do {
        for (int i = 0; i < n; i++) cout << p[i] << (i + 1 < n ? " " : "\n");
    } while (next_permutation(p.begin(), p.end()));
    return 0;
}
===
!! {1} Дано n чисел. С помощью `count_if` и лямбды выведи, сколько чисел делится на 3, а с помощью `accumulate` — сумму квадратов (long long).
<<<
#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    return 0;
}
<<<
in: 5\n3 4 6 7 9
out: 3 191
in: 1\n2
out: 0 4
hint: `accumulate(a.begin(), a.end(), 0LL, [](long long s, long long x) { return s + x * x; })`
===
#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    cout << count_if(a.begin(), a.end(), [](long long x) { return x % 3 == 0; }) << " "
         << accumulate(a.begin(), a.end(), 0LL, [](long long s, long long x) { return s + x * x; }) << "\n";
    return 0;
}
===
!! {2} Шаблонная функция `template <typename T> T clampTo(T x, T lo, T hi)`. Даны lo hi и n целых, затем m дробных — выведи «зажатые» значения: целые в одну строку, дробные (2 знака) — во вторую.
<<<
#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    return 0;
}
<<<
in: 0 10\n4\n-5 3 10 15\n2\n-0.5 9.99
out: 0 3 10 10\n0.00 9.99
in: -1 1\n1\n0\n1\n3.14159
out: 0\n1.00
hint: Одна шаблонная функция работает и для `long long`, и для `double` (`clampTo<double>(x, lo, hi)`).
===
#include <iostream>
#include <iomanip>
using namespace std;

template <typename T>
T clampTo(T x, T lo, T hi) { return x < lo ? lo : x > hi ? hi : x; }

int main() {
    long long lo, hi;
    cin >> lo >> hi;
    int n;
    cin >> n;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        cout << clampTo(x, lo, hi) << (i + 1 < n ? " " : "\n");
    }
    int m;
    cin >> m;
    cout << fixed << setprecision(2);
    for (int i = 0; i < m; i++) {
        double x;
        cin >> x;
        cout << clampTo<double>(x, lo, hi) << (i + 1 < m ? " " : "\n");
    }
    return 0;
}
===
card: Как отсортировать vector по убыванию лямбдой? :: `sort(v.begin(), v.end(), [](int a, int b) { return a > b; });`
card: Что делает `accumulate(v.begin(), v.end(), 0LL)`? :: Сумма элементов в long long (0LL задаёт тип результата).

## cpp-19 | Строковые потоки и разбор ввода
`stringstream` превращает строку в поток — удобно разбирать строки и собирать вывод:

```cpp
#include <sstream>
string line;
getline(cin, line);
stringstream ss(line);
int x;
long long sum = 0;
while (ss >> x) sum += x;          // все числа из строки

ostringstream out;
out << "x=" << 5 << ", y=" << 3.5;
string s = out.str();
```

Разбить по разделителю:

```cpp
stringstream ss("a,b,,c");
string part;
while (getline(ss, part, ',')) { ... }   // "a", "b", "", "c"
```

Чтение до конца ввода построчно: `while (getline(cin, line))`. Ловушка: после `cin >> n` перед `getline` нужен `cin.ignore()`.

?? Что выведет разбор `"10 20 abc 30"` циклом `while (ss >> x)` для int x?
+ прочитает 10 и 20, на abc остановится
- 10 20 30
- ошибка компиляции
- только 10
= Неудачное чтение переводит поток в состояние ошибки.

?? Как разбить строку по запятым?
+ getline(ss, part, ',') в цикле
- ss >> part с запятой
- split(',')
- strtok в C++ не работает
= Третий аргумент getline — разделитель.

!! {1} Даны строки до конца ввода, в каждой — числа через пробел. Выведи сумму каждой строки.
<<<
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    return 0;
}
<<<
in: 1 2 3\n10\n-5 5
out: 6\n10\n0
in: 7 7
out: 14
hint: `while (getline(cin, line)) { stringstream ss(line); ... }`
===
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    string line;
    while (getline(cin, line)) {
        if (line.empty()) continue;
        stringstream ss(line);
        long long x, s = 0;
        while (ss >> x) s += x;
        cout << s << "\n";
    }
    return 0;
}
===
!! {2} CSV: строки «имя,предмет,балл» до конца ввода. Выведи средний балл каждого студента (по алфавиту) с 1 знаком.
<<<
#include <iostream>
#include <sstream>
#include <string>
#include <map>
#include <vector>
#include <iomanip>
using namespace std;

int main() {
    return 0;
}
<<<
in: ann,math,90\nann,phys,80\nbob,math,70
out: ann 85.0\nbob 70.0
in: max,art,100
out: max 100.0
hint: `getline(ss, name, ',')`, `getline(ss, subj, ',')`, `ss >> score`.
===
#include <iostream>
#include <sstream>
#include <string>
#include <map>
#include <vector>
#include <iomanip>
using namespace std;

int main() {
    map<string, vector<int>> m;
    string line;
    while (getline(cin, line)) {
        if (line.empty()) continue;
        stringstream ss(line);
        string name, subj;
        int score;
        getline(ss, name, ',');
        getline(ss, subj, ',');
        ss >> score;
        m[name].push_back(score);
    }
    cout << fixed << setprecision(1);
    for (auto& [name, v] : m) {
        double s = 0;
        for (int x : v) s += x;
        cout << name << " " << s / v.size() << "\n";
    }
    return 0;
}
===
!! {3} Мини-интерпретатор: строки до конца ввода вида `let x = 5`, `let y = x + 3`, `print y` (выражение — числа и переменные через `+` и `-`, через пробелы). Выведи результат каждого `print`; неизвестная переменная — `ошибка: имя`.
<<<
#include <iostream>
#include <sstream>
#include <string>
#include <map>
using namespace std;

int main() {
    return 0;
}
<<<
in: let x = 5\nlet y = x + 3\nprint y\nlet x = y - 10\nprint x\nprint z
out: 8\n-2\nошибка: z
in: let a = 1\nlet b = a + a + a\nprint b - a\nprint q + 1
out: 2\nошибка: q
hint: Функция `bool eval(stringstream& ss, long long& res)`: читай токены, знак применяй к следующему числу/переменной.
===
#include <iostream>
#include <sstream>
#include <string>
#include <map>
#include <cctype>
using namespace std;

map<string, long long> vars;

bool eval(stringstream& ss, long long& res, string& bad) {
    res = 0;
    int sign = 1;
    string t;
    while (ss >> t) {
        if (t == "+") sign = 1;
        else if (t == "-") sign = -1;
        else {
            long long v;
            if (isdigit((unsigned char)t[0])) v = stoll(t);
            else if (vars.count(t)) v = vars[t];
            else { bad = t; return false; }
            res += sign * v;
            sign = 1;
        }
    }
    return true;
}

int main() {
    string line;
    while (getline(cin, line)) {
        stringstream ss(line);
        string cmd, name, eq, bad;
        ss >> cmd;
        long long v;
        if (cmd == "let") {
            ss >> name >> eq;
            if (eval(ss, v, bad)) vars[name] = v;
            else cout << "ошибка: " << bad << "\n";
        } else if (cmd == "print") {
            if (eval(ss, v, bad)) cout << v << "\n";
            else cout << "ошибка: " << bad << "\n";
        }
    }
    return 0;
}
===
card: Как прочитать все числа из одной строки? :: `stringstream ss(line); while (ss >> x) ...`
card: Почему после `cin >> n` getline может вернуть пустую строку? :: В буфере остался перевод строки — нужен `cin.ignore()` перед getline.

## cpp-20 | Итераторы и алгоритмы STL
**Итератор** — «указатель» на элемент контейнера: `v.begin()`, `v.end()` (за последним), `*it`, `++it`. Все алгоритмы работают с парой итераторов `[begin, end)`.

```cpp
sort(v.begin(), v.end());
auto it = lower_bound(v.begin(), v.end(), x);   // первый ≥ x
int pos = it - v.begin();                        // индекс
auto [lo, hi] = equal_range(v.begin(), v.end(), x);  // все равные x
int cnt = hi - lo;

partial_sum(a.begin(), a.end(), pref.begin());   // префиксные суммы
reverse(v.begin(), v.end());
rotate(v.begin(), v.begin() + k, v.end());       // циклический сдвиг влево на k
nth_element(v.begin(), v.begin() + k, v.end());  // k-й по величине за O(n)
v.erase(remove_if(v.begin(), v.end(), [](int x) { return x < 0; }), v.end());
```

`map::lower_bound`, `set::upper_bound` — свои, быстрые (O(log n)).

?? Что вернёт `lower_bound` для x больше всех элементов?
+ end()
- последний элемент
- begin()
- -1
= Поэтому проверяй `it != v.end()` перед разыменованием.

?? Сколько элементов равных x в отсортированном v?
+ upper_bound(…, x) − lower_bound(…, x)
- count(v.begin(), v.end(), x) — единственный способ
- lower_bound(…, x) − begin
- нельзя узнать
= Это O(log n), а count — O(n).

!! {1} Дан отсортированный массив и q запросов x. Для каждого выведи, сколько раз x встречается (equal_range).
<<<
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    return 0;
}
<<<
in: 7\n1 2 2 2 3 5 5\n4\n2 5 4 1
out: 3\n2\n0\n1
in: 1\n0\n1\n0
out: 1
hint: `auto [lo, hi] = equal_range(a.begin(), a.end(), x); cout << hi - lo;`
===
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    int q;
    cin >> q;
    while (q--) {
        int x;
        cin >> x;
        auto [lo, hi] = equal_range(a.begin(), a.end(), x);
        cout << hi - lo << "\n";
    }
    return 0;
}
===
!! {2} Дан массив и k. Выведи массив, циклически сдвинутый влево на k (rotate), а затем — массив без отрицательных чисел (remove_if + erase).
<<<
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    int k;
    cin >> k;
    return 0;
}
<<<
in: 5\n1 -2 3 -4 5\n2
out: 3 -4 5 1 -2\n3 5 1
in: 3\n-1 -2 -3\n4
out: -2 -3 -1
hint: k может быть больше n — возьми `k % n`. Если после удаления пусто — выведи пустую строку.
===
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void print(const vector<int>& v) {
    for (size_t i = 0; i < v.size(); i++) cout << v[i] << (i + 1 < v.size() ? " " : "");
    cout << "\n";
}

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    int k;
    cin >> k;
    rotate(a.begin(), a.begin() + k % n, a.end());
    print(a);
    a.erase(remove_if(a.begin(), a.end(), [](int x) { return x < 0; }), a.end());
    print(a);
    return 0;
}
===
!! {3} Дано n чисел и k. Выведи k-ю порядковую статистику (k-е по возрастанию, с 1) с помощью nth_element, а затем медиану (для чётного n — меньшую из двух средних).
<<<
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    return 0;
}
<<<
in: 6 2\n5 1 9 3 7 2
out: 2 3
in: 1 1\n42
out: 42 42
hint: `nth_element(a.begin(), a.begin() + k - 1, a.end()); a[k - 1]` — медиана: индекс `(n - 1) / 2`.
===
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    nth_element(a.begin(), a.begin() + k - 1, a.end());
    long long kth = a[k - 1];
    nth_element(a.begin(), a.begin() + (n - 1) / 2, a.end());
    cout << kth << " " << a[(n - 1) / 2] << "\n";
    return 0;
}
===
card: Что вернёт lower_bound(v.begin(), v.end(), x)? :: Итератор на первый элемент ≥ x (или end(), если таких нет). Массив должен быть отсортирован.
card: Как удалить элементы по условию из vector? :: `v.erase(remove_if(v.begin(), v.end(), cond), v.end());` (erase-remove).

### Модуль: Алгоритмы

## cpp-21 | Сортировки и бинпоиск по ответу
`sort` — O(n log n). `stable_sort` сохраняет порядок равных. Компаратор возвращает `true`, если первый должен стоять **раньше**:

```cpp
sort(v.begin(), v.end(), [](const auto& a, const auto& b) {
    if (a.score != b.score) return a.score > b.score;
    return a.name < b.name;
});
```

Компаратор должен быть **строгим** (`<`, а не `<=`) — иначе неопределённое поведение.

**Бинпоиск по ответу** — когда «можно ли уложиться в X» монотонно по X:

```cpp
long long lo = 0, hi = 2e9;
while (lo < hi) {
    long long mid = lo + (hi - lo) / 2;
    if (can(mid)) hi = mid; else lo = mid + 1;
}
```

Сортировка подсчётом — O(n + k) для маленьких чисел.

?? Что не так с компаратором `return a <= b;`?
+ он не строгий — sort может упасть или зависнуть
- он сортирует по убыванию
- ничего
- не компилируется
= Для равных элементов compare(a, a) должен быть false.

?? Чем stable_sort отличается от sort?
+ сохраняет исходный порядок равных элементов
- быстрее
- сортирует по убыванию
- работает только для чисел
= Нужно, например, при сортировке по нескольким ключам по очереди.

!! {1} Сортировка подсчётом: дано n оценок от 0 до 100. Выведи их по возрастанию без sort.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 7\n50 3 100 3 0 77 50
out: 0 3 3 50 50 77 100
in: 1\n5
out: 5
hint: `vector<int> cnt(101)`; потом пройди от 0 до 100 и выведи каждое значение cnt[v] раз.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> cnt(101);
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        cnt[x]++;
    }
    bool first = true;
    for (int v = 0; v <= 100; v++)
        for (int k = 0; k < cnt[v]; k++) {
            cout << (first ? "" : " ") << v;
            first = false;
        }
    cout << "\n";
    return 0;
}
===
!! {2} Дано n отрезков «l r». Отсортируй по левому концу и объедини пересекающиеся (касание тоже объединяется). Выведи получившиеся отрезки.
<<<
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 4\n1 3\n8 10\n2 6\n10 12
out: 1 6\n8 12
in: 2\n5 6\n1 2
out: 1 2\n5 6
hint: После сортировки иди по отрезкам: если l ≤ конца текущего — расширяй конец, иначе начинай новый.
===
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<pair<long long, long long>> s(n);
    for (auto& [l, r] : s) cin >> l >> r;
    sort(s.begin(), s.end());
    vector<pair<long long, long long>> res;
    for (auto [l, r] : s) {
        if (!res.empty() && l <= res.back().second) res.back().second = max(res.back().second, r);
        else res.push_back({l, r});
    }
    for (auto [l, r] : res) cout << l << " " << r << "\n";
    return 0;
}
===
!! {3} Коровы в стойлах: n стойл на позициях (неотсортированы) и k коров. Расставь коров так, чтобы минимальное расстояние между ними было максимальным. Выведи это расстояние.
<<<
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    return 0;
}
<<<
in: 5 3\n1 2 8 4 9
out: 3
in: 2 2\n0 1000000000
out: 1000000000
in: 6 4\n0 3 4 7 10 9
out: 3
hint: `can(d)`: жадно ставь коров слева направо, если расстояние от предыдущей ≥ d. Ищи наибольшее d с can(d) == true.
===
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    sort(a.begin(), a.end());
    auto can = [&](long long d) {
        int placed = 1;
        long long last = a[0];
        for (int i = 1; i < n; i++)
            if (a[i] - last >= d) { placed++; last = a[i]; }
        return placed >= k;
    };
    long long lo = 0, hi = a.back() - a[0];
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2;
        if (can(mid)) lo = mid;
        else hi = mid - 1;
    }
    cout << lo << "\n";
    return 0;
}
===
card: Каким должен быть компаратор для sort? :: Строгим: возвращать true, только если первый элемент должен стоять раньше (как `<`, не `<=`).
card: Как искать «максимальное X, при котором можно»? :: `while (lo < hi) { mid = lo + (hi - lo + 1) / 2; if (can(mid)) lo = mid; else hi = mid - 1; }`

## cpp-22 | Префиксные суммы, два указателя, разностный массив
**Префиксные суммы** — сумма на отрезке за O(1). **Разностный массив** — наоборот: прибавить x ко всему отрезку [l, r] за O(1), а в конце восстановить массив префиксными суммами:

```cpp
vector<long long> diff(n + 1, 0);
// прибавить x на [l, r] (с 0)
diff[l] += x;
diff[r + 1] -= x;
// восстановить
long long cur = 0;
for (int i = 0; i < n; i++) { cur += diff[i]; a[i] += cur; }
```

**Два указателя**: отрезки с условием на сумму, пары в отсортированном массиве, слияние двух отсортированных.

**Хеш-таблица префиксов**: число отрезков с суммой ровно k — `unordered_map<long long, int>` с количеством каждой префиксной суммы: для префикса p ищем, сколько раньше было `p - k`.

?? Как прибавить x ко всем элементам [l, r] за O(1)?
+ diff[l] += x; diff[r + 1] -= x; потом префиксные суммы
- цикл от l до r
- a[l] += x
- sort
= Каждая операция — O(1), восстановление — O(n) один раз в конце.

?? Как посчитать число отрезков с суммой ровно k (числа любые)?
+ префиксные суммы и словарь «сколько раз встречалась сумма p − k»
- два указателя всегда
- перебор O(n³)
- нельзя быстрее O(n²)
= Два указателя работают только для неотрицательных чисел.

!! {1} Массив из n нулей и q операций «l r x» (с 1): прибавить x на отрезке. Выведи итоговый массив (разностный массив).
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, q;
    cin >> n >> q;
    return 0;
}
<<<
in: 5 3\n1 3 2\n2 5 1\n5 5 10
out: 2 3 3 1 11
in: 1 1\n1 1 7
out: 7
hint: Индексы с 1 — массив diff размером n + 2.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, q;
    cin >> n >> q;
    vector<long long> d(n + 2, 0);
    while (q--) {
        int l, r;
        long long x;
        cin >> l >> r >> x;
        d[l] += x;
        d[r + 1] -= x;
    }
    long long cur = 0;
    for (int i = 1; i <= n; i++) {
        cur += d[i];
        cout << cur << (i < n ? " " : "\n");
    }
    return 0;
}
===
!! {2} Слияние двух отсортированных массивов двумя указателями (без sort): даны n, массив, m, массив — выведи объединённый отсортированный.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 3\n1 4 9\n4\n2 3 10 11
out: 1 2 3 4 9 10 11
in: 1\n5\n1\n5
out: 5 5
hint: Пока оба не кончились — бери меньший из `a[i]` и `b[j]`; потом допиши хвосты.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    int m;
    cin >> m;
    vector<int> b(m);
    for (int& x : b) cin >> x;
    vector<int> r;
    int i = 0, j = 0;
    while (i < n && j < m) r.push_back(a[i] <= b[j] ? a[i++] : b[j++]);
    while (i < n) r.push_back(a[i++]);
    while (j < m) r.push_back(b[j++]);
    for (size_t k = 0; k < r.size(); k++) cout << r[k] << (k + 1 < r.size() ? " " : "\n");
    return 0;
}
===
!! {3} Дано n чисел (могут быть отрицательными) и k. Выведи количество подотрезков с суммой ровно k за O(n).
<<<
#include <iostream>
#include <unordered_map>
using namespace std;

int main() {
    int n;
    long long k;
    cin >> n >> k;
    return 0;
}
<<<
in: 5 3\n1 2 1 -1 3
out: 5
in: 3 0\n0 0 0
out: 6
in: 3 7\n1 1 1
out: 0
hint: `cnt[0] = 1`; идём по массиву, `p += x`, `ans += cnt[p - k]`, затем `cnt[p]++`.
===
#include <iostream>
#include <unordered_map>
using namespace std;

int main() {
    int n;
    long long k;
    cin >> n >> k;
    unordered_map<long long, long long> cnt;
    cnt[0] = 1;
    long long p = 0, ans = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        p += x;
        auto it = cnt.find(p - k);
        if (it != cnt.end()) ans += it->second;
        cnt[p]++;
    }
    cout << ans << "\n";
    return 0;
}
===
card: Что такое разностный массив? :: diff[l] += x, diff[r+1] -= x — прибавление на отрезке за O(1); итог — префиксные суммы diff.
card: Как найти число отрезков с суммой k за O(n)? :: Префиксные суммы + хеш-таблица: для текущего префикса p прибавить, сколько раз встречалось p − k.

## cpp-23 | Стек, очередь, дек и монотонный стек
STL-адаптеры:

```cpp
stack<int> st;   st.push(1); st.top(); st.pop();
queue<int> q;    q.push(1);  q.front(); q.pop();
deque<int> dq;   dq.push_front(0); dq.push_back(1); dq.pop_front(); dq.back();
```

**Монотонный стек** — для «ближайшего меньшего/большего слева/справа» за O(n). Классика — **наибольший прямоугольник в гистограмме**: для каждого столбца находим, насколько далеко можно расширить его влево и вправо, пока столбцы не ниже.

```cpp
// ближайший меньший слева
vector<int> left(n);
stack<int> st;
for (int i = 0; i < n; i++) {
    while (!st.empty() && h[st.top()] >= h[i]) st.pop();
    left[i] = st.empty() ? -1 : st.top();
    st.push(i);
}
```

**Дек** — скользящий минимум/максимум окна.

?? Почему монотонный стек работает за O(n)?
+ каждый индекс кладётся и снимается со стека не больше одного раза
- потому что стек маленький
- это O(n log n)
- из-за сортировки
= Суммарно не более 2n операций.

?? Что вернёт `st.top()` у пустого stack?
+ неопределённое поведение — проверяй empty()
- 0
- исключение
- -1
= В C++ контейнеры не проверяют такие ошибки за тебя.

!! {1} Проверь скобочную последовательность `()[]{}` через `stack<char>`. Выведи `YES` или `NO`.
<<<
#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    return 0;
}
<<<
in: {[()()]}
out: YES
in: ([)]
out: NO
in: (
out: NO
hint: Открывающую — в стек; закрывающую сравни с `top()` (если стек не пуст).
===
#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    stack<char> st;
    bool ok = true;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else {
            char need = c == ')' ? '(' : c == ']' ? '[' : '{';
            if (st.empty() || st.top() != need) { ok = false; break; }
            st.pop();
        }
    }
    cout << (ok && st.empty() ? "YES" : "NO") << "\n";
    return 0;
}
===
!! {2} Скользящий минимум: n чисел и окно k. Выведи минимум каждого окна за O(n) с помощью deque.
<<<
#include <iostream>
#include <vector>
#include <deque>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    return 0;
}
<<<
in: 8 3\n1 3 -1 -3 5 3 6 7
out: -1 -3 -3 -3 3 3
in: 3 3\n5 1 2
out: 1
hint: В деке храни индексы возрастающих значений: с конца снимай те, что ≥ текущего; с начала — вышедшие из окна.
===
#include <iostream>
#include <vector>
#include <deque>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    deque<int> dq;
    bool first = true;
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && a[dq.back()] >= a[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();
        if (i >= k - 1) {
            cout << (first ? "" : " ") << a[dq.front()];
            first = false;
        }
    }
    cout << "\n";
    return 0;
}
===
!! {3} Наибольший прямоугольник в гистограмме: даны высоты n столбцов (ширина каждого 1). Выведи площадь наибольшего прямоугольника.
<<<
#include <iostream>
#include <vector>
#include <stack>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 7\n2 1 4 5 1 3 3
out: 8
in: 1\n5
out: 5
in: 4\n2 2 2 2
out: 8
hint: Найди для каждого столбца ближайший меньший слева и справа (монотонный стек); площадь = h[i] × (right − left − 1).
===
#include <iostream>
#include <vector>
#include <stack>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<long long> h(n);
    for (auto& x : h) cin >> x;
    vector<int> L(n), R(n);
    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && h[st.top()] >= h[i]) st.pop();
        L[i] = st.empty() ? -1 : st.top();
        st.push(i);
    }
    while (!st.empty()) st.pop();
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && h[st.top()] >= h[i]) st.pop();
        R[i] = st.empty() ? n : st.top();
        st.push(i);
    }
    long long best = 0;
    for (int i = 0; i < n; i++) best = max(best, h[i] * (R[i] - L[i] - 1));
    cout << best << "\n";
    return 0;
}
===
card: Для чего нужен монотонный стек? :: Найти для каждого элемента ближайший меньший/больший слева или справа за O(n).
card: Как найти минимум в каждом окне длины k за O(n)? :: Дек индексов с возрастающими значениями: снимать с конца ≥ текущего, с начала — вышедшие из окна.

## cpp-12 | Динамическое программирование
**ДП** — решаем задачу через ответы на подзадачи поменьше и запоминаем их в таблицу, чтобы не считать заново.

Шаги:
1. Что храним: `dp[i]` = ответ для первых i элементов (или для числа i)
2. База: самые маленькие случаи
3. Переход: как dp[i] выражается через меньшие
4. Порядок: считаем от маленьких к большим

Пример — сколькими способами подняться на n ступенек, шагая на 1 или 2:

```cpp
vector<long long> dp(n + 1);
dp[0] = 1; dp[1] = 1;
for (int i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
```

Классика: рюкзак, наибольшая общая подпоследовательность (НОП), наибольшая возрастающая подпоследовательность, минимальная стоимость пути в таблице.

Таблица для НОП строк a и b: `dp[i][j]` — НОП префиксов a[0..i) и b[0..j):
- если `a[i-1] == b[j-1]`: `dp[i][j] = dp[i-1][j-1] + 1`
- иначе `max(dp[i-1][j], dp[i][j-1])`

?? Чем ДП лучше наивной рекурсии для чисел Фибоначчи?
+ каждая подзадача считается один раз: O(n) вместо экспоненты
- ДП использует меньше памяти всегда
- ничем
- рекурсия вообще не работает
= Наивная рекурсия пересчитывает одни и те же fib(k) много раз.

?? Что нужно задать в ДП кроме перехода?
+ базу — ответы для самых маленьких случаев
- только ответ
- рекурсию
- сортировку
= Без базы таблицу не с чего начать заполнять.

!! Даны две строки (латиница, без пробелов, длина до 1000). Выведи длину их наибольшей общей подпоследовательности.
<<<
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    string a, b;
    cin >> a >> b;
    return 0;
}
<<<
in: ABCBDAB\nBDCABA
out: 4
in: abc\nxyz
out: 0
in: kamado\nkamado
out: 6
hint: Таблица `vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));`
hint: Переход: если a[i-1] == b[j-1], dp[i][j] = dp[i-1][j-1] + 1, иначе max(dp[i-1][j], dp[i][j-1]). Ответ dp[n][m].
===
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    string a, b;
    cin >> a >> b;
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1 : max(dp[i - 1][j], dp[i][j - 1]);
    cout << dp[n][m] << "\n";
    return 0;
}
===
!! {1} Лестница: на n ступенек можно шагать на 1 или 2. Сколько способов? Ответ по модулю 10^9+7 (n до 10^6).
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 4
out: 5
in: 1
out: 1
in: 1000000
out: 534400663
hint: `dp[i] = (dp[i-1] + dp[i-2]) % MOD`, `dp[0] = dp[1] = 1`.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    const long long MOD = 1000000007;
    vector<long long> dp(n + 2);
    dp[0] = dp[1] = 1;
    for (int i = 2; i <= n; i++) dp[i] = (dp[i - 1] + dp[i - 2]) % MOD;
    cout << dp[n] << "\n";
    return 0;
}
===
!! {3} Черепашка в таблице n×m с монетами идёт из левого верхнего угла в правый нижний только вправо и вниз. Выведи максимальное число монет, которое она соберёт.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    return 0;
}
<<<
in: 3 3\n1 3 1\n1 5 1\n4 2 1
out: 12
in: 1 3\n5 0 7
out: 12
hint: `dp[i][j] = a[i][j] + max(dp[i-1][j], dp[i][j-1])` с аккуратными краями.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<long long>> a(n, vector<long long>(m)), dp(n, vector<long long>(m));
    for (auto& r : a) for (auto& x : r) cin >> x;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            long long best = 0;
            if (i > 0 && j > 0) best = max(dp[i - 1][j], dp[i][j - 1]);
            else if (i > 0) best = dp[i - 1][j];
            else if (j > 0) best = dp[i][j - 1];
            dp[i][j] = a[i][j] + best;
        }
    cout << dp[n - 1][m - 1] << "\n";
    return 0;
}
===
card: Из каких частей состоит решение ДП? :: Что храним (состояние), база, переход, порядок вычисления, где ответ.
card: Переход в задаче о НОП? :: Символы равны → dp[i-1][j-1] + 1, иначе max(dp[i-1][j], dp[i][j-1]).

## cpp-24 | Динамика: рюкзак, НВП, подпоследовательности
Продолжаем ДП.

**Рюкзак 0/1** одномерным массивом — веса перебираем **с конца**:

```cpp
vector<long long> dp(W + 1, 0);
for (auto [w, c] : items)
    for (int x = W; x >= w; x--)
        dp[x] = max(dp[x], dp[x - w] + c);
```

**НВП за O(n log n)**: `tails[k]` — минимальный последний элемент возрастающей подпоследовательности длины k+1:

```cpp
vector<int> tails;
for (int x : a) {
    auto it = lower_bound(tails.begin(), tails.end(), x);
    if (it == tails.end()) tails.push_back(x); else *it = x;
}
// длина НВП = tails.size()
```

**ДП по отрезкам** (палиндромы, разбиение): `dp[l][r]` по возрастанию длины отрезка.

?? Почему в рюкзаке 0/1 веса перебирают с конца?
+ чтобы dp[x − w] был ещё «до этого предмета» и предмет не взяли дважды
- так быстрее
- без разницы
- чтобы ответ был в dp[0]
= С начала получился бы рюкзак с неограниченным числом предметов.

?? Какая сложность у НВП с бинпоиском?
+ O(n log n)
- O(n²)
- O(n)
- O(2ⁿ)
= Для каждого элемента — один lower_bound.

!! {1} Рюкзак 0/1: W n и n строк «вес цена». Выведи максимальную цену.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int W, n;
    cin >> W >> n;
    return 0;
}
<<<
in: 10 4\n5 10\n4 40\n6 30\n3 50
out: 90
in: 5 2\n6 100\n7 200
out: 0
hint: Код — в гайде.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int W, n;
    cin >> W >> n;
    vector<long long> dp(W + 1, 0);
    for (int i = 0; i < n; i++) {
        int w;
        long long c;
        cin >> w >> c;
        for (int x = W; x >= w; x--) dp[x] = max(dp[x], dp[x - w] + c);
    }
    cout << dp[W] << "\n";
    return 0;
}
===
!! {2} Длина наибольшей строго возрастающей подпоследовательности за O(n log n) (n до 2·10^5).
<<<
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 8\n10 9 2 5 3 7 101 18
out: 4
in: 4\n3 3 3 3
out: 1
in: 5\n1 2 3 4 5
out: 5
hint: `lower_bound` по массиву tails — код в гайде.
===
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> tails;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    cout << tails.size() << "\n";
    return 0;
}
===
!! {3} Дана строка. Выведи длину наибольшей подпоследовательности-палиндрома (не обязательно подряд). Длина до 2000.
<<<
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string s;
    cin >> s;
    return 0;
}
<<<
in: bbbab
out: 4
in: abcd
out: 1
in: character
out: 5
hint: `dp[l][r]`: если `s[l] == s[r]` — `dp[l+1][r-1] + 2`, иначе `max(dp[l+1][r], dp[l][r-1])`. Перебирай l с конца.
===
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string s;
    cin >> s;
    int n = s.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));
    for (int l = n - 1; l >= 0; l--) {
        dp[l][l] = 1;
        for (int r = l + 1; r < n; r++)
            dp[l][r] = s[l] == s[r] ? (l + 1 <= r - 1 ? dp[l + 1][r - 1] : 0) + 2 : max(dp[l + 1][r], dp[l][r - 1]);
    }
    cout << dp[0][n - 1] << "\n";
    return 0;
}
===
card: Как найти длину НВП за O(n log n)? :: Массив tails и lower_bound: заменяем первый ≥ x или добавляем в конец; ответ — размер tails.
card: Порядок вычисления в ДП по отрезкам dp[l][r]? :: По возрастанию длины отрезка (или l с конца, r вперёд), чтобы меньшие отрезки уже были посчитаны.

## cpp-13 | Графы: BFS, DFS и Дейкстра
Граф хранят **списком смежности**: `vector<vector<int>> g(n + 1);` — для каждой вершины список соседей.

**DFS** (в глубину) — рекурсивно идём, пока можем: компоненты связности, циклы.

```cpp
vector<bool> used(n + 1);
void dfs(int v) {
    used[v] = true;
    for (int to : g[v]) if (!used[to]) dfs(to);
}
```

**BFS** (в ширину) — очередь; находит кратчайшие пути по числу рёбер.

**Дейкстра** — кратчайшие пути при неотрицательных весах, с очередью с приоритетом:

```cpp
vector<long long> dist(n + 1, LLONG_MAX);
priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
dist[s] = 0; pq.push({0, s});
while (!pq.empty()) {
    auto [d, v] = pq.top(); pq.pop();
    if (d > dist[v]) continue;           // устаревшая запись
    for (auto [to, w] : g[v])
        if (dist[v] + w < dist[to]) {
            dist[to] = dist[v] + w;
            pq.push({dist[to], to});
        }
}
```

Сложность Дейкстры: O((n + m) log n).

?? Какой обход находит кратчайший путь по числу рёбер?
+ BFS
- DFS
- оба одинаково
- никакой
= BFS обходит вершины слоями по расстоянию.

?? Когда Дейкстра даёт неверный ответ?
+ когда есть рёбра с отрицательным весом
- когда граф неориентированный
- когда вершин больше 100
- никогда
= Для отрицательных весов — алгоритм Беллмана–Форда.

!! Дан ориентированный взвешенный граф: n, m, затем m строк «u v w» (w ≥ 0) и вершина s. Выведи кратчайшие расстояния от s до всех вершин 1..n через пробел; недостижимым — -1.
<<<
#include <iostream>
#include <vector>
#include <queue>
#include <climits>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<pair<int, long long>>> g(n + 1);
    return 0;
}
<<<
in: 4 5\n1 2 4\n1 3 1\n3 2 2\n2 4 5\n3 4 10\n1
out: 0 3 1 8
in: 3 1\n1 2 7\n2
out: -1 0 -1
hint: Читай рёбра `g[u].push_back({v, w});`, затем s.
hint: Дейкстра из теории; при выводе LLONG_MAX замени на -1.
===
#include <iostream>
#include <vector>
#include <queue>
#include <climits>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<pair<int, long long>>> g(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v;
        long long w;
        cin >> u >> v >> w;
        g[u].push_back({v, w});
    }
    int s;
    cin >> s;
    vector<long long> dist(n + 1, LLONG_MAX);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;
    dist[s] = 0;
    pq.push({0, s});
    while (!pq.empty()) {
        auto [d, v] = pq.top();
        pq.pop();
        if (d > dist[v]) continue;
        for (auto [to, w] : g[v]) {
            if (dist[v] + w < dist[to]) {
                dist[to] = dist[v] + w;
                pq.push({dist[to], to});
            }
        }
    }
    for (int v = 1; v <= n; v++) cout << (dist[v] == LLONG_MAX ? -1 : dist[v]) << (v < n ? " " : "\n");
    return 0;
}
===
!! {1} Дан неориентированный граф (n m, рёбра). Выведи количество компонент связности (DFS или BFS).
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    return 0;
}
<<<
in: 6 3\n1 2\n2 3\n5 6
out: 3
in: 2 0
out: 2
hint: Обходи стеком `vector<int> st` из каждой непосещённой вершины и считай запуски.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<int>> g(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        g[u].push_back(v);
        g[v].push_back(u);
    }
    vector<bool> used(n + 1);
    int comp = 0;
    for (int s = 1; s <= n; s++) {
        if (used[s]) continue;
        comp++;
        vector<int> st = {s};
        used[s] = true;
        while (!st.empty()) {
            int v = st.back();
            st.pop_back();
            for (int to : g[v])
                if (!used[to]) {
                    used[to] = true;
                    st.push_back(to);
                }
        }
    }
    cout << comp << "\n";
    return 0;
}
===
!! {2} Дан неориентированный граф и вершина s. Выведи расстояния (в рёбрах) от s до всех вершин 1..n через BFS (недостижимые — -1).
<<<
#include <iostream>
#include <vector>
#include <queue>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    return 0;
}
<<<
in: 5 4\n1 2\n2 3\n1 4\n4 3\n1
out: 0 1 2 1 -1
in: 3 1\n2 3\n1
out: 0 -1 -1
hint: `queue<int> q`, `dist(n + 1, -1)`.
===
#include <iostream>
#include <vector>
#include <queue>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<int>> g(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v;
        cin >> u >> v;
        g[u].push_back(v);
        g[v].push_back(u);
    }
    int s;
    cin >> s;
    vector<int> dist(n + 1, -1);
    queue<int> q;
    dist[s] = 0;
    q.push(s);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (int to : g[v])
            if (dist[to] == -1) {
                dist[to] = dist[v] + 1;
                q.push(to);
            }
    }
    for (int v = 1; v <= n; v++) cout << dist[v] << (v < n ? " " : "\n");
    return 0;
}
===
card: Как хранят граф для BFS/DFS/Дейкстры? :: Список смежности: `vector<vector<int>> g(n + 1)` (или пары {сосед, вес}).
card: Сложность алгоритма Дейкстры с кучей? :: O((n + m) log n).

## cpp-25 | Система непересекающихся множеств и остовное дерево
**DSU (Union-Find)** быстро отвечает «в одной ли группе a и b» и объединяет группы:

```cpp
vector<int> p, sz;
int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }   // сжатие путей
bool unite(int a, int b) {
    a = find(a); b = find(b);
    if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b);                                // по размеру
    p[b] = a; sz[a] += sz[b];
    return true;
}
```

Почти O(1) на операцию.

**Минимальное остовное дерево (алгоритм Краскала)**: сортируем рёбра по весу и берём ребро, если оно соединяет разные компоненты (unite вернул true). Пример: проложить кабель между всеми зданиями с минимальной длиной.

?? Что даёт «сжатие путей» в find?
+ после поиска все вершины пути указывают прямо на корень — следующие поиски быстрые
- уменьшает память
- сортирует вершины
- удаляет лишние вершины
= Вместе с объединением по размеру — почти константа.

?? Когда Краскал пропускает ребро?
+ когда его концы уже в одной компоненте (иначе получится цикл)
- когда ребро слишком длинное
- когда вершин больше 100
- никогда
= Остовное дерево не содержит циклов.

!! {1} n элементов и q запросов: `union a b` и `same a b` (выведи `YES` или `NO`).
<<<
#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    int n, q;
    cin >> n >> q;
    return 0;
}
<<<
in: 5 5\nunion 1 2\nsame 1 2\nsame 1 3\nunion 2 3\nsame 1 3
out: YES\nNO\nYES
in: 2 1\nsame 1 2
out: NO
hint: Код DSU — в гайде; не забудь `p[i] = i`, `sz[i] = 1`.
===
#include <iostream>
#include <vector>
#include <string>
#include <numeric>
using namespace std;

vector<int> p, sz;
int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
bool unite(int a, int b) {
    a = find(a), b = find(b);
    if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b);
    p[b] = a;
    sz[a] += sz[b];
    return true;
}

int main() {
    int n, q;
    cin >> n >> q;
    p.resize(n + 1);
    sz.assign(n + 1, 1);
    iota(p.begin(), p.end(), 0);
    while (q--) {
        string cmd;
        int a, b;
        cin >> cmd >> a >> b;
        if (cmd == "union") unite(a, b);
        else cout << (find(a) == find(b) ? "YES" : "NO") << "\n";
    }
    return 0;
}
===
!! {2} Дано n m и рёбра графа. После добавления каждого ребра выведи число компонент связности (DSU).
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    return 0;
}
<<<
in: 4 4\n1 2\n3 4\n1 2\n2 3
out: 3\n2\n2\n1
in: 1 0
out: 1
hint: Компонент сначала n; каждый успешный unite уменьшает на 1. Для m = 0 ничего не выводи, кроме n в одной строке.
===
#include <iostream>
#include <vector>
#include <numeric>
using namespace std;

vector<int> p, sz;
int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
bool unite(int a, int b) {
    a = find(a), b = find(b);
    if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b);
    p[b] = a;
    sz[a] += sz[b];
    return true;
}

int main() {
    int n, m;
    cin >> n >> m;
    p.resize(n + 1);
    sz.assign(n + 1, 1);
    iota(p.begin(), p.end(), 0);
    int comp = n;
    if (m == 0) cout << comp << "\n";
    for (int i = 0; i < m; i++) {
        int a, b;
        cin >> a >> b;
        if (unite(a, b)) comp--;
        cout << comp << "\n";
    }
    return 0;
}
===
!! {3} Минимальное остовное дерево (Краскал): n m и рёбра «u v w». Выведи суммарный вес МОД или `IMPOSSIBLE`, если граф несвязный.
<<<
#include <iostream>
#include <vector>
#include <algorithm>
#include <tuple>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    return 0;
}
<<<
in: 4 5\n1 2 1\n2 3 4\n3 4 2\n4 1 3\n1 3 5
out: 6
in: 3 1\n1 2 5
out: IMPOSSIBLE
in: 1 0
out: 0
hint: Храни рёбра как `tuple<long long, int, int>` (вес первым) — тогда `sort` упорядочит по весу.
===
#include <iostream>
#include <vector>
#include <algorithm>
#include <tuple>
#include <numeric>
using namespace std;

vector<int> p, sz;
int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
bool unite(int a, int b) {
    a = find(a), b = find(b);
    if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b);
    p[b] = a;
    sz[a] += sz[b];
    return true;
}

int main() {
    int n, m;
    cin >> n >> m;
    vector<tuple<long long, int, int>> e(m);
    for (auto& [w, u, v] : e) cin >> u >> v >> w;
    sort(e.begin(), e.end());
    p.resize(n + 1);
    sz.assign(n + 1, 1);
    iota(p.begin(), p.end(), 0);
    long long total = 0;
    int used = 0;
    for (auto& [w, u, v] : e)
        if (unite(u, v)) {
            total += w;
            used++;
        }
    if (used == n - 1) cout << total << "\n";
    else cout << "IMPOSSIBLE\n";
    return 0;
}
===
card: Какие две оптимизации делают DSU почти O(1)? :: Сжатие путей в find и объединение по размеру (или рангу).
card: Как работает алгоритм Краскала? :: Сортируем рёбра по весу и берём ребро, если его концы в разных компонентах (DSU).

## cpp-26 | Битовые операции и теория чисел
Биты: `&` (и), `|` (или), `^` (исключающее или), `~` (не), `<<`, `>>`.

```cpp
x & 1          // чётность
x >> k & 1     // k-й бит
x | (1 << k)   // включить k-й бит
x & (x - 1)    // убрать младшую единицу
__builtin_popcount(x)   // число единиц (popcountll для long long)
for (int mask = 0; mask < (1 << n); mask++)  // перебор всех подмножеств
```

`a ^ a = 0`, `a ^ 0 = a` — так находят единственный непарный элемент.

Теория чисел:
- НОД — `gcd(a, b)` (`<numeric>`), НОК — `a / gcd(a, b) * b`
- **быстрое возведение в степень** по модулю — O(log n)
- **решето Эратосфена** — все простые до n за O(n log log n)
- остатки: `(a + b) % m`, `(a * b) % m` — бери модуль на каждом шаге

?? Что даёт `x & (x - 1)`?
+ x без младшего единичного бита
- x − 1
- 0 всегда
- старший бит x
= Так считают единицы или проверяют степень двойки: `x & (x - 1) == 0`.

?? Чему равно `5 ^ 3`?
+ 6
- 125
- 8
- 2
= 101 ^ 011 = 110.

!! {1} Дано n чисел, все встречаются дважды, кроме одного. Найди его через XOR.
<<<
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    return 0;
}
<<<
in: 5\n4 1 2 1 2
out: 4
in: 1\n7
out: 7
hint: `res ^= x` для всех чисел — пары взаимно уничтожатся.
===
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    long long r = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        r ^= x;
    }
    cout << r << "\n";
    return 0;
}
===
!! {2} Быстрое возведение в степень: даны a, n, m (n до 10^18). Выведи a^n mod m.
<<<
#include <iostream>
using namespace std;

int main() {
    long long a, n, m;
    cin >> a >> n >> m;
    return 0;
}
<<<
in: 2 10 1000
out: 24
in: 3 1000000000000000000 1000000007
out: 246336683
in: 5 0 7
out: 1
hint: Пока n > 0: если `n & 1` — `res = res * a % m`; `a = a * a % m`; `n >>= 1`. Для больших m перемножай в `__int128`.
===
#include <iostream>
using namespace std;

int main() {
    long long a, n, m;
    cin >> a >> n >> m;
    long long r = 1 % m;
    a %= m;
    while (n > 0) {
        if (n & 1) r = (__int128)r * a % m;
        a = (__int128)a * a % m;
        n >>= 1;
    }
    cout << r << "\n";
    return 0;
}
===
!! {3} Дано n предметов с ценами (n до 20) и бюджет B. Перебором масок найди количество подмножеств с суммой ровно B и максимальную сумму, не превышающую B.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    long long B;
    cin >> n >> B;
    return 0;
}
<<<
in: 4 10\n2 3 5 7
out: 2 10
in: 3 1\n5 6 7
out: 0 0
hint: `for (int mask = 0; mask < (1 << n); mask++)` — сумма тех i, где `mask >> i & 1`.
===
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    long long B;
    cin >> n >> B;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    long long cnt = 0, best = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        long long s = 0;
        for (int i = 0; i < n; i++)
            if (mask >> i & 1) s += a[i];
        if (s == B) cnt++;
        if (s <= B && s > best) best = s;
    }
    cout << cnt << " " << best << "\n";
    return 0;
}
===
card: Как проверить, что x — степень двойки? :: `x > 0 && (x & (x - 1)) == 0`.
card: Как быстро посчитать a^n mod m? :: Бинарное возведение: пока n > 0 — если бит n равен 1, умножить ответ на a; a = a²; n >>= 1. O(log n).

### Модуль: Проекты

## cpp-27 | Проект: класс Matrix
Соберём полноценный класс матрицы — как в библиотеках линейной алгебры.

```cpp
class Matrix {
    int n, m;
    vector<vector<long long>> a;
public:
    Matrix(int n, int m) : n(n), m(m), a(n, vector<long long>(m)) {}
    long long& operator()(int i, int j) { return a[i][j]; }       // доступ m(i, j)
    Matrix operator*(const Matrix& o) const { ... }
    friend ostream& operator<<(ostream& os, const Matrix& x);
};
```

Шаги проекта: хранение и ввод-вывод → сложение и умножение (с проверкой размеров) → транспонирование → **быстрое возведение матрицы в степень** (числа Фибоначчи за O(log n)!).

Ошибки размеров — исключение `invalid_argument`: так ошибку видно сразу, а не мусор в ответе.

?? Зачем `operator()(int i, int j)` возвращает ссылку `long long&`?
+ чтобы можно было и читать, и записывать: m(0, 1) = 5
- для скорости
- так короче
- это ошибка
= Возврат по значению дал бы только копию.

?? Как посчитать n-е число Фибоначчи за O(log n)?
+ возвести матрицу [[1,1],[1,0]] в степень n быстрым возведением
- рекурсией
- циклом
- нельзя
= Каждое умножение 2×2 — константа, умножений — log n.

!! {1} Шаг 1. Класс Matrix с вводом, выводом и сложением. Даны две матрицы (размеры и элементы) — выведи сумму или `размеры не совпадают`.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    return 0;
}
<<<
in: 2 2\n1 2\n3 4\n2 2\n10 20\n30 40
out: 11 22\n33 44
in: 1 2\n1 2\n2 1\n1\n2
out: размеры не совпадают
hint: Перегрузи `operator+` и брось `invalid_argument`, если размеры разные; поймай в main.
===
#include <iostream>
#include <vector>
#include <stdexcept>
using namespace std;

class Matrix {
public:
    int n, m;
    vector<vector<long long>> a;
    Matrix(int n = 0, int m = 0) : n(n), m(m), a(n, vector<long long>(m)) {}
    Matrix operator+(const Matrix& o) const {
        if (n != o.n || m != o.m) throw invalid_argument("размеры не совпадают");
        Matrix r(n, m);
        for (int i = 0; i < n; i++)
            for (int j = 0; j < m; j++) r.a[i][j] = a[i][j] + o.a[i][j];
        return r;
    }
};

istream& operator>>(istream& is, Matrix& x) {
    int n, m;
    is >> n >> m;
    x = Matrix(n, m);
    for (auto& r : x.a)
        for (auto& v : r) is >> v;
    return is;
}

ostream& operator<<(ostream& os, const Matrix& x) {
    for (auto& r : x.a)
        for (int j = 0; j < x.m; j++) os << r[j] << (j + 1 < x.m ? " " : "\n");
    return os;
}

int main() {
    Matrix a, b;
    cin >> a >> b;
    try {
        cout << a + b;
    } catch (const invalid_argument& e) {
        cout << e.what() << "\n";
    }
    return 0;
}
===
!! {2} Шаг 2. Добавь умножение и транспонирование. Даны две матрицы — выведи A × B (или `размеры не совпадают`), затем пустую строку и транспонированную A.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    return 0;
}
<<<
in: 2 3\n1 2 3\n4 5 6\n3 2\n1 0\n0 1\n1 1
out: 4 5\n10 11\n\n1 4\n2 5\n3 6
in: 1 1\n5\n2 2\n1 1\n1 1
out: размеры не совпадают\n\n5
hint: Произведение определено, если число столбцов A равно числу строк B.
===
#include <iostream>
#include <vector>
#include <stdexcept>
using namespace std;

class Matrix {
public:
    int n, m;
    vector<vector<long long>> a;
    Matrix(int n = 0, int m = 0) : n(n), m(m), a(n, vector<long long>(m)) {}
    Matrix operator*(const Matrix& o) const {
        if (m != o.n) throw invalid_argument("размеры не совпадают");
        Matrix r(n, o.m);
        for (int i = 0; i < n; i++)
            for (int k = 0; k < m; k++)
                for (int j = 0; j < o.m; j++) r.a[i][j] += a[i][k] * o.a[k][j];
        return r;
    }
    Matrix t() const {
        Matrix r(m, n);
        for (int i = 0; i < n; i++)
            for (int j = 0; j < m; j++) r.a[j][i] = a[i][j];
        return r;
    }
};

istream& operator>>(istream& is, Matrix& x) {
    int n, m;
    is >> n >> m;
    x = Matrix(n, m);
    for (auto& r : x.a)
        for (auto& v : r) is >> v;
    return is;
}

ostream& operator<<(ostream& os, const Matrix& x) {
    for (auto& r : x.a)
        for (int j = 0; j < x.m; j++) os << r[j] << (j + 1 < x.m ? " " : "\n");
    return os;
}

int main() {
    Matrix a, b;
    cin >> a >> b;
    try {
        cout << a * b;
    } catch (const invalid_argument& e) {
        cout << e.what() << "\n";
    }
    cout << "\n" << a.t();
    return 0;
}
===
!! {3} Шаг 3. Быстрое возведение матрицы в степень по модулю 10^9+7: выведи n-е число Фибоначчи (F(0) = 0, F(1) = 1), n до 10^18.
<<<
#include <iostream>
#include <vector>
using namespace std;

int main() {
    long long n;
    cin >> n;
    return 0;
}
<<<
in: 10
out: 55
in: 0
out: 0
in: 1000000000000000000
out: 209783453
hint: [[1,1],[1,0]]^n = [[F(n+1), F(n)], [F(n), F(n-1)]] — ответ в элементе (0, 1).
===
#include <iostream>
#include <vector>
using namespace std;

const long long MOD = 1000000007;
using M = vector<vector<long long>>;

M mul(const M& a, const M& b) {
    M r(2, vector<long long>(2, 0));
    for (int i = 0; i < 2; i++)
        for (int k = 0; k < 2; k++)
            for (int j = 0; j < 2; j++) r[i][j] = (r[i][j] + a[i][k] * b[k][j]) % MOD;
    return r;
}

int main() {
    long long n;
    cin >> n;
    M res = {{1, 0}, {0, 1}}, base = {{1, 1}, {1, 0}};
    while (n > 0) {
        if (n & 1) res = mul(res, base);
        base = mul(base, base);
        n >>= 1;
    }
    cout << res[0][1] << "\n";
    return 0;
}
===
card: Как возвести матрицу в степень за O(log n)? :: Как число: пока n > 0 — если n нечётно, res = res·base; base = base²; n >>= 1.
card: Зачем бросать исключение при неверных размерах матриц? :: Ошибка видна сразу и понятно, а не превращается в мусор или выход за границы массива.

## cpp-28 | Проект: LRU-кэш и система событий
Финальный проект: структура данных, которую спрашивают на собеседованиях, — **LRU-кэш** (вытесняет давно не используемый ключ). Все операции — O(1):

```cpp
list<pair<int, int>> items;                          // порядок использования: свежие спереди
unordered_map<int, list<pair<int, int>>::iterator> pos;  // ключ → место в списке

// get: найти, переставить в начало
items.splice(items.begin(), items, pos[key]);
```

`list::splice` перемещает элемент внутри списка за O(1), итераторы остаются валидными.

Вторая часть — **лог событий** с отменой: стек команд и обратных действий.

Хороший проект: маленькие функции, понятные имена, проверка крайних случаев (ёмкость 1, повторный put того же ключа).

?? Почему для LRU берут list, а не vector?
+ перемещение и удаление из середины list — O(1), итераторы не ломаются
- list занимает меньше памяти
- vector не умеет хранить пары
- без разницы
= unordered_map хранит итераторы на элементы list.

?? Что должен делать put для уже существующего ключа?
+ обновить значение и сделать ключ самым свежим
- ничего
- добавить дубликат
- удалить ключ
= Иначе кэш вытеснит актуальное значение.

!! {2} LRU-кэш ёмкости c. Команды до `end`: `put k v`, `get k` (значение или -1). Все операции O(1).
<<<
#include <iostream>
#include <list>
#include <unordered_map>
#include <string>
using namespace std;

int main() {
    int c;
    cin >> c;
    return 0;
}
<<<
in: 2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4\nend
out: 1\n-1\n-1\n3\n4
in: 1\nput 5 50\nput 5 55\nget 5\nput 6 60\nget 5\nend
out: 55\n-1
hint: При put сверх ёмкости удали `items.back()` и его ключ из map.
===
#include <iostream>
#include <list>
#include <unordered_map>
#include <string>
using namespace std;

class LRU {
    int cap;
    list<pair<int, int>> items;
    unordered_map<int, list<pair<int, int>>::iterator> pos;
public:
    LRU(int c) : cap(c) {}
    int get(int k) {
        auto it = pos.find(k);
        if (it == pos.end()) return -1;
        items.splice(items.begin(), items, it->second);
        return it->second->second;
    }
    void put(int k, int v) {
        auto it = pos.find(k);
        if (it != pos.end()) {
            it->second->second = v;
            items.splice(items.begin(), items, it->second);
            return;
        }
        if ((int)items.size() == cap) {
            pos.erase(items.back().first);
            items.pop_back();
        }
        items.push_front({k, v});
        pos[k] = items.begin();
    }
};

int main() {
    int c;
    cin >> c;
    LRU lru(c);
    string cmd;
    while (cin >> cmd && cmd != "end") {
        int k, v;
        if (cmd == "put") { cin >> k >> v; lru.put(k, v); }
        else { cin >> k; cout << lru.get(k) << "\n"; }
    }
    return 0;
}
===
!! {3} Текстовый редактор с отменой: команды до `end`: `type слово` (дописать слово через пробел), `del k` (удалить k последних символов), `undo` (отменить последнюю type/del), `show` (вывести текст в кавычках).
<<<
#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
    return 0;
}
<<<
in: type hello\ntype world\nshow\ndel 3\nshow\nundo\nshow\nundo\nundo\nshow\nundo\nend
out: "hello world"\n"hello wo"\n"hello world"\n""
in: undo\nshow\ntype a\ndel 10\nshow\nundo\nshow\nend
out: ""\n""\n"a"
hint: Стек истории: для type — сколько символов добавлено, для del — какие символы удалены. undo без истории — ничего не делать.
===
#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
    string text, cmd;
    stack<pair<char, string>> hist;  // 't' + добавленное или 'd' + удалённое
    while (cin >> cmd && cmd != "end") {
        if (cmd == "type") {
            string w;
            cin >> w;
            string add = (text.empty() ? "" : " ") + w;
            text += add;
            hist.push({'t', add});
        } else if (cmd == "del") {
            size_t k;
            cin >> k;
            k = min(k, text.size());
            string cut = text.substr(text.size() - k);
            text.erase(text.size() - k);
            hist.push({'d', cut});
        } else if (cmd == "undo") {
            if (hist.empty()) continue;
            auto [kind, s] = hist.top();
            hist.pop();
            if (kind == 't') text.erase(text.size() - s.size());
            else text += s;
        } else if (cmd == "show") {
            cout << "\"" << text << "\"\n";
        }
    }
    return 0;
}
===
!! {3} Таймер событий: команды до `end` — `at t имя` (событие в момент t), `tick t` (наступил момент t: выведи все события с временем ≤ t по возрастанию времени, при равенстве — по порядку добавления, и удали их), `cancel имя` (отменить событие, если ещё не наступило). Используй `priority_queue` и «ленивое» удаление.
<<<
#include <iostream>
#include <queue>
#include <set>
#include <string>
using namespace std;

int main() {
    return 0;
}
<<<
in: at 5 a\nat 3 b\nat 5 c\ntick 4\ncancel c\nat 10 d\ntick 10\ntick 20\nend
out: 3 b\n5 a\n10 d
in: at 1 x\ncancel x\nat 2 x\ntick 5\ntick 6\nend
out: 1 x\n2 x
hint: В куче храни (время, номер добавления, имя); отменённые имена — в set, пропускай их при выдаче.
===
#include <iostream>
#include <queue>
#include <set>
#include <string>
#include <tuple>
#include <vector>
using namespace std;

int main() {
    priority_queue<tuple<long long, int, string>, vector<tuple<long long, int, string>>, greater<>> pq;
    set<string> cancelled;
    string cmd;
    int order = 0;
    while (cin >> cmd && cmd != "end") {
        if (cmd == "at") {
            long long t;
            string name;
            cin >> t >> name;
            cancelled.erase(name);
            pq.push({t, order++, name});
        } else if (cmd == "cancel") {
            string name;
            cin >> name;
            cancelled.insert(name);
        } else if (cmd == "tick") {
            long long t;
            cin >> t;
            while (!pq.empty() && get<0>(pq.top()) <= t) {
                auto [tm, o, name] = pq.top();
                pq.pop();
                if (cancelled.count(name)) {
                    cancelled.erase(name);
                    continue;
                }
                cout << tm << " " << name << "\n";
            }
        }
    }
    return 0;
}
===
card: Как сделать LRU-кэш с операциями за O(1)? :: Двусвязный список (порядок использования) + хеш-таблица «ключ → итератор в списке»; перемещение — list::splice.
card: Что такое «ленивое удаление» из кучи? :: Не удалять элемент сразу, а пометить; при извлечении из кучи пропускать помеченные.
