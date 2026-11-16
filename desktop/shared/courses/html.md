# HTML и CSS

HTML — из чего состоит страница (заголовки, текст, ссылки, формы), CSS — как она выглядит (цвета, отступы, раскладка). Это основа любого сайта и веб-приложения, и результат видно сразу: справа от кода — живой просмотр. 18 уроков в 4 модулях: разметка, медиа и доступность; CSS (селекторы, блочная модель, позиционирование, псевдоклассы); раскладка (flex, grid, адаптив, анимации) и два проекта — лендинг и резюме-портфолио.

### Модуль: Основы HTML

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
!! {2} Сделай страницу «Рецепт»: заголовок h1 с названием блюда, h2 «Ингредиенты» и h2 «Приготовление», под каждым — абзац, горизонтальная линия `hr` между разделами и комментарий в коде.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Рецепт</title></head>
<body>

</body>
</html>
<<<
check: h1 | Нужен заголовок h1 с названием блюда
check: h2 >= 2 | Нужно два подзаголовка h2
check: hr | Раздели разделы линией hr
check: p >= 2 | Под каждым разделом — абзац p
hint: `<hr>` — пустой тег, его не закрывают. Комментарий: `<!-- текст -->`.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Рецепт</title></head>
<body>
  <!-- рецепт сырников -->
  <h1>Сырники</h1>
  <h2>Ингредиенты</h2>
  <p>Творог, яйцо, мука, сахар.</p>
  <hr>
  <h2>Приготовление</h2>
  <p>Смешать, сформировать, обжарить с двух сторон.</p>
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
!! {2} Список покупок с вложенным списком: маркированный список отделов (3+), в двух из них — вложенные списки товаров. Самый нужный товар выдели `mark`.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Покупки</title></head>
<body>

</body>
</html>
<<<
check: ul > li >= 3 | Нужно 3 отдела в списке
check: li ul >= 2 | В двух отделах — вложенные списки
check: mark | Выдели товар тегом mark
hint: Вложенный список кладут внутрь пункта: `<li>Молочка<ul><li>Кефир</li></ul></li>`.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Покупки</title></head>
<body>
  <ul>
    <li>Молочка
      <ul><li>Кефир</li><li><mark>Творог</mark></li></ul>
    </li>
    <li>Овощи
      <ul><li>Огурцы</li><li>Помидоры</li></ul>
    </li>
    <li>Хлеб</li>
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
!! {2} Навигационное меню: список из 4 ссылок, одна ведёт на почту (`mailto:`), одна — на телефон (`tel:`), и картинка-ссылка (img внутри a) с alt.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Контакты</title></head>
<body>

</body>
</html>
<<<
check: li a >= 4 | Нужно 4 ссылки в пунктах списка
check: a[href^="mailto:"] | Ссылка на почту: href="mailto:…"
check: a[href^="tel:"] | Ссылка на телефон: href="tel:…"
check: a img[alt] | Картинка-ссылка: img с alt внутри a
hint: Телефон: `<a href="tel:+79990000000">Позвонить</a>`.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Контакты</title></head>
<body>
  <ul>
    <li><a href="#about">Обо мне</a></li>
    <li><a href="mailto:me@example.com">Написать</a></li>
    <li><a href="tel:+79990000000">Позвонить</a></li>
    <li><a href="https://github.com" target="_blank" rel="noopener">GitHub</a></li>
  </ul>
  <a href="https://github.com"><img src="https://picsum.photos/80" alt="Аватар"></a>
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
!! {3} Таблица успеваемости с объединением: заголовок «Предмет» на 2 строки (rowspan), «Оценки» на 2 столбца (colspan) с подзаголовками «Модуль 1» и «Модуль 2», и 3 строки предметов. Внизу — tfoot со строкой «Итого».
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Оценки</title></head>
<body>

</body>
</html>
<<<
check: th[rowspan="2"] | «Предмет» — на две строки: rowspan="2"
check: th[colspan="2"] | «Оценки» — на два столбца: colspan="2"
check: tbody tr >= 3 | Нужно 3 строки предметов
check: tfoot | Добавь итоговую строку в tfoot
hint: В thead две строки: первая — Предмет (rowspan) и Оценки (colspan), вторая — Модуль 1 и Модуль 2.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Оценки</title></head>
<body>
  <table border="1">
    <thead>
      <tr><th rowspan="2">Предмет</th><th colspan="2">Оценки</th></tr>
      <tr><th>Модуль 1</th><th>Модуль 2</th></tr>
    </thead>
    <tbody>
      <tr><td>Матанализ</td><td>4</td><td>5</td></tr>
      <tr><td>Алгоритмы</td><td>5</td><td>5</td></tr>
      <tr><td>Физика</td><td>3</td><td>4</td></tr>
    </tbody>
    <tfoot>
      <tr><td>Итого</td><td>4</td><td>4.7</td></tr>
    </tfoot>
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
!! {2} Форма поиска: поле `type="search"` с placeholder, выбор даты (`type="date"`), чекбокс «только бесплатные», ползунок `type="range"` от 0 до 100 и кнопка. Поле поиска — обязательное.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Поиск</title></head>
<body>
  <form>

  </form>
</body>
</html>
<<<
check: input[type="search"][required][placeholder] | Поиск: type="search", required и placeholder
check: input[type="date"] | Нужен выбор даты
check: input[type="checkbox"] | Нужен чекбокс
check: input[type="range"][min="0"][max="100"] | Ползунок: type="range" min="0" max="100"
check: button | Нужна кнопка
hint: `<input type="range" min="0" max="100" value="50">`
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Поиск</title></head>
<body>
  <form>
    <input type="search" name="q" placeholder="Что ищем?" required>
    <input type="date" name="from">
    <label><input type="checkbox" name="free"> только бесплатные</label>
    <input type="range" name="price" min="0" max="100" value="50">
    <button>Найти</button>
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
!! {2} Страница статьи: article с header (h1 и `time` с атрибутом datetime), двумя section с h2, цитатой blockquote и footer статьи с автором.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Статья</title></head>
<body>

</body>
</html>
<<<
check: article header h1 | В шапке статьи — h1
check: time[datetime] | Дата публикации: time с datetime
check: article section h2 >= 2 | Две секции с заголовками h2
check: blockquote | Добавь цитату blockquote
check: article footer | У статьи — свой footer
hint: `<time datetime="2026-11-07">7 ноября</time>`
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Статья</title></head>
<body>
  <article>
    <header>
      <h1>Как я выучил Python</h1>
      <time datetime="2026-11-07">7 ноября 2026</time>
    </header>
    <section>
      <h2>С чего начал</h2>
      <p>Каждый день по уроку.</p>
      <blockquote>Повторение — мать учения.</blockquote>
    </section>
    <section>
      <h2>Что помогло</h2>
      <p>Задачи и карточки.</p>
    </section>
    <footer>Автор: Миша</footer>
  </article>
</body>
</html>
===
card: Зачем семантические теги вместо div? :: Поисковики и экранные дикторы понимают структуру, код читается легче.
card: Чем article отличается от section? :: article — самостоятельный материал (пост, карточка), section — смысловой раздел внутри чего-то.

## html-15 | Картинки и медиа: figure, picture, video, object-fit
Картинка с подписью — `figure` и `figcaption`:

```html
<figure>
  <img src="graph.png" alt="График функции sin x">
  <figcaption>Рис. 1. График синуса</figcaption>
</figure>
```

Разные картинки для разных экранов — `picture`:

```html
<picture>
  <source media="(max-width: 600px)" srcset="small.jpg">
  <img src="big.jpg" alt="Пейзаж">
</picture>
```

`loading="lazy"` — картинка загрузится, только когда до неё доскроллят.

Видео и звук: `<video src="lesson.mp4" controls poster="preview.jpg"></video>`, `<audio controls src="song.mp3"></audio>`.

Обрезка под рамку без искажений — `object-fit: cover` (заполнить, лишнее обрезать) или `contain` (вписать целиком). `aspect-ratio: 16 / 9` — держать пропорции.

?? Что делает `object-fit: cover`?
+ заполняет рамку картинкой без искажения, обрезая лишнее
- растягивает с искажением
- вписывает целиком с полями
- делает картинку фоном
= contain — вписать целиком, оставив поля.

?? Зачем `loading="lazy"`?
+ откладывает загрузку картинки, пока она не понадобится — страница грузится быстрее
- делает картинку медленнее
- для анимации
- для SEO
= Особенно полезно для длинных галерей.

!! {1} Картинка с подписью: `figure` с `img` (alt и loading="lazy") и `figcaption`.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Рисунок</title></head>
<body>

</body>
</html>
<<<
check: figure img[alt] | Внутри figure — img с alt
check: img[loading="lazy"] | Отложенная загрузка: loading="lazy"
check: figure figcaption | Подпись figcaption
hint: `<figure><img src="https://picsum.photos/400/250" alt="…" loading="lazy"><figcaption>…</figcaption></figure>`
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Рисунок</title></head>
<body>
  <figure>
    <img src="https://picsum.photos/400/250" alt="Случайная фотография природы" loading="lazy">
    <figcaption>Рис. 1. Природа</figcaption>
  </figure>
</body>
</html>
===
!! {2} Галерея квадратных превью: 4 картинки в контейнере `.grid` (grid, 2+ столбца), у картинок `aspect-ratio: 1` и `object-fit: cover`, ширина 100%.
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
  <div class="grid">
    <img src="https://picsum.photos/400/200" alt="Фото 1">
    <img src="https://picsum.photos/200/400" alt="Фото 2">
    <img src="https://picsum.photos/300/300" alt="Фото 3">
    <img src="https://picsum.photos/500/250" alt="Фото 4">
  </div>
</body>
</html>
<<<
check: css:aspect-ratio | Квадрат: aspect-ratio: 1
check: css:object-fit\s*:\s*cover | Без искажений: object-fit: cover
check: css:display\s*:\s*grid | Контейнер — grid
check: img[alt] >= 4 | У всех картинок alt
hint: `.grid img { width: 100%; aspect-ratio: 1; object-fit: cover; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Галерея</title>
  <style>
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; max-width: 420px; }
    .grid img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="grid">
    <img src="https://picsum.photos/400/200" alt="Фото 1">
    <img src="https://picsum.photos/200/400" alt="Фото 2">
    <img src="https://picsum.photos/300/300" alt="Фото 3">
    <img src="https://picsum.photos/500/250" alt="Фото 4">
  </div>
</body>
</html>
===
!! {3} Блок урока с видео: `video` с controls и poster, под ним `picture` с `source` для узких экранов (media max-width) и запасным `img`, всё в `figure` с подписью.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Видеоурок</title></head>
<body>

</body>
</html>
<<<
check: video[controls][poster] | Видео с controls и poster
check: picture source[media] | В picture — source с media
check: picture img[alt] | Запасная картинка img с alt
check: figure figcaption | Подпись в figure
hint: `<picture><source media="(max-width: 600px)" srcset="…"><img src="…" alt="…"></picture>`
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Видеоурок</title></head>
<body>
  <figure>
    <video controls poster="https://picsum.photos/640/360" width="640"></video>
    <picture>
      <source media="(max-width: 600px)" srcset="https://picsum.photos/300/200">
      <img src="https://picsum.photos/640/200" alt="Схема из урока">
    </picture>
    <figcaption>Урок 1. Введение</figcaption>
  </figure>
</body>
</html>
===
card: Для чего figure и figcaption? :: Картинка (или код, график) с подписью как единое целое.
card: Чем object-fit: cover отличается от contain? :: cover заполняет рамку, обрезая лишнее; contain вписывает целиком, оставляя поля.

## html-16 | Доступность (a11y)
Сайтом пользуются люди с экранными дикторами, только клавиатурой, с плохим зрением. Базовые правила:

- у картинок — осмысленный `alt` (декоративные — `alt=""`)
- у полей — `label`; у кнопок-иконок — `aria-label="Закрыть"`
- кнопки — это `<button>`, ссылки — `<a href>`; не делай кликабельные `div`
- заголовки по порядку h1 → h2 → h3, без пропусков
- `lang="ru"` у html — диктор выберет правильный язык
- видимый фокус: не убирай `outline` без замены (`:focus-visible`)
- контраст текста и фона — минимум 4.5:1
- ссылка «пропустить меню» в начале — `<a href="#main" class="skip">К содержимому</a>`

`aria-*` — подсказки для дикторов: `aria-label`, `aria-hidden="true"` (скрыть декор), `aria-live="polite"` (объявлять изменения), `role="alert"`.

?? Что не так с `<div onclick="...">Купить</div>`?
+ с клавиатуры до него не добраться, и диктор не скажет, что это кнопка
- ничего
- div не умеет onclick
- он медленный
= Используй `<button>` — фокус и Enter работают сами.

?? Какой alt у чисто декоративной картинки?
+ пустой: alt=""
- alt="картинка"
- без alt
- alt="decor"
= Пустой alt говорит диктору «пропусти».

!! {1} Исправь доступность: у html есть lang, у картинки — alt, у поля — label, кнопка-иконка с `aria-label`.
<<<
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Поиск</title></head>
<body>
  <img src="https://picsum.photos/120/40">
  <input id="q" type="search">
  <button>🔍</button>
</body>
</html>
<<<
check: html[lang] | Укажи язык страницы: lang у html
check: img[alt] | Добавь alt картинке
check: label[for="q"] | Подпиши поле: label for="q"
check: button[aria-label] | Кнопке-иконке — aria-label
hint: `<button aria-label="Найти">🔍</button>`
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Поиск</title></head>
<body>
  <img src="https://picsum.photos/120/40" alt="Логотип сайта">
  <label for="q">Поиск по курсам</label>
  <input id="q" type="search">
  <button aria-label="Найти">🔍</button>
</body>
</html>
===
!! {2} Ссылка «к содержимому» и видимый фокус: первая ссылка страницы `.skip` ведёт на `#main`, видна только при фокусе (сдвинута за экран, а в `:focus` возвращается); у ссылок и кнопок — заметный `:focus-visible` (outline).
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Навигация</title>
  <style>

  </style>
</head>
<body>
  <nav><a href="#">Курсы</a> <a href="#">План</a></nav>
  <main id="main"><h1>Главное</h1></main>
</body>
</html>
<<<
check: a.skip[href="#main"] | Ссылка .skip на #main
check: body > a.skip:first-child | Сделай её первым элементом body
check: css:\.skip:focus | Показывай .skip при фокусе: .skip:focus
check: css::focus-visible[^{]*\{[^}]*outline | Видимый фокус: :focus-visible с outline
hint: `.skip { position: absolute; left: -999px; } .skip:focus { left: 10px; top: 10px; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Навигация</title>
  <style>
    .skip { position: absolute; left: -999px; top: 10px; background: white; padding: 6px 10px; }
    .skip:focus { left: 10px; }
    a:focus-visible, button:focus-visible { outline: 3px solid #6c5ce7; outline-offset: 2px; }
  </style>
</head>
<body>
  <a class="skip" href="#main">К содержимому</a>
  <nav><a href="#">Курсы</a> <a href="#">План</a></nav>
  <main id="main"><h1>Главное</h1></main>
</body>
</html>
===
!! {3} Уведомление для дикторов: блок `.status` с `aria-live="polite"`, декоративная иконка с `aria-hidden="true"`, ошибка формы — с `role="alert"`, а поле связано с текстом ошибки через `aria-describedby`.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Отправка</title></head>
<body>
  <form>
    <label for="mail">Почта</label>
    <input id="mail" type="email">
    <p id="err">Почта без @</p>
    <button>Отправить</button>
  </form>
  <div class="status"><span>✓</span> Сохранено</div>
</body>
</html>
<<<
check: .status[aria-live="polite"] | Статус объявляй: aria-live="polite"
check: span[aria-hidden="true"] | Скрой декоративную иконку: aria-hidden="true"
check: [role="alert"] | Ошибке — role="alert"
check: input[aria-describedby="err"] | Свяжи поле с ошибкой: aria-describedby="err"
hint: Атрибуты добавляются к уже существующим элементам — разметку менять почти не нужно.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Отправка</title></head>
<body>
  <form>
    <label for="mail">Почта</label>
    <input id="mail" type="email" aria-describedby="err">
    <p id="err" role="alert">Почта без @</p>
    <button>Отправить</button>
  </form>
  <div class="status" aria-live="polite"><span aria-hidden="true">✓</span> Сохранено</div>
</body>
</html>
===
card: Почему кнопка должна быть <button>, а не <div>? :: button сам получает фокус с клавиатуры, нажимается Enter/пробелом и объявляется диктором как кнопка.
card: Что делает aria-live="polite"? :: Экранный диктор вслух объявит изменение содержимого блока, когда освободится.

### Модуль: CSS

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
!! {2} Зебра-таблица и подсветка: в списке из 5 пунктов каждый чётный пункт с другим фоном (`:nth-child(even)`), первый пункт жирный (`:first-child`), при наведении пункт меняет цвет.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Зебра</title>
  <style>

  </style>
</head>
<body>
  <ul class="list">
    <li>Пн</li><li>Вт</li><li>Ср</li><li>Чт</li><li>Пт</li>
  </ul>
</body>
</html>
<<<
check: css::nth-child\(even\) | Покрась чётные пункты: :nth-child(even)
check: css::first-child | Выдели первый пункт: :first-child
check: css:li:hover | Подсветка при наведении: li:hover
hint: `.list li:nth-child(even) { background: #eee; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Зебра</title>
  <style>
    .list li:nth-child(even) { background: #eef; }
    .list li:first-child { font-weight: 700; }
    .list li:hover { color: tomato; }
  </style>
</head>
<body>
  <ul class="list">
    <li>Пн</li><li>Вт</li><li>Ср</li><li>Чт</li><li>Пт</li>
  </ul>
</body>
</html>
===
card: Как в CSS выбрать элемент по классу и по id? :: Класс — `.имя`, id — `#имя`.
card: Какое CSS-правило побеждает при конфликте? :: Более конкретное (id > класс > тег), при равной конкретности — последнее.

## html-14 | Псевдоклассы и псевдоэлементы
**Псевдоклассы** — состояние или положение элемента:
- `:hover`, `:active`, `:focus`, `:focus-visible` — наведение, нажатие, фокус клавиатурой
- `:first-child`, `:last-child`, `:nth-child(3n)`, `:not(.done)`
- `:checked`, `:disabled`, `:invalid` — для полей форм

**Псевдоэлементы** — «виртуальные» части элемента, которые можно оформить:
- `::before`, `::after` — добавляют содержимое (`content` обязателен!)
- `::placeholder`, `::selection`, `::first-letter`

```css
.req::after { content: " *"; color: red; }
li:not(:last-child) { border-bottom: 1px solid #eee; }
input:invalid { border-color: red; }
input:checked + label { text-decoration: line-through; }
```

`+` — соседний следующий элемент, `~` — все следующие соседи.

?? Что обязательно для `::before`, чтобы он появился?
+ свойство content (хотя бы пустое: content: "")
- display: block
- position: absolute
- ничего
= Без content псевдоэлемент не создаётся.

?? Что выберет `li:not(:last-child)`?
+ все пункты, кроме последнего
- только последний
- все li
- ничего
= :not исключает подходящие под условие элементы.

!! {1} В форме у обязательных полей (класс `req` у label) добавь звёздочку через `::after`, а неправильно заполненные поля подсвети через `:invalid`.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Форма</title>
  <style>

  </style>
</head>
<body>
  <form>
    <label class="req" for="e">Почта</label>
    <input id="e" type="email" required>
    <label for="n">Ник</label>
    <input id="n">
  </form>
</body>
</html>
<<<
check: css:\.req::after | Звёздочка через .req::after
check: css:content\s*:\s*["'][^"']*\* | В content должна быть *
check: css::invalid | Подсветка через :invalid
hint: `.req::after { content: " *"; color: tomato; } input:invalid { border-color: tomato; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Форма</title>
  <style>
    .req::after { content: " *"; color: tomato; }
    input:invalid { border: 2px solid tomato; }
  </style>
</head>
<body>
  <form>
    <label class="req" for="e">Почта</label>
    <input id="e" type="email" required>
    <label for="n">Ник</label>
    <input id="n">
  </form>
</body>
</html>
===
!! {2} Список дел без JavaScript: чекбокс и подпись рядом; отмеченное дело зачёркнуто и бледное (`input:checked + label`), между пунктами — линии, кроме последнего (`:not(:last-child)`).
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Дела</title>
  <style>

  </style>
</head>
<body>
  <ul class="todo">
    <li><input type="checkbox" id="t1"><label for="t1">Решить задачу</label></li>
    <li><input type="checkbox" id="t2" checked><label for="t2">Повторить карточки</label></li>
    <li><input type="checkbox" id="t3"><label for="t3">Прочитать главу</label></li>
  </ul>
</body>
</html>
<<<
check: css::checked\s*\+\s*label | Стиль для отмеченного: input:checked + label
check: css:line-through | Зачеркни: text-decoration: line-through
check: css::not\(:last-child\) | Линии между пунктами: li:not(:last-child)
check: input[type="checkbox"] >= 3 | Оставь три дела
hint: `.todo input:checked + label { text-decoration: line-through; opacity: .5; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Дела</title>
  <style>
    .todo { list-style: none; padding: 0; }
    .todo li { padding: 8px 0; }
    .todo li:not(:last-child) { border-bottom: 1px solid #eee; }
    .todo input:checked + label { text-decoration: line-through; opacity: 0.5; }
  </style>
</head>
<body>
  <ul class="todo">
    <li><input type="checkbox" id="t1"><label for="t1">Решить задачу</label></li>
    <li><input type="checkbox" id="t2" checked><label for="t2">Повторить карточки</label></li>
    <li><input type="checkbox" id="t3"><label for="t3">Прочитать главу</label></li>
  </ul>
</body>
</html>
===
!! {3} Красивая цитата: у `blockquote` огромная открывающая кавычка через `::before` (позиционирована absolute), первая буква абзаца крупная (`::first-letter`), выделение текста — своего цвета (`::selection`).
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Цитата</title>
  <style>

  </style>
</head>
<body>
  <blockquote>
    <p>Программирование — это искусство говорить другому человеку, чего ты хочешь от компьютера.</p>
  </blockquote>
</body>
</html>
<<<
check: css:blockquote::before | Кавычка через blockquote::before
check: css:position\s*:\s*absolute | Кавычку позиционируй absolute
check: css:::first-letter | Крупная первая буква: ::first-letter
check: css:::selection | Свой цвет выделения: ::selection
hint: `blockquote { position: relative; } blockquote::before { content: "“"; position: absolute; left: -10px; top: -20px; font-size: 80px; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Цитата</title>
  <style>
    blockquote { position: relative; margin: 40px; font-style: italic; }
    blockquote::before { content: "“"; position: absolute; left: -30px; top: -30px; font-size: 80px; color: #6c5ce7; }
    blockquote p::first-letter { font-size: 2em; font-weight: 700; }
    ::selection { background: #ffd166; }
  </style>
</head>
<body>
  <blockquote>
    <p>Программирование — это искусство говорить другому человеку, чего ты хочешь от компьютера.</p>
  </blockquote>
</body>
</html>
===
card: Чем псевдокласс отличается от псевдоэлемента? :: Псевдокласс (:hover) — состояние элемента; псевдоэлемент (::before) — отдельная виртуальная часть, которую можно оформить.
card: Что выбирает `a + b`? :: Элемент b, который идёт сразу после a (соседний).

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
!! {2} Кнопки трёх размеров: класс `btn` (общие отступы, рамка, скругление, `display: inline-block`) и модификаторы `btn-small`, `btn-big` с разными padding и font-size. Сделай три кнопки-ссылки.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Кнопки</title>
  <style>

  </style>
</head>
<body>

</body>
</html>
<<<
check: a.btn >= 3 | Нужно три ссылки с классом btn
check: .btn-small | Одна кнопка с классом btn-small
check: .btn-big | Одна кнопка с классом btn-big
check: css:display\s*:\s*inline-block | У .btn — display: inline-block
check: css:\.btn-big\s*\{[^}]*font-size | У .btn-big свой font-size
hint: Несколько классов через пробел: `<a class="btn btn-big">`.
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Кнопки</title>
  <style>
    .btn { display: inline-block; padding: 8px 14px; border: 2px solid #6c5ce7; border-radius: 10px; color: #6c5ce7; text-decoration: none; }
    .btn-small { padding: 4px 8px; font-size: 12px; }
    .btn-big { padding: 14px 24px; font-size: 20px; }
  </style>
</head>
<body>
  <a class="btn btn-small" href="#">Мелкая</a>
  <a class="btn" href="#">Обычная</a>
  <a class="btn btn-big" href="#">Большая</a>
</body>
</html>
===
card: Порядок слоёв блочной модели изнутри наружу? :: content → padding → border → margin.
card: Что делает `box-sizing: border-box`? :: width и height включают padding и border — размеры считать проще.

## html-13 | Позиционирование: relative, absolute, fixed, sticky
`position` меняет, как элемент встаёт на странице:
- `static` — обычный поток (по умолчанию)
- `relative` — сдвиг относительно своего места (`top`, `left`); место в потоке остаётся
- `absolute` — вынут из потока, координаты — от ближайшего предка с `position` не static
- `fixed` — приклеен к окну (не уезжает при прокрутке)
- `sticky` — едет вместе со страницей, пока не упрётся в `top`, потом прилипает

```css
.card { position: relative; }
.badge { position: absolute; top: 8px; right: 8px; }  /* в углу карточки */
.header { position: sticky; top: 0; z-index: 10; }
.chat-btn { position: fixed; right: 20px; bottom: 20px; }
```

`z-index` — кто сверху (работает у позиционированных элементов). `inset: 0` — то же, что top/right/bottom/left: 0.

?? Относительно чего встаёт `position: absolute`?
+ относительно ближайшего предка с position, отличным от static
- относительно окна всегда
- относительно своего обычного места
- относительно body всегда
= Поэтому родителю обычно ставят `position: relative`.

?? Чем sticky отличается от fixed?
+ sticky прилипает, только когда доезжает до порога, и остаётся в пределах родителя
- ничем
- sticky не работает в браузерах
- fixed едет вместе со страницей
= Классика — липкая шапка таблицы или меню.

!! {1} Карточка с значком «NEW» в правом верхнем углу: у `.card` — position: relative, у `.badge` — absolute с top и right.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Значок</title>
  <style>

  </style>
</head>
<body>
  <div class="card">
    <span class="badge">NEW</span>
    <h3>Курс по C++</h3>
    <p>28 уроков</p>
  </div>
</body>
</html>
<<<
check: css:\.card\s*\{[^}]*position\s*:\s*relative | У .card — position: relative
check: css:\.badge\s*\{[^}]*position\s*:\s*absolute | У .badge — position: absolute
check: css:\.badge\s*\{[^}]*top | Задай .badge top
check: css:\.badge\s*\{[^}]*right | Задай .badge right
hint: `.badge { position: absolute; top: 8px; right: 8px; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Значок</title>
  <style>
    .card { position: relative; width: 220px; padding: 16px; border: 1px solid #ddd; border-radius: 12px; }
    .badge { position: absolute; top: 8px; right: 8px; background: tomato; color: white; font-size: 11px; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">NEW</span>
    <h3>Курс по C++</h3>
    <p>28 уроков</p>
  </div>
</body>
</html>
===
!! {2} Липкая шапка и плавающая кнопка: header прилипает к верху при прокрутке (`sticky` + `top: 0` + `z-index`), кнопка `.fab` всегда в правом нижнем углу окна (`fixed`).
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Липкая шапка</title>
  <style>

  </style>
</head>
<body>
  <header>Камадо</header>
  <main style="height: 2000px">Длинная страница…</main>
  <button class="fab">+</button>
</body>
</html>
<<<
check: css:position\s*:\s*sticky | Шапке — position: sticky
check: css:top\s*:\s*0 | Прилипание к верху: top: 0
check: css:z-index | Чтобы шапка была поверх — z-index
check: css:\.fab\s*\{[^}]*position\s*:\s*fixed | Кнопке — position: fixed
hint: `header { position: sticky; top: 0; z-index: 10; } .fab { position: fixed; right: 20px; bottom: 20px; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Липкая шапка</title>
  <style>
    header { position: sticky; top: 0; z-index: 10; background: #1e1b2e; color: white; padding: 12px; }
    .fab { position: fixed; right: 20px; bottom: 20px; width: 48px; height: 48px; border-radius: 50%; border: 0; background: #6c5ce7; color: white; font-size: 24px; }
  </style>
</head>
<body>
  <header>Камадо</header>
  <main style="height: 2000px">Длинная страница…</main>
  <button class="fab">+</button>
</body>
</html>
===
!! {3} Модальное окно поверх страницы: полупрозрачный фон `.overlay` на весь экран (fixed + inset: 0), а окно `.dialog` по центру (flex-центровка или transform: translate(-50%, -50%)).
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Модалка</title>
  <style>

  </style>
</head>
<body>
  <p>Страница под модальным окном.</p>
  <div class="overlay">
    <div class="dialog">
      <h3>Удалить урок?</h3>
      <button>Да</button> <button>Нет</button>
    </div>
  </div>
</body>
</html>
<<<
check: css:\.overlay\s*\{[^}]*position\s*:\s*fixed | Фон — position: fixed
check: css:inset\s*:\s*0|top\s*:\s*0[^}]*left\s*:\s*0 | Растяни фон: inset: 0
check: css:rgba\(|rgb\([^)]*/ | Полупрозрачный цвет фона: rgba(…) или rgb(… / …)
check: css:justify-content\s*:\s*center|translate\(-50%,\s*-50%\) | Отцентрируй окно
hint: `.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; justify-content: center; align-items: center; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Модалка</title>
  <style>
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; }
    .dialog { background: white; padding: 24px; border-radius: 16px; }
  </style>
</head>
<body>
  <p>Страница под модальным окном.</p>
  <div class="overlay">
    <div class="dialog">
      <h3>Удалить урок?</h3>
      <button>Да</button> <button>Нет</button>
    </div>
  </div>
</body>
</html>
===
card: Что нужно, чтобы absolute-элемент встал в углу карточки? :: Карточке — `position: relative`, элементу — `position: absolute; top: …; right: …`.
card: Как сделать липкую шапку? :: `position: sticky; top: 0; z-index: 10;`

### Модуль: Раскладка и анимации

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
!! {2} Карточки товаров flex-ом: контейнер `.cards` — flex с переносом и gap; 4 карточки `.card` шириной ~200px (flex: 0 0 200px или width), внутри — колонка (flex-direction: column), кнопка прижата к низу (`margin-top: auto`).
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Товары</title>
  <style>

  </style>
</head>
<body>
  <div class="cards">
    <div class="card"><h3>Чай</h3><p>Зелёный</p><button>Купить</button></div>
    <div class="card"><h3>Кофе</h3><p>Зерновой, свежая обжарка</p><button>Купить</button></div>
    <div class="card"><h3>Какао</h3><p>Горячий</p><button>Купить</button></div>
    <div class="card"><h3>Сок</h3><p>Апельсиновый</p><button>Купить</button></div>
  </div>
</body>
</html>
<<<
check: css:flex-wrap\s*:\s*wrap | Разреши перенос: flex-wrap: wrap
check: css:flex-direction\s*:\s*column | Карточка — колонка: flex-direction: column
check: css:margin-top\s*:\s*auto | Прижми кнопку вниз: margin-top: auto
check: css:gap | Расстояние между карточками — gap
hint: `.card { display: flex; flex-direction: column; } .card button { margin-top: auto; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Товары</title>
  <style>
    .cards { display: flex; flex-wrap: wrap; gap: 14px; }
    .card { flex: 0 0 200px; display: flex; flex-direction: column; padding: 12px; border: 1px solid #ddd; border-radius: 12px; }
    .card button { margin-top: auto; }
  </style>
</head>
<body>
  <div class="cards">
    <div class="card"><h3>Чай</h3><p>Зелёный</p><button>Купить</button></div>
    <div class="card"><h3>Кофе</h3><p>Зерновой, свежая обжарка</p><button>Купить</button></div>
    <div class="card"><h3>Какао</h3><p>Горячий</p><button>Купить</button></div>
    <div class="card"><h3>Сок</h3><p>Апельсиновый</p><button>Купить</button></div>
  </div>
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
!! {3} Раскладка страницы на grid-областях: `.page` с `grid-template-areas` из header, sidebar, main, footer (шапка и подвал на всю ширину), сайдбар 220px.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Раскладка</title>
  <style>

  </style>
</head>
<body>
  <div class="page">
    <header>Шапка</header>
    <aside>Меню</aside>
    <main>Содержимое</main>
    <footer>Подвал</footer>
  </div>
</body>
</html>
<<<
check: css:grid-template-areas | Задай области: grid-template-areas
check: css:grid-area | Назначь области элементам: grid-area
check: css:220px | Сайдбар шириной 220px
check: css:display\s*:\s*grid | Включи grid
hint: `grid-template-areas: "head head" "side main" "foot foot"; grid-template-columns: 220px 1fr;`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Раскладка</title>
  <style>
    .page { display: grid; grid-template-columns: 220px 1fr; grid-template-areas: "head head" "side main" "foot foot"; gap: 10px; min-height: 300px; }
    header { grid-area: head; background: #e4e0ff; }
    aside { grid-area: side; background: #f2f0ff; }
    main { grid-area: main; }
    footer { grid-area: foot; background: #e4e0ff; }
  </style>
</head>
<body>
  <div class="page">
    <header>Шапка</header>
    <aside>Меню</aside>
    <main>Содержимое</main>
    <footer>Подвал</footer>
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
!! {2} Тёмная тема по настройке системы: светлые цвета по умолчанию, а в `@media (prefers-color-scheme: dark)` — тёмный фон и светлый текст. Цвета — через CSS-переменные.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Тема</title>
  <style>

  </style>
</head>
<body>
  <h1>Привет</h1>
  <p>Эта страница подстраивается под тему системы.</p>
</body>
</html>
<<<
check: css:prefers-color-scheme\s*:\s*dark | Добавь @media (prefers-color-scheme: dark)
check: css:--[\w-]+\s*: | Объяви CSS-переменные
check: css:var\(-- | Используй переменные через var()
hint: `:root { --bg: #fff; --text: #222; } @media (prefers-color-scheme: dark) { :root { --bg: #111; --text: #eee; } } body { background: var(--bg); color: var(--text); }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Тема</title>
  <style>
    :root { --bg: #ffffff; --text: #222222; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #111318; --text: #eeeeee; }
    }
    body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <h1>Привет</h1>
  <p>Эта страница подстраивается под тему системы.</p>
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
!! {2} Загрузчик-спиннер: круглый элемент `.spinner` с рамкой (одна сторона другого цвета через border-top-color), бесконечно вращается через `@keyframes` с `transform: rotate(360deg)`. Для тех, кто не любит анимации, — отключи её в `prefers-reduced-motion`.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Загрузка</title>
  <style>

  </style>
</head>
<body>
  <div class="spinner"></div>
</body>
</html>
<<<
check: css:border-radius\s*:\s*50% | Сделай круг: border-radius: 50%
check: css:border-top-color | Выдели одну сторону: border-top-color
check: css:rotate\(\s*360deg\s*\) | Поворот до 360deg в @keyframes
check: css:infinite | Бесконечная анимация: infinite
check: css:prefers-reduced-motion | Уважай настройку prefers-reduced-motion
hint: `@keyframes spin { to { transform: rotate(360deg); } } .spinner { animation: spin 1s linear infinite; }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Загрузка</title>
  <style>
    .spinner { width: 40px; height: 40px; border: 4px solid #ddd; border-top-color: #6c5ce7; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
  </style>
</head>
<body>
  <div class="spinner"></div>
</body>
</html>
===
card: Как объявить и использовать CSS-переменную? :: `:root { --accent: #6c5ce7; }` и `color: var(--accent);`
card: Чем transition отличается от animation? :: transition — плавный переход при смене состояния (например, :hover). animation — анимация по @keyframes, может идти сама и бесконечно.

### Модуль: Проекты

## html-17 | Проект: лендинг курса
Лендинг — одностраничный сайт, который продаёт идею. Структура почти всегда такая:

1. **header** — логотип и меню (flex, sticky)
2. **hero** — большой заголовок, подзаголовок и кнопка-призыв
3. **features** — 3–6 карточек преимуществ (grid, auto-fit)
4. **отзывы** или **цены**
5. **footer** — контакты, копирайт

Порядок работы: сначала семантическая разметка без стилей → общие стили (шрифт, переменные цветов, box-sizing) → раскладка блоков → мелочи (hover, переходы) → адаптив (`@media`).

```css
:root { --accent: #6c5ce7; }
.hero { min-height: 60vh; display: grid; place-items: center; text-align: center; }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
```

`place-items: center` — центр по обеим осям в grid одной строкой.

?? С чего правильно начинать вёрстку?
+ с семантической разметки без стилей, потом стили
- с анимаций
- с цветов
- с JavaScript
= Сначала структура и смысл, потом внешний вид.

?? Что делает `place-items: center` в grid?
+ центрирует содержимое ячеек по горизонтали и вертикали
- выравнивает текст по центру
- центрирует страницу в окне
- ничего
= Это сокращение align-items + justify-items.

!! {2} Шаг 1. Разметка лендинга: header с логотипом и nav (3+ ссылки), section `.hero` с h1, абзацем и ссылкой-кнопкой `.cta`, section `.features` с 3 карточками-article (h3 + p), footer.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Курс Камадо</title></head>
<body>

</body>
</html>
<<<
check: header nav a >= 3 | В шапке — nav с 3+ ссылками
check: .hero h1 | В hero — h1
check: .hero a.cta | Кнопка-призыв: a с классом cta
check: .features article >= 3 | Три карточки преимуществ
check: footer | Подвал footer
hint: Пока без стилей — только смысл и структура.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Курс Камадо</title></head>
<body>
  <header>
    <b>Камадо</b>
    <nav><a href="#features">Почему</a> <a href="#price">Цена</a> <a href="#contacts">Контакты</a></nav>
  </header>
  <section class="hero">
    <h1>Выучи Python за 30 дней</h1>
    <p>Уроки, задачи с проверкой и повторение каждый день.</p>
    <a class="cta" href="#price">Начать бесплатно</a>
  </section>
  <section class="features" id="features">
    <article><h3>Задачи с тестами</h3><p>Код проверяется сразу.</p></article>
    <article><h3>ИИ-помощник</h3><p>Объясняет ошибки.</p></article>
    <article><h3>Повторение</h3><p>Карточки по интервалам.</p></article>
  </section>
  <footer id="contacts">© 2026 Камадо</footer>
</body>
</html>
===
!! {3} Шаг 2. Стили лендинга: переменная цвета в `:root`, шапка flex (`space-between`) и sticky, hero на 60vh с `place-items: center`, карточки — grid `repeat(auto-fit, minmax(...))`, кнопка `.cta` с hover-переходом, и `@media` для узких экранов.
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Курс Камадо</title>
  <style>

  </style>
</head>
<body>
  <header>
    <b>Камадо</b>
    <nav><a href="#features">Почему</a> <a href="#price">Цена</a> <a href="#contacts">Контакты</a></nav>
  </header>
  <section class="hero">
    <div>
      <h1>Выучи Python за 30 дней</h1>
      <p>Уроки, задачи с проверкой и повторение каждый день.</p>
      <a class="cta" href="#price">Начать бесплатно</a>
    </div>
  </section>
  <section class="features" id="features">
    <article><h3>Задачи с тестами</h3><p>Код проверяется сразу.</p></article>
    <article><h3>ИИ-помощник</h3><p>Объясняет ошибки.</p></article>
    <article><h3>Повторение</h3><p>Карточки по интервалам.</p></article>
  </section>
  <footer id="contacts">© 2026 Камадо</footer>
</body>
</html>
<<<
check: css::root\s*\{[^}]*--[\w-]+\s*: | Цвет — переменной в :root
check: css:justify-content\s*:\s*space-between | Шапка: justify-content: space-between
check: css:position\s*:\s*sticky | Шапка липкая: position: sticky
check: css:60vh | Hero высотой 60vh
check: css:place-items\s*:\s*center | Центр hero: place-items: center
check: css:auto-fit|auto-fill | Карточки — repeat(auto-fit, minmax(…))
check: css:\.cta:hover | Ховер кнопки: .cta:hover
check: css:transition | Плавность: transition
check: css:@media | Адаптив: @media
hint: Двигайся по блокам сверху вниз; после каждого — смотри на просмотр справа.
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Курс Камадо</title>
  <style>
    :root { --accent: #6c5ce7; --text: #1e1b2e; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; color: var(--text); }
    header { position: sticky; top: 0; display: flex; justify-content: space-between; align-items: center; padding: 14px 24px; background: white; }
    nav { display: flex; gap: 16px; }
    nav a { color: var(--text); text-decoration: none; }
    .hero { min-height: 60vh; display: grid; place-items: center; text-align: center; background: #f2f0ff; }
    .cta { display: inline-block; padding: 12px 22px; border-radius: 12px; background: var(--accent); color: white; text-decoration: none; transition: transform 0.2s; }
    .cta:hover { transform: translateY(-2px); }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; padding: 24px; }
    .features article { padding: 16px; border: 1px solid #e5e5f0; border-radius: 14px; }
    footer { padding: 24px; text-align: center; color: #777; }
    @media (max-width: 600px) {
      nav { display: none; }
      .hero h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
  <header>
    <b>Камадо</b>
    <nav><a href="#features">Почему</a> <a href="#price">Цена</a> <a href="#contacts">Контакты</a></nav>
  </header>
  <section class="hero">
    <div>
      <h1>Выучи Python за 30 дней</h1>
      <p>Уроки, задачи с проверкой и повторение каждый день.</p>
      <a class="cta" href="#price">Начать бесплатно</a>
    </div>
  </section>
  <section class="features" id="features">
    <article><h3>Задачи с тестами</h3><p>Код проверяется сразу.</p></article>
    <article><h3>ИИ-помощник</h3><p>Объясняет ошибки.</p></article>
    <article><h3>Повторение</h3><p>Карточки по интервалам.</p></article>
  </section>
  <footer id="contacts">© 2026 Камадо</footer>
</body>
</html>
===
card: Из каких блоков обычно состоит лендинг? :: Шапка с меню, hero с призывом, блок преимуществ, отзывы/цены, подвал.
card: Как сделать карточки, которые сами переносятся по ширине? :: `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`.

## html-18 | Проект: резюме-портфолио
Финальный проект — твоя страница-резюме, которую не стыдно отправить: аккуратная, адаптивная, доступная и готовая к печати.

Части:
- шапка с именем, фото (`alt`!) и контактами (`mailto:`, ссылки на GitHub)
- «Навыки» — список-«чипсы» (flex-wrap)
- «Проекты» — карточки с картинкой (`object-fit`) и ссылками
- «Образование» — список с датами (`time`)

Стили для печати:

```css
@media print {
  nav, .no-print { display: none; }
  body { color: black; background: white; }
  a::after { content: " (" attr(href) ")"; }   /* показать адреса ссылок на бумаге */
}
```

Проверь себя: страница читается с клавиатуры (Tab), у картинок есть alt, на телефоне ничего не вылезает.

?? Что делает `a::after { content: " (" attr(href) ")"; }` в @media print?
+ на печати после ссылки появится её адрес в скобках
- удаляет ссылки
- делает ссылки кликабельными на бумаге
- ничего
= attr() подставляет значение атрибута.

?? Как спрятать меню при печати?
+ @media print { nav { display: none; } }
- @media screen { nav { display: none; } }
- nav { print: none; }
- нельзя
= Медиазапрос print применяется только при печати.

!! {2} Шаг 1. Разметка резюме: header с h1 (имя), img с alt и контактами (mailto и ссылка), section «Навыки» со списком 5+ навыков, section «Проекты» с 2+ article (h3, ссылка), section «Образование» с `time`.
<<<
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Резюме</title></head>
<body>

</body>
</html>
<<<
check: header h1 | Имя — h1 в header
check: header img[alt] | Фото с alt в шапке
check: a[href^="mailto:"] | Почта: mailto
check: section ul li >= 5 | 5+ навыков списком
check: section article >= 2 | 2+ проекта
check: article a >= 2 | В проектах — ссылки
check: section time | В «Образовании» — дата time
hint: Каждая section начинается с h2.
===
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>Резюме</title></head>
<body>
  <header>
    <img src="https://picsum.photos/120" alt="Фото Миши" width="120">
    <h1>Миша Иванов</h1>
    <p><a href="mailto:misha@example.com">misha@example.com</a> · <a href="https://github.com">GitHub</a></p>
  </header>
  <section>
    <h2>Навыки</h2>
    <ul><li>Python</li><li>C++</li><li>Java</li><li>HTML/CSS</li><li>Алгоритмы</li></ul>
  </section>
  <section>
    <h2>Проекты</h2>
    <article><h3>Телефонная книга</h3><a href="https://github.com">Код</a></article>
    <article><h3>LRU-кэш</h3><a href="https://github.com">Код</a></article>
  </section>
  <section>
    <h2>Образование</h2>
    <p>Бакалавриат, <time datetime="2025-09">с 2025</time></p>
  </section>
</body>
</html>
===
!! {3} Шаг 2. Стили: навыки — «чипсы» (flex-wrap, скругление), проекты — grid с картинками `object-fit: cover`, адаптив `@media (max-width: …)`, и стили печати `@media print` (скрыть `.no-print`, показать адреса ссылок через `attr(href)`).
<<<
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Резюме</title>
  <style>

  </style>
</head>
<body>
  <header>
    <img src="https://picsum.photos/120" alt="Фото Миши" width="120">
    <h1>Миша Иванов</h1>
    <p><a href="mailto:misha@example.com">misha@example.com</a> · <a href="https://github.com">GitHub</a></p>
    <button class="no-print">Скачать PDF</button>
  </header>
  <section>
    <h2>Навыки</h2>
    <ul class="skills"><li>Python</li><li>C++</li><li>Java</li><li>HTML/CSS</li><li>Алгоритмы</li></ul>
  </section>
  <section>
    <h2>Проекты</h2>
    <div class="projects">
      <article><img src="https://picsum.photos/300/200" alt="Скриншот телефонной книги"><h3>Телефонная книга</h3><a href="https://github.com">Код</a></article>
      <article><img src="https://picsum.photos/300/201" alt="Схема LRU-кэша"><h3>LRU-кэш</h3><a href="https://github.com">Код</a></article>
    </div>
  </section>
</body>
</html>
<<<
check: css:\.skills\s*\{[^}]*flex-wrap\s*:\s*wrap | Навыки — flex-wrap: wrap
check: css:\.projects\s*\{[^}]*display\s*:\s*grid | Проекты — grid
check: css:object-fit\s*:\s*cover | Картинки проектов: object-fit: cover
check: css:@media\s*\(\s*max-width | Адаптив: @media (max-width: …)
check: css:@media\s+print | Стили печати: @media print
check: css:attr\(href\) | На печати показывай адреса: attr(href)
check: css:\.no-print | Скрывай .no-print при печати
hint: `@media print { .no-print { display: none; } a::after { content: " (" attr(href) ")"; } }`
===
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Резюме</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .skills { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; }
    .skills li { padding: 4px 12px; border-radius: 999px; background: #ece9ff; }
    .projects { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .projects img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 10px; }
    @media (max-width: 600px) { .projects { grid-template-columns: 1fr; } }
    @media print {
      .no-print { display: none; }
      a::after { content: " (" attr(href) ")"; }
    }
  </style>
</head>
<body>
  <header>
    <img src="https://picsum.photos/120" alt="Фото Миши" width="120">
    <h1>Миша Иванов</h1>
    <p><a href="mailto:misha@example.com">misha@example.com</a> · <a href="https://github.com">GitHub</a></p>
    <button class="no-print">Скачать PDF</button>
  </header>
  <section>
    <h2>Навыки</h2>
    <ul class="skills"><li>Python</li><li>C++</li><li>Java</li><li>HTML/CSS</li><li>Алгоритмы</li></ul>
  </section>
  <section>
    <h2>Проекты</h2>
    <div class="projects">
      <article><img src="https://picsum.photos/300/200" alt="Скриншот телефонной книги"><h3>Телефонная книга</h3><a href="https://github.com">Код</a></article>
      <article><img src="https://picsum.photos/300/201" alt="Схема LRU-кэша"><h3>LRU-кэш</h3><a href="https://github.com">Код</a></article>
    </div>
  </section>
</body>
</html>
===
card: Как показать адреса ссылок при печати? :: `@media print { a::after { content: " (" attr(href) ")"; } }`
card: Что проверить перед публикацией страницы? :: alt у картинок, работа с клавиатуры (Tab), адаптив на телефоне, контраст, lang у html.
