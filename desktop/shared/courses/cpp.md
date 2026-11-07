# C++

C++ — быстрый язык «близко к железу»: игры, браузеры, движки, олимпиадное программирование и почти все курсы алгоритмов в вузах. Ты сам управляешь памятью и типами, зато программа летает. 13 уроков: от cout до указателей, STL, динамического программирования и графов.

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
card: Сколько простых операций C++ успевает примерно за секунду? :: Порядка 10⁸.
card: Почему делители ищут только до √n? :: Делители идут парами d и n/d, и один из пары всегда ≤ √n.

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
card: Как передать переменную в функцию, чтобы функция могла её изменить? :: По ссылке: `void f(int& x)`.
card: Почему в `for (int& x : v)` стоит &? :: Без & x — копия элемента, изменения не попадут в вектор.

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
card: Что такое список инициализации в конструкторе? :: `Account(string o) : owner(o) {}` — поля заполняются до тела конструктора.
card: Как научить sort сортировать свои структуры? :: Определить `bool operator<(const T& o) const` или передать лямбду-компаратор.

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
card: Как отсортировать vector по убыванию лямбдой? :: `sort(v.begin(), v.end(), [](int a, int b) { return a > b; });`
card: Что делает `accumulate(v.begin(), v.end(), 0LL)`? :: Сумма элементов в long long (0LL задаёт тип результата).

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
card: Из каких частей состоит решение ДП? :: Что храним (состояние), база, переход, порядок вычисления, где ответ.
card: Переход в задаче о НОП? :: Символы равны → dp[i-1][j-1] + 1, иначе max(dp[i-1][j], dp[i][j-1]).

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
card: Как хранят граф для BFS/DFS/Дейкстры? :: Список смежности: `vector<vector<int>> g(n + 1)` (или пары {сосед, вес}).
card: Сложность алгоритма Дейкстры с кучей? :: O((n + m) log n).
