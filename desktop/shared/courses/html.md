# HTML и CSS

HTML — из чего состоит страница (заголовки, текст, ссылки, формы), CSS — как она выглядит (цвета, отступы, раскладка). Это основа любого сайта и веб-приложения, и результат видно сразу: справа от кода — живой просмотр. 12 уроков: от первой страницы до flexbox, grid и адаптивной вёрстки.

## html-01 | Первая страница: теги и структура
HTML состоит из **тегов**: открывающий `<p>`, закрывающий `</p>`, между ними содержимое. Вместе это **элемент**.

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Моя страница</title>
</head>
<body>
  <h1>Привет!</h1>
  <p>Это мой первый абзац.</p>
</body>
</html>
```

- `<!DOCTYPE html>` — «это современный HTML»
- `<head>` — служебное: кодировка, заголовок вкладки, стили
- `<body>` — то, что видно на странице
- `<h1>`…`<h6>` — заголовки по важности, `<p>` — абзац

Теги вкладываются друг в друга, как матрёшки, и закрываются в обратном порядке: `<p><b>жирный</b></p>`.

Некоторые теги пустые и не закрываются: `<br>` (перенос строки), `<img>`, `<meta>`, `<hr>` (линия).

Комментарий: `<!-- это не видно -->`.

?? Где пишут то, что видно на странице?
- в head
+ в body
- в title
- в meta
= head — служебная часть, body — содержимое страницы.

?? Какой тег — самый важный заголовок?
+ h1
- h6
- head
- title
= Чем меньше цифра, тем важнее заголовок. title — это название вкладки, а не заголовок на странице.

?? Что не так в `<p><b>текст</p></b>`?
+ теги закрыты не в том порядке
- нельзя вкладывать b в p
- нет ошибок
- b не закрывается
= Сначала закрывается тот, что открыли последним: `</b></p>`.

!! Сделай страницу с заголовком вкладки (title), заголовком первого уровня с твоим именем и двумя абзацами о себе.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
</head>
<body>

</body>
</html>
<<<
check: title | Нужен title — название вкладки в head
check: h1 | Нужен заголовок h1
check: p >= 2 | Нужно хотя бы два абзаца p
hint: title пишется внутри head: `<title>Обо мне</title>`.
hint: В body: `<h1>Имя</h1>` и два `<p>…</p>`.
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Обо мне</title>
</head>
<body>
  <h1>Миша</h1>
  <p>Учусь на первом курсе, люблю алгоритмы.</p>
  <p>Люблю музыку и пишу своего ассистента Камадо.</p>
</body>
</html>
===
card: Чем `<title>` отличается от `<h1>`? :: title — название вкладки (в head), h1 — главный заголовок на самой странице (в body).
card: Какие теги не нужно закрывать? :: Пустые: `<br>`, `<img>`, `<meta>`, `<hr>`, `<input>`.

## html-02 | Текст и списки
Оформление текста по смыслу:
- `<strong>` — важное (жирным), `<em>` — акцент (курсивом)
- `<mark>` — выделение маркером, `<code>` — код
- `<blockquote>` — цитата

**Списки**:

```html
<ul>            <!-- маркированный -->
  <li>Хлеб</li>
  <li>Молоко</li>
</ul>

<ol>            <!-- нумерованный -->
  <li>Проснуться</li>
  <li>Сдать лабу</li>
</ol>
```

Внутри `ul`/`ol` — только `li`. Список можно вложить в пункт: `<li>Учёба<ul><li>матан</li></ul></li>`.

Пробелы и переносы строк в HTML схлопываются в один пробел. Новая строка — новый `<p>` или `<br>`.

?? Какой тег делает нумерованный список?
- ul
+ ol
- li
- list
= ol — ordered list, ul — unordered.

?? Чем `<strong>` лучше `<b>`?
+ strong говорит «это важно» — это смысл, а не только вид
- strong жирнее
- b не работает
- ничем
= Экранные дикторы и поисковики понимают смысл strong.

!! Сделай страницу «План на неделю»: заголовок h2, нумерованный список из 3+ дел, в одном пункте выдели важное через strong, и маркированный список «Взять с собой» из 2+ пунктов.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>План</title></head>
<body>

</body>
</html>
<<<
check: h2 | Нужен заголовок h2
check: ol > li >= 3 | В нумерованном списке нужно 3+ пункта
check: ol strong | Выдели важное внутри списка через strong
check: ul > li >= 2 | В маркированном списке нужно 2+ пункта
hint: Нумерованный — `<ol>`, маркированный — `<ul>`, пункты — `<li>`.
hint: Внутри пункта: `<li>Сдать <strong>лабу по C++</strong></li>`.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>План</title></head>
<body>
  <h2>План на неделю</h2>
  <ol>
    <li>Решить ДЗ по матану</li>
    <li>Сдать <strong>лабу по C++</strong> до пятницы</li>
    <li>Повторить карточки</li>
  </ol>
  <h3>Взять с собой</h3>
  <ul>
    <li>Ноутбук</li>
    <li>Зарядку</li>
  </ul>
</body>
</html>
===
card: Чем ul отличается от ol? :: ul — маркированный список (точки), ol — нумерованный. Пункты в обоих — li.
card: Что будет с несколькими пробелами и переносами строк в HTML-тексте? :: Схлопнутся в один пробел.

## html-03 | Ссылки и картинки
**Ссылка** — тег `a` с адресом в атрибуте `href`:

```html
<a href="https://ru.wikipedia.org">Википедия</a>
<a href="https://github.com" target="_blank" rel="noopener">в новой вкладке</a>
<a href="#contacts">к разделу на этой же странице</a>
<a href="mailto:me@mail.ru">написать письмо</a>
```

**Атрибуты** пишут внутри открывающего тега: `имя="значение"`.

**Картинка**:

```html
<img src="cat.jpg" alt="Рыжий кот спит на клавиатуре" width="300">
```

- `src` — откуда взять (файл рядом или полный адрес)
- `alt` — описание: показывается, если картинка не загрузилась, и его читает экранный диктор. Пишите всегда!

Картинка-ссылка: `<a href="..."><img src="..." alt="..."></a>`.

`id` — уникальное имя элемента, на него ведёт `href="#id"`.

?? Что делает атрибут alt у картинки?
+ текстовое описание картинки
- задаёт размер
- открывает картинку в новой вкладке
- ничего важного
= Его видят, если картинка не загрузилась, и слышат незрячие пользователи.

?? Как сделать, чтобы ссылка открылась в новой вкладке?
+ target="_blank"
- href="_blank"
- new="true"
- rel="tab"
= rel="noopener" добавляют для безопасности.

!! Сделай карточку любимого сайта: заголовок, картинка с alt, абзац описания и две ссылки — одна на внешний сайт в новой вкладке, другая — к заголовку на этой же странице (через id).
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Ссылки</title></head>
<body>

</body>
</html>
<<<
check: img[alt] | У картинки должен быть alt
check: a[target="_blank"] | Нужна ссылка с target="_blank"
check: a[href^="#"] | Нужна ссылка на элемент страницы: href="#…"
check: [id] | Дай какому-нибудь элементу id, чтобы на него вела ссылка
hint: Картинка из интернета: `<img src="https://picsum.photos/300" alt="Случайное фото">`.
hint: `<h2 id="top">…</h2>` и ниже `<a href="#top">наверх</a>`.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Ссылки</title></head>
<body>
  <h2 id="top">Мой любимый сайт</h2>
  <img src="https://picsum.photos/300/200" alt="Случайная красивая фотография" width="300">
  <p>Wikipedia — свободная энциклопедия, где есть почти всё.</p>
  <a href="https://ru.wikipedia.org" target="_blank" rel="noopener">Открыть Википедию</a>
  <a href="#top">Наверх</a>
</body>
</html>
===
card: Как сделать ссылку на место на этой же странице? :: Дать элементу `id="contacts"` и сослаться `href="#contacts"`.
card: Зачем картинке атрибут alt? :: Описание для незрячих и на случай, если картинка не загрузилась.

## html-04 | Таблицы
Таблица строится по строкам:

```html
<table>
  <thead>
    <tr><th>Предмет</th><th>Оценка</th></tr>
  </thead>
  <tbody>
    <tr><td>Матан</td><td>5</td></tr>
    <tr><td>Физика</td><td>4</td></tr>
  </tbody>
</table>
```

- `tr` — строка (table row)
- `th` — ячейка-заголовок, `td` — обычная ячейка
- `thead` / `tbody` / `tfoot` — шапка, тело, итог
- `colspan="2"` — ячейка на 2 столбца, `rowspan="2"` — на 2 строки
- `<caption>` — подпись таблицы

Таблицы — для **данных** (расписание, оценки), а не для раскладки страницы: для раскладки есть flex и grid.

?? Какой тег — строка таблицы?
+ tr
- td
- th
- row
= tr — table row; внутри строки — ячейки td/th.

?? Как сделать ячейку шириной в три столбца?
+ colspan="3"
- rowspan="3"
- width="3"
- span="3"
= rowspan объединяет по вертикали.

!! Сделай таблицу расписания: caption, шапка с 3 столбцами (День, Время, Предмет) и минимум 3 строки занятий. Последняя строка — одна ячейка «Выходные» на всю ширину.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Расписание</title></head>
<body>

</body>
</html>
<<<
check: table caption | Добавь подпись caption
check: thead th >= 3 | В шапке нужно 3 заголовка th
check: tbody tr >= 3 | Нужно хотя бы 3 строки в tbody
check: td[colspan="3"] | Сделай ячейку на всю ширину: colspan="3"
hint: Шапка: `<thead><tr><th>День</th><th>Время</th><th>Предмет</th></tr></thead>`.
hint: Последняя строка: `<tr><td colspan="3">Выходные</td></tr>`.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Расписание</title></head>
<body>
  <table border="1">
    <caption>Расписание на неделю</caption>
    <thead>
      <tr><th>День</th><th>Время</th><th>Предмет</th></tr>
    </thead>
    <tbody>
      <tr><td>Пн</td><td>10:00</td><td>Матанализ</td></tr>
      <tr><td>Вт</td><td>11:40</td><td>Алгоритмы</td></tr>
      <tr><td>Ср</td><td>13:30</td><td>Программирование</td></tr>
      <tr><td colspan="3">Выходные</td></tr>
    </tbody>
  </table>
</body>
</html>
===
card: Чем th отличается от td? :: th — ячейка-заголовок (жирная, по центру), td — обычная ячейка данных.
card: Для чего НЕ нужно использовать таблицы? :: Для раскладки страницы — для этого flex и grid.

## html-05 | Формы
Форма собирает данные от пользователя:

```html
<form action="/send" method="post">
  <label for="email">Почта</label>
  <input id="email" name="email" type="email" required placeholder="me@mail.ru">

  <label><input type="checkbox" name="news"> Получать новости</label>

  <select name="course">
    <option>1 курс</option>
    <option>2 курс</option>
  </select>

  <textarea name="msg" rows="4"></textarea>
  <button type="submit">Отправить</button>
</form>
```

Типы input: `text`, `email`, `password`, `number`, `date`, `checkbox`, `radio`, `range`, `file`, `color`.

- `name` — под каким именем поле уйдёт на сервер
- `label for="id"` связывает подпись с полем: клик по подписи ставит курсор в поле
- `required`, `min`, `max`, `minlength`, `pattern` — встроенная проверка без JavaScript
- радиокнопки с одним `name` — выбор одного варианта из группы

?? Зачем label с атрибутом for?
+ связать подпись с полем: клик по тексту фокусирует поле
- чтобы поле стало обязательным
- для отправки формы
- для красоты
= for должен совпадать с id поля.

?? Как сделать, чтобы из трёх радиокнопок выбиралась только одна?
+ дать им одинаковый name
- дать им одинаковый id
- обернуть в ul
- type="single"
= Радиокнопки с одним name образуют группу.

!! Сделай форму регистрации: поле имени (обязательное), email, пароль минимум 8 символов, выбор курса (select с 4 вариантами), две радиокнопки «очно/заочно» и кнопка отправки. У полей — подписи label.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Регистрация</title></head>
<body>
  <form>

  </form>
</body>
</html>
<<<
check: input[required] | Сделай имя обязательным: required
check: input[type="email"] | Нужно поле type="email"
check: input[type="password"][minlength="8"] | Пароль: type="password" и minlength="8"
check: select option >= 4 | В select нужно 4 варианта
check: input[type="radio"] >= 2 | Нужны две радиокнопки
check: label >= 3 | Подпиши поля через label
check: button, input[type="submit"] | Нужна кнопка отправки
hint: Пароль: `<input type="password" name="pass" minlength="8">`.
hint: Радиокнопки: `<label><input type="radio" name="form" value="full"> Очно</label>` — одинаковый name.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Регистрация</title></head>
<body>
  <form>
    <label for="name">Имя</label>
    <input id="name" name="name" required>
    <label for="email">Почта</label>
    <input id="email" name="email" type="email">
    <label for="pass">Пароль</label>
    <input id="pass" name="pass" type="password" minlength="8">
    <label for="course">Курс</label>
    <select id="course" name="course">
      <option>1</option>
      <option>2</option>
      <option>3</option>
      <option>4</option>
    </select>
    <label><input type="radio" name="mode" value="full" checked> Очно</label>
    <label><input type="radio" name="mode" value="part"> Заочно</label>
    <button type="submit">Зарегистрироваться</button>
  </form>
</body>
</html>
===
card: Для чего у поля атрибут name? :: Под этим именем значение поля уходит на сервер при отправке формы.
card: Как проверить email и обязательность без JavaScript? :: `type="email"` и `required` — браузер проверит сам.

## html-06 | Семантическая разметка
Вместо безликих `div` используй теги, которые говорят, **что** это за часть страницы:

```html
<header>логотип и меню</header>
<nav>
  <a href="#">Главная</a> <a href="#">Курсы</a>
</nav>
<main>
  <article>
    <h2>Новость</h2>
    <p>…</p>
  </article>
  <section>
    <h2>Раздел</h2>
  </section>
  <aside>боковая колонка</aside>
</main>
<footer>© 2026</footer>
```

- `header` / `footer` — шапка и подвал (страницы или статьи)
- `nav` — навигация
- `main` — главное содержимое (один на странице)
- `article` — самостоятельный материал (пост, новость, карточка товара)
- `section` — смысловой раздел с заголовком
- `aside` — дополнительное (сайдбар)

Зачем: поисковики лучше понимают страницу, экранные дикторы позволяют прыгать по разделам, а код читается легче. `div` и `span` — когда никакой смысловой тег не подходит.

?? Сколько тегов main может быть на странице?
+ один
- сколько угодно
- два: для текста и картинок
- ни одного, он устарел
= main — главное содержимое страницы.

?? Какой тег для блока с меню сайта?
+ nav
- menu-block
- aside
- header обязательно
= nav — навигация. Её часто кладут внутрь header.

!! Сверстай каркас блога семантическими тегами: header с названием и nav (3+ ссылки), main с двумя article (у каждой h2 и p), aside и footer.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Блог</title></head>
<body>

</body>
</html>
<<<
check: header | Нужен header
check: nav a >= 3 | В nav нужно 3+ ссылки
check: main article >= 2 | В main нужно две статьи article
check: article h2 >= 2 | У каждой статьи — заголовок h2
check: aside | Нужен aside
check: footer | Нужен footer
hint: Структура: header (h1 + nav) → main (article, article, aside) → footer.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Блог</title></head>
<body>
  <header>
    <h1>Блог студента</h1>
    <nav>
      <a href="#">Главная</a>
      <a href="#">Учёба</a>
      <a href="#">Обо мне</a>
    </nav>
  </header>
  <main>
    <article>
      <h2>Как я сдал матан</h2>
      <p>Каждый день по 30 минут и карточки.</p>
    </article>
    <article>
      <h2>Мой первый сайт</h2>
      <p>Сверстал за вечер на HTML и CSS.</p>
    </article>
    <aside>Популярные посты</aside>
  </main>
  <footer>© 2026</footer>
</body>
</html>
===
card: Зачем семантические теги вместо div? :: Поисковики и экранные дикторы понимают структуру, код читается легче.
card: Чем article отличается от section? :: article — самостоятельный материал (пост, карточка), section — смысловой раздел внутри чего-то.

## html-07 | CSS: селекторы, цвета, шрифты
CSS задаёт внешний вид. Подключают в `<head>` через `<style>` или файлом `<link rel="stylesheet" href="style.css">`.

```html
<style>
  body {
    font-family: system-ui, sans-serif;
    color: #222;
    background: #f6f6f8;
  }
  h1 { color: tomato; font-size: 40px; }
  .note { background: #fff3c4; }       /* класс */
  #main-title { letter-spacing: 2px; } /* id */
  nav a { text-decoration: none; }     /* a внутри nav */
  a:hover { color: purple; }           /* при наведении */
</style>
```

Правило: **селектор { свойство: значение; }**.

Селекторы:
- `p` — все абзацы, `.card` — с классом card, `#logo` — с id logo
- `nav a` — потомок, `ul > li` — прямой потомок
- `h1, h2` — несколько сразу
- `:hover`, `:first-child`, `:nth-child(2n)` — состояния и позиции

Цвета: `red`, `#ff6347`, `rgb(255 99 71)`, `hsl(9 100% 64%)`. Шрифт: `font-family`, `font-size`, `font-weight: 700`, `line-height: 1.5`.

Если правила спорят, побеждает более **конкретный** селектор (id > класс > тег), а при равенстве — последний.

?? Какой селектор выберет элементы с class="card"?
- #card
+ .card
- card
- *card
= Точка — класс, решётка — id.

?? Какое правило победит для `<p class="x">`: `p { color: red }` или `.x { color: blue }`?
+ .x — синий
- p — красный
- последнее в файле
- никакое
= Класс конкретнее тега.

!! Оформи визитку: подключи стили через style. Фон страницы — светлый, у карточки класс `card`: белый фон, свой цвет заголовка, шрифт system-ui. Ссылки внутри карточки без подчёркивания и меняют цвет при наведении.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Визитка</title>
  <style>

  </style>
</head>
<body>
  <div class="card">
    <h1>Миша</h1>
    <p>Студент, 1 курс</p>
    <a href="#">GitHub</a>
  </div>
</body>
</html>
<<<
check: css:\.card\s*\{[^}]*background | Задай фон карточке .card
check: css:font-family | Задай шрифт через font-family
check: css:text-decoration\s*:\s*none | Убери подчёркивание ссылок: text-decoration: none
check: css::hover | Добавь изменение при наведении: :hover
hint: `.card { background: white; padding: 24px; }`
hint: `.card a { text-decoration: none; } .card a:hover { color: tomato; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Визитка</title>
  <style>
    body { background: #eef0f5; font-family: system-ui, sans-serif; }
    .card { background: white; padding: 24px; max-width: 320px; }
    .card h1 { color: #5b4cff; margin: 0 0 8px; }
    .card a { text-decoration: none; color: #333; }
    .card a:hover { color: #5b4cff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Миша</h1>
    <p>Студент, 1 курс</p>
    <a href="#">GitHub</a>
  </div>
</body>
</html>
===
card: Как в CSS выбрать элемент по классу и по id? :: Класс — `.имя`, id — `#имя`.
card: Какое CSS-правило побеждает при конфликте? :: Более конкретное (id > класс > тег), при равной конкретности — последнее.

## html-08 | Блочная модель: отступы, рамки, размеры
Каждый элемент — прямоугольник из слоёв: **content → padding → border → margin**.

```css
.box {
  width: 300px;
  padding: 16px;          /* внутренний отступ */
  border: 2px solid #333; /* рамка */
  margin: 24px auto;      /* внешний отступ; auto по бокам — по центру */
  border-radius: 12px;    /* скругление */
}
```

По умолчанию `width` — ширина только содержимого, и padding с border её увеличивают. Почти всегда включают удобный режим:

```css
* { box-sizing: border-box; }   /* width включает padding и border */
```

Сокращения: `padding: 10px 20px` — сверху/снизу 10, слева/справа 20. Четыре значения идут по часовой: верх, право, низ, лево.

Блочные элементы (`div`, `p`, `h1`) занимают всю ширину и начинаются с новой строки; строчные (`span`, `a`, `strong`) идут в тексте. `display: inline-block` — строчный, но с размерами.

Единицы: `px`, `%`, `em`/`rem` (от размера шрифта), `vw`/`vh` (доля окна).

?? Чему равна видимая ширина без box-sizing: width 200px, padding 10px, border 1px?
- 200px
+ 222px
- 210px
- 211px
= 200 + 10·2 + 1·2 = 222. С border-box было бы ровно 200.

?? Как отцентрировать блок с заданной шириной по горизонтали?
+ margin: 0 auto
- text-align: center на блоке
- padding: auto
- center: true
= Автоматические внешние отступы слева и справа делятся поровну.

!! Сделай три карточки-«кнопки» класса `box`: у всех box-sizing: border-box, внутренний отступ, рамка, скругление углов; карточки отстоят друг от друга (margin). Контейнер с классом `wrap` шириной не больше 600px по центру страницы.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Блоки</title>
  <style>

  </style>
</head>
<body>
  <div class="wrap">
    <div class="box">Матан</div>
    <div class="box">Алгоритмы</div>
    <div class="box">Физика</div>
  </div>
</body>
</html>
<<<
check: css:box-sizing\s*:\s*border-box | Включи box-sizing: border-box
check: css:padding | Добавь внутренний отступ padding
check: css:border\s*: | Добавь рамку border
check: css:border-radius | Скругли углы: border-radius
check: css:max-width\s*:\s*600px | Ограничь контейнер: max-width: 600px
check: css:margin\s*:[^;]*auto | Отцентрируй контейнер: margin: 0 auto
hint: `* { box-sizing: border-box; }` — для всех элементов.
hint: `.wrap { max-width: 600px; margin: 0 auto; } .box { padding: 16px; border: 2px solid #ccc; border-radius: 12px; margin: 12px 0; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Блоки</title>
  <style>
    * { box-sizing: border-box; }
    .wrap { max-width: 600px; margin: 0 auto; }
    .box { padding: 16px; border: 2px solid #c9cbe0; border-radius: 12px; margin: 12px 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="box">Матан</div>
    <div class="box">Алгоритмы</div>
    <div class="box">Физика</div>
  </div>
</body>
</html>
===
card: Порядок слоёв блочной модели изнутри наружу? :: content → padding → border → margin.
card: Что делает `box-sizing: border-box`? :: width и height включают padding и border — размеры считать проще.

## html-09 | Flexbox
Flex раскладывает элементы **в строку или столбец** и легко выравнивает:

```css
.row {
  display: flex;
  gap: 16px;                  /* расстояние между элементами */
  justify-content: space-between; /* по главной оси */
  align-items: center;        /* по поперечной */
  flex-wrap: wrap;            /* переносить на новую строку */
}
.row > .item { flex: 1; }     /* растянуть поровну */
```

- `flex-direction: row` (по умолчанию) или `column`
- `justify-content`: `flex-start`, `center`, `space-between`, `space-around`
- `align-items`: `stretch`, `center`, `flex-start`
- `flex: 1` — занять свободное место; `flex: 0 0 200px` — ровно 200px

Классика — идеальное центрирование:

```css
.center { display: flex; justify-content: center; align-items: center; height: 100vh; }
```

?? Какое свойство задаёт расстояние между flex-элементами?
+ gap
- margin-between
- space
- padding
= gap работает и во flex, и в grid.

?? Как поставить элементы flex в столбец?
+ flex-direction: column
- display: column
- align-items: column
- flex-wrap: column
= По умолчанию flex-direction: row.

!! Сверстай шапку сайта: header с классом `top` — flex, логотип слева, меню (nav с 3 ссылками, тоже flex с gap) справа, всё выровнено по вертикали по центру.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Шапка</title>
  <style>

  </style>
</head>
<body>
  <header class="top">
    <div class="logo">Камадо</div>
    <nav>
      <a href="#">Курсы</a>
      <a href="#">План</a>
      <a href="#">Профиль</a>
    </nav>
  </header>
</body>
</html>
<<<
check: css:display\s*:\s*flex | Включи display: flex
check: css:justify-content\s*:\s*space-between | Разнеси логотип и меню: justify-content: space-between
check: css:align-items\s*:\s*center | Выровняй по вертикали: align-items: center
check: css:gap | Расстояние между ссылками — gap
hint: `.top { display: flex; justify-content: space-between; align-items: center; }`
hint: `nav { display: flex; gap: 20px; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Шапка</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    .top { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #1e1b2e; color: white; }
    .logo { font-weight: 800; font-size: 22px; }
    nav { display: flex; gap: 20px; }
    nav a { color: #cfc8ff; text-decoration: none; }
  </style>
</head>
<body>
  <header class="top">
    <div class="logo">Камадо</div>
    <nav>
      <a href="#">Курсы</a>
      <a href="#">План</a>
      <a href="#">Профиль</a>
    </nav>
  </header>
</body>
</html>
===
card: Как идеально отцентрировать элемент flex-ом? :: `display: flex; justify-content: center; align-items: center;`
card: Чем justify-content отличается от align-items? :: justify-content — по главной оси (в строке — по горизонтали), align-items — по поперечной.

## html-10 | Grid
Grid — сетка из строк и столбцов, идеальна для раскладки целых страниц и галерей:

```css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr;     /* фиксированный + остальное */
  gap: 16px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* три равных столбца */
}
.auto {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); /* сколько влезет */
}
```

`fr` — доля свободного места. Элемент может занять несколько клеток:

```css
.wide { grid-column: span 2; }
.hero { grid-column: 1 / -1; }   /* от первой до последней линии */
```

Именованные области:

```css
.page {
  display: grid;
  grid-template-areas: "head head" "side main" "foot foot";
  grid-template-columns: 220px 1fr;
}
header { grid-area: head; }
```

Flex — для одного ряда, grid — для двумерной сетки.

?? Что значит `grid-template-columns: 1fr 2fr`?
+ два столбца, второй вдвое шире
- два столбца по 1 и 2 пикселя
- две строки
- один столбец
= fr делит свободное место в пропорции.

?? Как сделать столько столбцов, сколько влезет, но не уже 200px?
+ repeat(auto-fill, minmax(200px, 1fr))
- repeat(200px)
- columns: auto 200px
- flex: 200px
= Сетка сама подстраивается под ширину окна.

!! Сверстай галерею: контейнер `.gallery` — grid с автоподбором столбцов (minmax), gap; 6 карточек `.tile`, первая занимает 2 столбца.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Галерея</title>
  <style>

  </style>
</head>
<body>
  <div class="gallery">
    <div class="tile">1</div>
    <div class="tile">2</div>
    <div class="tile">3</div>
    <div class="tile">4</div>
    <div class="tile">5</div>
    <div class="tile">6</div>
  </div>
</body>
</html>
<<<
check: css:display\s*:\s*grid | Включи display: grid
check: css:grid-template-columns\s*:[^;]*minmax | Столбцы с автоподбором: repeat(auto-fill, minmax(…))
check: css:gap | Добавь gap
check: css:grid-column\s*:\s*span\s*2 | Первая карточка: grid-column: span 2
check: .tile >= 6 | Оставь 6 карточек
hint: `.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }`
hint: `.tile:first-child { grid-column: span 2; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Галерея</title>
  <style>
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; padding: 12px; }
    .tile { background: #e4e0ff; border-radius: 12px; height: 120px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
    .tile:first-child { grid-column: span 2; background: #c8bfff; }
  </style>
</head>
<body>
  <div class="gallery">
    <div class="tile">1</div>
    <div class="tile">2</div>
    <div class="tile">3</div>
    <div class="tile">4</div>
    <div class="tile">5</div>
    <div class="tile">6</div>
  </div>
</body>
</html>
===
card: Что такое fr в grid? :: Доля свободного места: `1fr 2fr` — второй столбец вдвое шире.
card: Когда flex, а когда grid? :: Flex — раскладка в один ряд/столбец. Grid — двумерная сетка (строки и столбцы).

## html-11 | Адаптивная вёрстка
Сайт должен хорошо выглядеть и на телефоне, и на мониторе.

Первое — в head:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Без него телефон покажет страницу как уменьшенный компьютерный сайт.

**Медиазапросы** — правила для определённой ширины экрана:

```css
.cols { display: grid; grid-template-columns: 1fr 1fr 1fr; }

@media (max-width: 700px) {
  .cols { grid-template-columns: 1fr; }   /* на телефоне — в столбик */
}
```

Подход **mobile first**: сначала стили для телефона, потом `@media (min-width: …)` добавляет для больших экранов.

Гибкие размеры: `max-width: 100%` у картинок, `%`, `vw`, `clamp(16px, 2vw, 22px)` для шрифта.

`@media (prefers-color-scheme: dark)` — тёмная тема по настройке системы.

?? Зачем meta viewport?
+ чтобы телефон показывал страницу в реальную ширину экрана
- для SEO
- чтобы сайт работал без интернета
- для шрифтов
= Без неё мобильный браузер «эмулирует» широкий экран и всё мелкое.

?? Что делает `@media (max-width: 600px) { … }`?
+ применяет правила только на экранах уже 600px
- ограничивает страницу 600px
- скрывает страницу на телефонах
- применяет правила на экранах шире 600px
= max-width — «до такой ширины включительно».

!! Сделай адаптивную страницу: meta viewport, три колонки `.col` в контейнере `.cols` (grid или flex), а на экранах до 700px колонки встают в столбик. Картинки не вылезают за экран (max-width: 100%).
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Адаптив</title>
  <style>

  </style>
</head>
<body>
  <div class="cols">
    <div class="col">Python</div>
    <div class="col">Java</div>
    <div class="col">C++</div>
  </div>
</body>
</html>
<<<
check: meta[name="viewport"] | Добавь meta viewport в head
check: css:@media[^{]*max-width\s*:\s*700px | Добавь медиазапрос @media (max-width: 700px)
check: css:max-width\s*:\s*100% | Картинкам: max-width: 100%
check: .col >= 3 | Оставь три колонки
hint: `<meta name="viewport" content="width=device-width, initial-scale=1">`
hint: `.cols { display: grid; grid-template-columns: repeat(3, 1fr); } @media (max-width: 700px) { .cols { grid-template-columns: 1fr; } } img { max-width: 100%; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Адаптив</title>
  <style>
    img { max-width: 100%; }
    .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .col { background: #eee; padding: 20px; border-radius: 10px; }
    @media (max-width: 700px) {
      .cols { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="cols">
    <div class="col">Python</div>
    <div class="col">Java</div>
    <div class="col">C++</div>
  </div>
</body>
</html>
===
card: Какая строка обязательна для адаптивного сайта? :: `<meta name="viewport" content="width=device-width, initial-scale=1">`
card: Что такое mobile first? :: Сначала стили для телефона, затем `@media (min-width: …)` для больших экранов.

## html-12 | Переменные CSS, переходы и анимации
**Переменные** задают один раз и используют везде — так делают темы:

```css
:root {
  --accent: #6c5ce7;
  --radius: 12px;
}
.btn {
  background: var(--accent);
  border-radius: var(--radius);
}
```

**Переходы** плавно меняют свойство:

```css
.btn {
  transition: transform 0.2s ease, background 0.2s;
}
.btn:hover {
  transform: translateY(-2px) scale(1.03);
}
```

**Анимации** по ключевым кадрам:

```css
@keyframes pulse {
  from { transform: scale(1); }
  to   { transform: scale(1.1); }
}
.dot { animation: pulse 1s ease-in-out infinite alternate; }
```

Плавнее всего анимируются `transform` и `opacity` — браузер не пересчитывает раскладку. Анимировать `width`, `top`, `margin` — дорого.

Уважай настройки пользователя: `@media (prefers-reduced-motion: reduce) { * { animation: none; } }`.

?? Как использовать переменную --accent?
+ var(--accent)
- $accent
- --accent()
- @accent
= Переменные объявляют с двумя дефисами, читают через var().

?? Какие свойства лучше всего анимировать?
+ transform и opacity
- width и height
- margin и padding
- top и left
= Они не заставляют браузер пересчитывать раскладку страницы.

!! Сделай кнопку `.btn`: цвета через CSS-переменные в :root, плавный переход (transition) при наведении с transform, и точку `.dot` с бесконечной анимацией через @keyframes.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Анимации</title>
  <style>

  </style>
</head>
<body>
  <button class="btn">Начать урок</button>
  <span class="dot"></span>
</body>
</html>
<<<
check: css::root\s*\{[^}]*--[\w-]+\s*: | Объяви переменную в :root
check: css:var\(--[\w-]+\) | Используй переменную через var(--…)
check: css:transition | Добавь transition
check: css::hover[^{]*\{[^}]*transform | При наведении меняй transform
check: css:@keyframes | Опиши анимацию через @keyframes
check: css:animation\s*: | Подключи анимацию к .dot: animation: …
hint: `:root { --accent: #6c5ce7; } .btn { background: var(--accent); transition: transform 0.2s; } .btn:hover { transform: scale(1.05); }`
hint: `@keyframes pulse { to { transform: scale(1.4); } } .dot { animation: pulse 1s infinite alternate; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Анимации</title>
  <style>
    :root { --accent: #6c5ce7; --radius: 12px; }
    .btn { background: var(--accent); color: white; border: 0; padding: 12px 20px; border-radius: var(--radius); transition: transform 0.2s ease; }
    .btn:hover { transform: translateY(-2px) scale(1.05); }
    .dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); animation: pulse 1s ease-in-out infinite alternate; }
    @keyframes pulse { from { transform: scale(1); } to { transform: scale(1.4); } }
  </style>
</head>
<body>
  <button class="btn">Начать урок</button>
  <span class="dot"></span>
</body>
</html>
===
card: Как объявить и использовать CSS-переменную? :: `:root { --accent: #6c5ce7; }` и `color: var(--accent);`
card: Чем transition отличается от animation? :: transition — плавный переход при смене состояния (например, :hover). animation — анимация по @keyframes, может идти сама и бесконечно.
