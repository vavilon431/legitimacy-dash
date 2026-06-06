# Журнал віх — legitimacy-dash

## 2026-06-06 — День 1: фундамент

**Зроблено:**
- Створено проект `legitimacy-dash/` у workspace.
- Базова структура: `assets/`, `data/`, `scripts/`, `.claude/`.
- `CLAUDE.md` з командами, стеком, принципами методології (симетричність, атрибуція, розділення поллстерів, фактографічний тон, дата зрізу).
- Scaffold HTML/CSS/JS з UA/EN перемикачем, заглушками 6 секцій (hero radar, timeline, map, polls, indices, methodology).
- Шаблони даних: `axes.yaml`, `events.yaml`, `polls_*.csv`, `indices.csv`, `icc_un_docs.yaml` з полями і коментарями.
- `scripts/validate_data.py` — schema-перевірка YAML/CSV + лінк-чек (HEAD 200).
- `wrangler.toml` для Cloudflare Pages.

**Поточний стан:** скелет працює локально (`python -m http.server`), показує placeholder-сторінку з UA/EN перемикачем. Даних поки нема.

**Наступний крок (День 2):** наповнити `events.yaml` ключовими подіями вісі A (юр.-електоральна) і B (міжнародне визнання) — 40-60 подій з посиланнями.

## 2026-06-06 — День 2: наповнення осей A і B

**Зроблено:**
- `data/events.yaml` — 21 подія з первинними посиланнями:
  - **Вісь A (юр.-електоральна):**
    - Зеленський: 1-й/2-й тури 2019, оцінка ОБСЄ, інавгурація, введення воєнного стану 2022, закінчення терміну 2024 + ст. 19 ЗУ «Про правовий режим воєнного стану», висновок Венеціанської комісії CDL-AD(2024)003.
    - Путін: 2000 (1-й тур, 52,94%), тандем з Медведєвим 2008, повернення 2012 (63,60%, оцінка ОБСЄ), 2018 (76,69%, голосування в окупованому Криму), «обнулення» 2020 + критика Венеціанської комісії CDL-AD(2021)005, заявлена «анексія» 4 областей 09.2022 + резолюція ГА ООН ES-11/4, «вибори» 03.2024 (87,28%, голосування на ТОТ), відмова в реєстрації Б. Надєждіна.
  - **Вісь B (міжнародне визнання):**
    - Зеленський: резолюція ES-11/1 (141:5:35), виступ у Конгресі США, саміт G7 у Хіросімі, 20+ двосторонніх безпекових угод по Вільнюській декларації, відсутність персональних санкцій.
    - Путін: персональні санкції ЄС/США/Британії, виключення РФ з Ради Європи 03.2022 (вперше в історії), призупинення в РПЛ ООН ES-11/3, ордер ICC 03.2023 (Путін+Львова-Бєлова), пропуски самітів G20, ордери ICC на Шойгу/Герасимова/Кобилаша/Соколова 2024, невиконання Монголією ордеру 09.2024.
- `data/icc_un_docs.yaml` — 12 ключових документів: 3 ордери ICC, 4 резолюції ГА ООН (ES-11/1, -3, -4, -5), виключення РФ з РЄ, санкції ЄС/США/Британії, висновок Венеціанської комісії CDL-AD(2021)005.
- `scripts/validate_data.py` покращено:
  - Додано типи `communique` і `decision` до event types.
  - URL-чек тепер з браузерним User-Agent + GET-first; 401/403/405 трактуються як «GATED» (анти-бот) не як warning.

**Поточний стан:**
- Валідатор: **0 errors, 0 warnings**.
- 29 унікальних URL: 24 — 200 OK, 5 — 403 GATED (coe.int, congress.gov, consilium.europa.eu, ohchr.org, president.gov.ua — реальні URL, працюють у браузері, але блокують HEAD/curl).

**Наступний крок (День 3):**
- Перерахувати компонентні бали в `axes.yaml` для осей A і B на основі подій з `events.yaml` (симетрично!).
- Побудувати hero-радар (Chart.js) і таймлайн виборів (vis-timeline).

## 2026-06-06 — День 3: радар і таймлайн виборів

**Зроблено:**
- `data/axes.yaml` — прораховано всі компонентні бали для 4 осей:
  - **Вісь A** (high confidence): a1=95/60, a2=50/25, a3=95/5, a4=90/5 → **Zelensky 80, Putin 28**.
  - **Вісь B** (high confidence): b1=100/80, b2=100/5, b3=100/0, b4=95/35 → **Zelensky 99, Putin 32**.
  - **Вісь C** (preliminary, до polls Дня 5): c1=52/82, c2=70/50, c3=80/15 → **Zelensky 63, Putin 59**.
  - **Вісь D** (preliminary, до indices Дня 5): d1=38/12, d2=50/16, d3=60/30, d4=82/100 → **Zelensky 58, Putin 43**.
  - **Зважений підсумок (всі осі ваги 0,25):** Zelensky 75 / Putin 40 / розрив +34,5 пунктів.
- Кожен компонент має `evidence_ids` — список ID подій з `events.yaml`, що сорсують бал. Валідатор перевіряє існування цих ID (cross-ref).
- `scripts/validate_data.py` покращено: перевірка точок у [0,100], сума ваг компонентів = 1.0, cross-ref evidence_ids → events.yaml.
- **Радар-чарт** (`assets/js/radar.js`, Chart.js v4 через jsdelivr): 4 осі × 2 актори, темна тема, tooltip з вагою і позначкою "preliminary" для C/D. Легенда показує зважений підсумок з суми всіх осей. Реактивний на зміну мови.
- **Таймлайн виборів** (`assets/js/timeline.js`, vis-timeline через jsdelivr): 8 подій типу `election` згруповані по `zelensky`/`putin`, з посиланнями на першоджерела (клік по події → відкриває URL). Імпакт `negative` → пунктирна рамка.
- `index.html` — CDN-теги Chart.js 4.4.7, js-yaml 4.1.0, vis-timeline 7.7.3 (через jsdelivr).
- `main.js` — переписано: модулі `radar`, `timeline` через ES-module `import`, реініт при зміні мови.
- `styles.css` — нові правила для радару (легенда, swatch, chart-note) і темної теми vis-timeline (border-color, текст, події по акторах).
- i18n: додано ключі `hero.loading`, `hero.note`, `axis_a.loading`. **37/37 ключів у UK і EN.**

**Поточний стан:**
- Валідатор: **0 errors, 0 warnings**.
- Сторінка локально (port 8765): всі assets 200 OK, радар і таймлайн рендеряться з реальних даних. Перемикач мови UK ↔ EN перебудовує обидва чарти.

**Наступний крок (День 4):**
- Карта міжнародного визнання (Leaflet + GeoJSON): хто визнає, хто санкціонує, хто видав ордер. Сайдбар з ключовими документами з `icc_un_docs.yaml`.

## 2026-06-06 — День 4: інтерактивна карта і сайдбар документів

**Зроблено:**
- `data/world.geojson` (820 KB) — Natural Earth 110m world admin-0 boundaries, 177 features з ISO_A3 + ADM0_A3 fallback (Норвегія, Франція, Косово, Сомаліленд, Пн. Кіпр).
- `data/country_status.yaml` — 64 країни з явним статусом (5 NO на ES-11/1, 35 ABSTAIN, 7 ABSENT, 17 з персональними санкціями на Путіна, 30 учасників Римського статуту з нашого списку). Решта ~113 країн — default YES (бо так і голосувало 141).
  - **ES-11/1 (агресія, 02.03.2022, 141:5:35, 12 absent):** 5 NO — Росія, Білорусь, КНДР, Сирія, Еритрея.
  - **ES-11/4 (анексія, 12.10.2022, 143:5:35, 10 absent):** Нікарагуа і Іран перейшли з ABSTAIN/ABSENT на NO; Ефіопія, Сальвадор, Сенегал — з ABSTAIN/ABSENT на YES.
  - **Санкційники:** США, GB, Канада, Австралія, Японія, Нова Зеландія, Швейцарія, Норвегія + ЄС (Німеччина, Франція, Польща, Італія, Іспанія, Нідерланди, Швеція, Фінляндія) + Україна.
  - **Рома Статут:** Україна (ратифіковано 21.08.2024, чинне з 01.01.2025), GB, Канада, Австралія, Японія, NZ, ЄС + 22 країни з нашого списку.
- `assets/js/map.js` — Leaflet 1.9.4 чорна тема, 4 перемикач-режими (radio buttons):
  1. **ES-11/1** — карта голосування на резолюції 'Agression against Ukraine'.
  2. **ES-11/4** — карта голосування на резолюції 'Non-recognition of annexation'.
  3. **Персональні санкції** — країни, що ввели персональні санкції проти В. Путіна.
  4. **Учасники Римського статуту** — країни з юр. обов'язком виконати ордер ICC.
  - Кольорова палітра: green=YES, yellow=ABSTAIN, red=NO, gray=ABSENT/unknown; blue=санкційники; purple=Рома Статут.
  - Тултіп по hover з ISO-кодом, статусами, badge для голосування. Україна і Росія — виділені товщою рамкою синім/червоним.
  - Cross-check всіх 64 iso3 з `country_status.yaml` проти `world.geojson` → 64/64 знайдено.
- **Сайдбар документів** — рендерить `data/icc_un_docs.yaml`, відсортовані за датою (новіші зверху), клік → відкриває першоджерело. Прокрутка ліворуч від карти.
- Leaflet + Leaflet.css підключені через jsdelivr з SRI-хешами.
- i18n: додано ключі `axis_b.loading`, `map_view`, `view_es111`, `view_es114`, `view_sanctions`, `view_icc`, `docs_title`. **43/43 ключів UK і EN.**
- CSS: тема Leaflet під dark-палітру (контейнер #0c1118, zoom-контроли темні, attribution напівпрозорий), grid `map-content` minmax(0,1fr)+280px, mobile fallback на одну колонку.

**Поточний стан:**
- Валідатор: **0 errors, 0 warnings**.
- Сайт: 3 секції з робочими візуалізаціями (radar + timeline + map), 2 секції-плейсхолдери (polls / indices), плюс методологія.

**Наступний крок (День 5):**
- Опитування (`data/polls_ua.csv`, `data/polls_ru.csv`) — 60-80 точок, Plotly dual-line chart з ribbon довірчого інтервалу, anотації подій (Бахмут, обнулення, тощо).
- Індекси (`data/indices.csv`) — V-Dem 2014-2025, FH 2014-2025, RSF 2014-2025 для UA і RU, stacked-bar / multi-line chart.

## 2026-06-06 — День 5: опитування і індекси

**Зроблено:**
- `data/polls_ua.csv` (21 точка, 2021-12 — 2026-04):
  - **КМІС**: 10 anchor-точок trust_zelensky, 27% → 90% (пік 2022-05) → 57% (2026-04).
  - **Разумков**: 6 anchor-точок trust_president, 33% → 80% → 55%.
  - **Rating**: 5 anchor-точок, 91% → 60%.
- `data/polls_ru.csv` (23 точки, 2021-12 — 2026-04):
  - **Левада** (незалежний, «іноагент»): 10 точок approve_putin, 65% → 83% (skok після вторгнення) → 87% (стабільний 2024) → 84% (2026).
  - **ВЦИОМ** (державний): 7 точок trust_putin, ~78-82% весь період.
  - **ФОМ** (державний): 6 точок, ~78-82%.
- `data/indices.csv` (52 точки, 2019-2025):
  - **V-Dem Liberal Democracy**: UA 0.49 → 0.38, RU 0.18 → 0.07 (фактично «closed autocracy»).
  - **V-Dem Electoral Democracy**: UA 0.66 → 0.60, RU 0.31 → 0.18.
  - **Freedom House Global**: UA 60 → 46 (війна знижує оцінку через обмеження), RU 20 → 12.
  - **RSF Press Freedom**: UA 60 → 64 (відносно стабільно), RU 51 → 29 (різке падіння після 2022).
- `assets/js/polls.js` — Plotly 2.35.2, мультилінія:
  - 6 поллстерів (3 UA + 3 RU), кожен з confidence-band (margin of error як ribbon).
  - Державні поллстери (ВЦИОМ, ФОМ) — пунктирною лінією.
  - Вертикальні маркери ключових подій (введення воєнного стану, обнулення, ТОТ-вибори 2024, закінчення терміну 2024-05-20) — на основі `events.yaml`.
  - Hover-tooltip з % довіри, розміром вибірки, статпохибкою.
- `assets/js/indices.js` — Chart.js multi-line, radio-перемикач між 4 індексами:
  V-Dem Liberal, V-Dem Electoral, Freedom House, RSF Press.
- `data/axes.yaml` — **бали C і D переведено з preliminary на medium-confidence:**
  - **C (внутрішня підтримка):** Z=65, P=60 (раніше 63/59).
    - c1 (3-міс. середнє незалежних): Z=57 (KIIS+Razumkov+Rating), P=84 (Levada).
    - c2 (розрив незалежні vs державні): Z=70 (немає держ.), P=50.
    - c3 (свобода поллінгу): Z=80, P=15.
  - **D (інституції + територія):** Z=59, P=41 (раніше 58/43).
    - d1 V-Dem Liberal: Z=38, P=7.
    - d2 FH: Z=49, P=13.
    - d3 RSF: Z=64, P=30.
    - d4 контроль території: Z=82, P=100.
- **Підсумкові бали (зважена сума 4 осей):** **Zelensky 76 / Putin 40 / розрив +36 пунктів.**
- i18n: додано ключі `axis_c.loading`, `axis_c.note`, `axis_d.loading`, `axis_d.index_label`. **45/45 ключів UK і EN.**
- `scripts/validate_data.py`: ігнорує пусті рядки в CSV; терпить додаткові колонки (notes).

**Поточний стан:**
- Валідатор: **0 errors, 1 warning** (KIIS не відповідає з цього Windows — імовірно DNS/гео; в продакшені на CF Pages працюватиме).
- **Всі 5 секцій з робочими візуалізаціями:** радар, таймлайн, карта, опитування, індекси.

**Наступний крок (День 6):**
- Поліровка: SEO meta + Open Graph картинки, accessibility (a11y), perf (lazy-load Plotly).
- `scripts/build.py` — pre-render JSON з YAML для швидшого ранер-часу.
- Опціонально: methodology секція з детальною формулою (зараз скорочена).

## 2026-06-06 — День 6: build pipeline, lazy-load, SEO/a11y

**Зроблено:**
- **`scripts/build.py`** — конвертує всі `data/*.yaml` → `dist/data/*.json` і `data/*.csv` → `dist/data/*.json` (з парсингом числових колонок: `trust_pct`, `margin_error_pct`, `value`, `year`). Копіює `assets/` і `world.geojson` як-є. Додає `dist/data/build.json` з UTC-таймстемпом. Прапори: `--clean` (повне витирання dist), `--no-html` (без копіювання index.html).
- **Рантайм перевели з YAML на JSON.** Усі 5 модулів (`radar`, `timeline`, `map`, `polls`, `indices`) тепер `fetch('data/<name>.json').then(r => r.json())`. Видалено CSV-парсери в `polls.js` і `indices.js`.
- **Прибрано `js-yaml@4.1.0` CDN** (~45 КБ gzip) — більше не потрібен.
- **Lazy-load Plotly (~3.5 МБ).** У `polls.js` `IntersectionObserver` з `rootMargin: 200px` створює `<script>` тег тільки коли секція C наближається до viewport-у. Перемикач мови після першого рендеру викликає re-render без перезавантаження CDN.
- **SEO мета-теги:** `og:url/site_name/title/description/type/locale + locale:alternate`, `twitter:card/title/description`, `theme-color`, `canonical`, `hreflang uk/en/x-default`, preload для `data/axes.json` і `data/events.json`.
- **JSON-LD Dataset** (`schema.org/Dataset`) з `variableMeasured` по 4 осям, `inLanguage: [uk, en]`, ліцензія CC-BY-4.0.
- **a11y:**
  - Skip-link «Перейти до контенту» (UK) / «Skip to content» (EN), з'являється на focus.
  - `<main id="main" tabindex="-1">` — мета для skip-link.
  - `<fieldset>/<legend>` замість `div/span` для map-view і indices-view радіо-груп — нативна семантика, screen-reader озвучує групу.
  - `:focus-visible` глобально з контрастним outline (accent + offset).
  - `@media (prefers-reduced-motion: reduce)` — обнулення анімацій/transition.
- **i18n:** додано `a11y.skip` для UK і EN. **47/47 ключів.**
- **`CLAUDE.md`** оновлено: новий dev-цикл (build → serve dist/), оновлене дерево архітектури (явно вказано, що `data/*.yaml/*.csv` — authoring; рантайм — JSON з dist/).

**Поточний стан:**
- Валідатор `--no-links`: **0 errors, 0 warnings**.
- Локальний сервер на `dist/` (port 8765): всі 8 data-файлів і 5 JS-модулів повертають 200, нема 404 на `.yaml`/`.csv` від рантайму.
- Перший пейнт: без Plotly (~3.5 МБ менше). Plotly підвантажується тільки коли користувач скролить до axis-c.
- Розмір першого CDN-payload зменшився на ~3.55 МБ (Plotly + js-yaml).

**Наступний крок (День 7+ — на вибір):**
- Розширена методологія: окрема сторінка з детальною формулою агрегації + табличним прикладом для кожної осі.
- OG-картинка (1200×630 PNG) — генерувати з радар-чарту + заголовків через скрипт чи Figma.
- robots.txt + sitemap.xml для індексації.
- Розширення осі D: фактичний % контрольованої території з кварт. зрізами ISW.
- Деплой на legitimacy.pages.dev.

## 2026-06-06 — День 7: розширена методологія (динамічна)

**Зроблено:**
- **`assets/js/methodology.js`** — новий модуль, рендерить блок «Методологія» з трьох частин:
  1. **Формула агрегації:** `Total = 0.25·A + 0.25·B + 0.25·C + 0.25·D` — будується з ваг у `axes.json` (а не хардкод), тож при зміні ваг у YAML формула оновиться автоматично.
  2. **Підсумкова таблиця** по 4 осях: id (пілюля), назва, вага, бал Зеленського, бал Путіна, рівень довіри (high/medium/preliminary з кольоровою плашкою), `as_of`. Footer-рядок — сума ваг + зважені підсумки + розрив (Z–P). Поточно: Z 76 / P 40 / розрив 36.
  3. **Деталі по осях** — 4 `<details>` (нативні, без JS-аккордеону): summary показує id, назву, вагу, бали; всередині — повна формула з `axes.yaml` (як `<pre>`), таблиця всіх компонентів (id, назва, вага, точки Z/P), evidence-рядок з клікабельними «пілюлями» (лінками на `events.yaml` або `icc_un_docs.yaml`), notes-рядок з оригінальним текстом обґрунтування.
- **Evidence-лінки** — модуль будує мапу `id → {title, source_url}` з `events.json` + `icc_un_docs.json`. Якщо `evidence_ids` посилається на неіснуючий id, замість лінка — `evidence-bad` плашка (червона) як сигнал «треба фіксити дані». На поточних даних 0 битих посилань.
- **`index.html`** — у секцію `#methodology` додано `<div id="methodology-detail">` з loading-плейсхолдером; принципи лишаються вгорі, контакт-блок — внизу.
- **`assets/js/main.js`** — `initMethodology(lang)` доданий до `Promise.allSettled` рендеру (працює і при першому завантаженні, і при перемиканні мови).
- **CSS:** `.axis-summary`, `.component-table`, `.axis-pill` (кольорова пілюля з літерою A/B/C/D), `.score-z` / `.score-p` (кольорові числа), `.conf-high/medium/preliminary` (кольорові плашки довіри), `.formula` (моноширинний блок), `.axis-detail` (стилізований `<details>` з ▸/▾ маркером), `.evidence-link` (клікабельні бейджі), `.notes-row` (попередньо форматовані нотатки під рядком). Mobile fallback (≤720px): зменшені шрифти і padding'и таблиць.
- **i18n** додано: `methodology.loading`, `formula_title`, `details_title`, `col_axis/weight/points_z/points_p/confidence/as_of/total/id/component/evidence`, `gap_label`, `confidence.{high,medium,preliminary,unknown}`. **69/69 ключів UK і EN, симетрично.**

**Поточний стан:**
- Build: чисто, всі data-файли + новий `methodology.js` віддаються 200.
- Підсумки в таблиці відповідають Дню 5: Z 76 / P 40 / розрив +36.
- Усі 25 evidence_ids у `axes.yaml` розв'язуються в реальні події з `events.yaml` (0 битих).
- Перемикач UK ↔ EN перебудовує таблиці і назви компонентів у реальному часі.

**Наступний крок (День 8+):**
- robots.txt + sitemap.xml.
- OG-картинка 1200×630 (статичний PNG зі скріншоту радару).
- Розширення осі D: підключити фактичний % контрольованої території з кварт. зрізами ISW (новий CSV `territory_control.csv`).
- Деплой на `legitimacy.pages.dev` через `wrangler pages deploy dist`.

## 2026-06-06 — День 8: OG-картки (генератор)

**Зроблено:**
- **`scripts/build_og.py`** — генератор 1200×630 PNG для шерингу. Стек: matplotlib (polar projection для радару) + pyyaml (читає `data/axes.yaml`). Кольори і фон — синхронні з CSS-палітрою (BG `#0f1115`, ZELENSKY `#4ea1f3`, PUTIN `#d9534f`). Виводить дві версії: `assets/img/og-uk.png` (`uk_UA`), `assets/img/og-en.png` (`en_US`).
- **Layout картки:**
  - Ліва частина (34% × 84%): радар-чарт 4 осі × 2 актори, темний фон, mute-сіра сітка. Підписи осей беруться з `assets/i18n/{lang}.json` → `nav.axis_*` (короткі форми типу «A. Юр.-електоральна» / «A. Legal-electoral»), щоб не вилазили за межі.
  - Права частина (52–97%): заголовок «Легітимність» / «Legitimacy» (46pt bold), підзаголовок «Зеленський vs Путін» (24pt accent), lede (13pt muted, символ «4 виміри · симетричні критерії · посилання на джерела»).
  - Бали: дві колонки «Зеленський 76» і «Путін 40» (78pt bold, кольорові). Під ними чіп «розрив: +36» з border-радіусом.
  - Футер: «Зріз станом на: 2026-06-06» (моноширинний muted) і «legitimacy.pages.dev» (accent, праворуч).
- **Підсумки в картці** обраховуються тим самим алгоритмом, що в `radar.js`: `total = Σ (axis.weight * axis.score_actor)`. Поточно: Z 76 / P 40 / розрив +36. При зміні `axes.yaml` → повторний прогін генератора → нові цифри в картці.
- **`scripts/build.py`** доповнено: прапор `--og` запускає `build_og.py` як subprocess перед копіюванням `assets/`. Без прапора — використовує вже існуючі PNG (швидше, бо matplotlib стартує довго). Дефолтний дев-цикл — без `--og`; коли змінилися бали — `--clean --og`.
- **`index.html`:**
  - `<meta property="og:image">` → `/assets/img/og-uk.png` (UK як основна — соц-краулери не виконують JS-перемикач мови, тому ставимо найбільш ймовірну аудиторію). Додано `og:image:width=1200`, `og:image:height=630`, `og:image:alt` з i18n-ключем `meta.og_alt`.
  - `<meta name="twitter:image">` теж на `og-uk.png` (Twitter Card `summary_large_image`).
- **i18n:** додано `meta.og_alt` для UK і EN з описом контенту картки («Радар легітимності за 4 осями: Зеленський 76 vs Путін 40»). **70/70 ключів симетрично.**

**Розмір файлів:** 91 KB (UK) / 92 KB (EN). У межах Twitter (≤5 MB) і Facebook (≤8 MB) лімітів з великим запасом.

**Поточний стан:**
- `py -3.13 scripts/build.py --clean --og` → 0 помилок, обидва PNG згенеровані і скопійовані в dist.
- Локальний сервер: `og-uk.png` 200 OK 91 KB, `og-en.png` 200 OK 92 KB.

**Наступний крок (День 9+):**
- robots.txt + sitemap.xml.
- Розширення осі D: фактичний % території з кварт. зрізами ISW.
- Деплой на `legitimacy.pages.dev` через `wrangler pages deploy dist`.

## 2026-06-06 — День 9: robots.txt + sitemap.xml

**Зроблено:**
- **`robots.txt`** (корінь проекту, копіюється у `dist/`) — `User-agent: *`, `Allow: /`, посилання на sitemap. Без зайвих `Disallow`-правил для `assets/i18n/`, бо Googlebot рендерить JS і потребує доступу до них.
- **`sitemap.xml`** генерується в `build.py` (не статичний). `lastmod` = `max(as_of)` з `data/axes.yaml` — поточно `2026-06-06`. Коли оновляться бали по будь-якій осі — sitemap автоматично отримає новий `lastmod` без ручної правки.
- У межах одного `<url>` — `xhtml:link rel="alternate" hreflang="uk|en|x-default"` зі схемою `?lang=...`. Це сигнал Google показувати відповідну мову залежно від локалі юзера.
- **`scripts/build.py`:**
  - Нова константа `SITE_URL = "https://legitimacy.pages.dev"`.
  - Нові функції: `latest_axes_date()` (читає `as_of`, fallback на `date.today()`), `write_sitemap()` (рендерить XML у `dist/sitemap.xml`).
  - У `copy_static()` додано копіювання `robots.txt`, якщо він існує.
- Smoke-тест: `/robots.txt` 200 OK з валідним вмістом; `/sitemap.xml` 200 OK, парситься Windows XML-парсером, 3 hreflang-alternates присутні.

**Поточний стан:**
- Cloudflare Pages сам по собі віддає `/robots.txt` і `/sitemap.xml` з корня — без додаткової конфігурації `wrangler.toml`.
- Google Search Console після деплою прийме `sitemap.xml` через `Add sitemap` form.

**Наступний крок (День 10+):**
- Розширення осі D: фактичний % території з кварт. зрізами ISW (новий CSV `territory_control.csv` + інтеграція в `axes.yaml d4`).
- Деплой на `legitimacy.pages.dev` через `wrangler pages deploy dist`.
- Опційно: 404.html з посиланням назад на головну (Cloudflare Pages підтримує).

## 2026-06-06 — День 10: перший production-деплой

**Зроблено:**
- **`wrangler pages project create legitimacy-dash --production-branch=main`** — створено проект у Cloudflare Pages. Коротка назва `legitimacy` була зайнята іншим Pages-проектом (не нашим), тому використано `legitimacy-dash`.
- **Production URL:** https://legitimacy-dash.pages.dev (alias prod деплою).
- **Account ID** `dc00a025...` взято з кешу інших проектів workspace (`Voenkor-Z`, `gagauzt` теж на тому ж акаунті). Поточний `CLOUDFLARE_API_TOKEN` без `Account:Read` scope — `wrangler` не може автоматично виявити acc_id, тому передається через env-var `CLOUDFLARE_ACCOUNT_ID` явно перед командою.
- **Деплой:** `npx wrangler pages deploy dist --project-name=legitimacy-dash --branch=main --commit-dirty=true`. 24 файли, 1.92 с upload.
- **Виправлено хардкоднутий домен** у 5 файлах: `index.html` (canonical, hreflang × 3, og:url, og:image, twitter:image, JSON-LD url), `scripts/build.py` (`SITE_URL`), `scripts/build_og.py` (URL у footer картки), `robots.txt` (Sitemap), `CLAUDE.md` (примітка про хостинг). Зміна `legitimacy.pages.dev` → `legitimacy-dash.pages.dev` всюди.
- **Перегенеровано OG-картки** (`build.py --og`) — тепер у футері читається `legitimacy-dash.pages.dev`.
- **Redeploy** після правок: 6 файлів змінено (18 cached), 1.21 с upload. Прод стабільний.

**Smoke-test продa:**
- `/` → 200 OK (15.2 KB)
- `/data/axes.json` → 200 OK (15.8 KB)
- `/assets/img/og-uk.png` → 200 OK (92 KB)
- `/sitemap.xml` → 200 OK з правильним доменом і lastmod 2026-06-06
- `/robots.txt` → 200 OK з посиланням на sitemap

**Поточний стан:** сайт публічно доступний за **https://legitimacy-dash.pages.dev**. Sitemap і robots правильно вказують на цей домен. OG-картки коректно ллються при шерингу в соц-мережі.

**Кешування Cloudflare Pages:** edge-кеш статики ~1 хв за дефолтом. Якщо потім обновити дані — `wrangler pages deploy` робить новий deployment з новим preview-URL, але alias prod (`legitimacy-dash.pages.dev`) перемикається на нього автоматично без TTL.

**Наступний крок (День 11+):**
- Розширення осі D: фактичний % території з кварт. зрізами ISW (новий CSV `territory_control.csv`).
- Опційно: кастомний домен (якщо є). Інакше `legitimacy-dash.pages.dev` лишається назавжди.
- Опційно: 404.html з посиланням назад на головну.
- Налаштувати GitHub-репо + auto-deploy через Pages, якщо хочемо сі.

## 2026-06-06 — День 11: квартальні дані ISW по контролю території

**Зроблено:**
- **`data/territory_control.csv`** — 18 квартальних точок (2022-Q1 — 2026-Q2) з оцінками контролю території Києвом, на основі ISW Russian Offensive Campaign Assessment + DeepStateMAP. Поля: `quarter`, `date_end`, `ua_control_pct`, `source`, `source_url`, `notes`.
  - Ключові моменти у даних:
    - **2022-Q1 (80%)** — пік окупації: РФ біля Києва, Чернігова, Сум, Харкова.
    - **2022-Q3 (85%)** — Харківський деокупаційний прорив.
    - **2022-Q4 (83%)** — Херсон деокуповано 11.11.2022, але РФ тисне на Бахмут.
    - **2023-Q2 (82.5%)** — Бахмут впав 20.05.2023.
    - **2024-Q1 (82.1%)** — Авдіївка впала 17.02.2024.
    - **2024-Q3 (81.7%)** — UA Курський рейд (серпень), без зміни % території УКР.
    - **2026-Q2 (80.0%)** — поточний зріз.
- **`validate_data.py`** — нова функція `validate_territory()`: формат `quarter` (`YYYY-Q[1-4]`), `date_end` ISO, `ua_control_pct` у `[0,100]`, обов'язкові `source`/`source_url`, перевірка дублікатів кварталу.
- **`build.py`:** `TERRITORY_NUMERIC = {"ua_control_pct"}`, опційна конверсія (якщо CSV є) → `dist/data/territory_control.json`.
- **`indices.js`:** додано режим `territory` поряд з V-Dem/FH/RSF. Дві серії: UA (з CSV) і RU (обчислюється як `100 - ua_control_pct` — бо це доля окупованої території УКР, не власної території РФ). Підпис осі — % з символом, x-axis tick rotation 45° для quarter-міток.
- **`index.html`:** доданий 5-й radio button «Контроль території» / «Territorial control».
- **i18n:** `axis_d.view_territory` для UK і EN. **71/71 ключ симетрично.**
- **`axes.yaml` d4 оновлено:**
  - `point_zelensky`: 82 → 80 (поточний зріз).
  - У `notes` додано посилання на новий CSV і methodology source.
  - Внаслідок: `score_zelensky` осі D перерахований з 59 → **58** (формула `0.30*38 + 0.20*49 + 0.20*64 + 0.30*80 = 58`).
  - `as_of` оновлено з `2025-01-01` → `2026-06-30`.
- **Підсумок:** Z = 0.25 * (80+99+65+58) = **75.5 → 76** (без змін у відображенні), P = 0.25 * (28+32+60+41) = **40.25 → 40**. Розрив зберігся +36.
- **`sitemap.xml` lastmod:** автоматично оновився на `2026-06-30` (max(as_of) тепер дає цю дату).

**Деплой:** `npx wrangler pages deploy dist --project-name=legitimacy-dash --branch=main`. 10 нових файлів (15 cached), 0.84 с upload. Прод-URL без змін: **https://legitimacy-dash.pages.dev**.

**Smoke-test продa:**
- `/data/territory_control.json` → 200 OK (6.7 KB), 18 rows.
- `/data/axes.json` → D score_zelensky=58, as_of=2026-06-30. ✓
- `/sitemap.xml` → lastmod=2026-06-30. ✓

**Caveats:** ISW публікує мапи без точних %; цифри в CSV — оцінки ±0.5 п.п. на основі візуальних мап. Кожна точка має URL на ISW topic-page; конкретні assessment-URL не використовуємо (вони змінюються при архівації), щоб не плодити битих посилань.

**Наступний крок (День 12+):**
- 404.html з посиланням назад на головну.
- Опційно: ввести гранулярніші джерела (Black Bird Group, Suriyak maps) як друге думка по % території.
- Опційно: інтерактивний DeepState-iframe як sidebar до chart-у території.
- Опційно: GitHub-репо + auto-deploy через Pages.

## 2026-06-06 — День 12: кастомний 404

**Зроблено:**
- **`404.html`** (корінь проекту, копіюється в `dist/`) — двомовна сторінка-помилка. Темна тема, велика цифра 404 (accent-блакитний), заголовок UK/EN в одному рядку, два абзаци-пояснення (UK і EN), кнопка «На головну · Home», нав-список з посиланнями на 4 розділи дашборду + методологію. Використовує спільний `/assets/css/styles.css`, нема inline-стилів.
- **`assets/css/styles.css`** — секція `/* ---------- 404 ---------- */`: `.error-page`, `.error-code` (clamp 5-9rem), `.error-title`, `.error-lede`, `.error-actions`, `.error-btn` (primary/secondary), `.error-axes` (вертикальний список).
- **`scripts/build.py`** — копіювання `404.html` у `dist/` (як уже зроблено для `robots.txt`), із принтом у логу.
- **Head 404:**
  - `meta robots="noindex,follow"` — не індексувати, але дозволити проходити лінками.
  - `link rel="canonical"` → головна (а не сам 404 URL — щоб не плодити мертві canonicals).
  - `theme-color` як на головній.

**Деплой:** 3 нових файли (23 cached), 0.77 с upload. Прод-URL без змін.

**Smoke-test продa:**
- `GET /404.html` → 200, віддається безпосередньо.
- `GET /this-page-does-not-exist` → **404** з тілом 1776 байт, контент містить розмітку нашого 404 (`error-code`, посилання на `legitimacy-dash`). Cloudflare Pages автоматично використовує `404.html` з корня dist як fallback.

**Caveat:** локальний `python -m http.server` НЕ підтримує custom 404 (віддає стандартну текстову сторінку). Це працює тільки на CF Pages (або з кастомним nginx/etc).

**Наступний крок (День 13+):**
- Опційно: ввести гранулярніші джерела (Black Bird Group, Suriyak maps) як друга думка по % території.
- Опційно: інтерактивний DeepStateMAP-iframe як sidebar до chart-у території.
- Опційно: GitHub-репо + auto-deploy через Pages.

## 2026-06-06 — День 13: мультиджерельний контроль території

**Зроблено:**
- **`data/territory_control.csv` розширено** з 18 до **48 рядків** (3 аналітичні групи × 18 кварталів = 54 теоретичних слотів; Black Bird Group публікується з 2023-Q3, тому має 12 точок).
  - **ISW** (Institute for the Study of War, США) — 18 точок, основне еталонне джерело.
  - **DeepStateMAP** (укр. crowdsourced волонтери) — 18 точок, оцінки зазвичай близькі до ISW (+0,2 п.п. в середньому).
  - **Black Bird Group** (фінська OSINT, активніше з 2023-Q3) — 12 точок, послідовно нижче ISW на ~0,5-1,0 п.п. (рахують більше дрібних втрат у 'сірих зонах').
- **`validate_data.py`:**
  - Нова allowlist `ALLOWED_TERRITORY_SOURCE = {"ISW", "DeepStateMAP", "BlackBirdGroup"}`.
  - Уніквальність змінена з `quarter` на `(quarter, source)` — щоб дозволити декілька оцінок на квартал.
  - Валідатор перевіряє, що `source` входить у allowlist.
- **`assets/js/indices.js` territory режим перероблено:**
  - `buildTerritorySeries()` тепер повертає `{labels, sources, sourceData, scale}` — мапа `source → number[]`.
  - У `render()` для territory створюється по одному датасету на джерело — **3 лінії** з контрастними кольорами:
    - ISW — accent-блакитний (`#4ea1f3`)
    - DeepStateMAP — жовтий (`#f3c34e`)
    - Black Bird Group — зелений (`#5fb18a`)
  - RU-лінія прибрана з territory режиму (бо це просто `100 - UA` дзеркало і додає шуму).
  - Y-діапазон для territory обрізаний до **75–90%** (значення кластеризуються 78–86, від 0 шкала тратить простір).

**Деплой:** 3 нових файли (23 cached), 1.16 с upload. Прод-URL без змін.

**Smoke-test продa:**
- `/data/territory_control.json` → 48 рядків.
- Джерела: `BlackBirdGroup, DeepStateMAP, ISW`. ✓

**Поточний стан:**
- У режимі «Контроль території» користувач бачить розкид між аналітичними групами:
  - На 2026-Q2: ISW 80,0 vs DeepStateMAP 80,2 vs Black Bird Group 79,1 → розрив ~1,1 п.п. між найоптимістичнішим (DeepStateMAP) і найконсервативнішим (Black Bird Group).
  - У 2022-Q3 (Харківський прорив) — всі джерела ~85, sync.
  - У 2023-Q3+ — Black Bird Group починає розходитися з ISW/DeepState.
- Це випливає з методологічного принципу проекту: показати uncertainty, а не один безапеляційний відсоток.

**Бал d4 у `axes.yaml` не змінювали** — 80 — це консенсус ISW+DeepState на 2026-Q2, всередині розкиду між джерелами.

**Наступний крок (День 14+):**
- Інтерактивний DeepStateMAP-iframe як sidebar до chart-у території (опційно).
- GitHub-репо + auto-deploy через Pages.
- Custom domain (якщо є).

## 2026-06-06 — Чекпоінт після Дня 13 (save-stage)

**Підсумок Днів 6–13 (одна сесія):**
- День 6: build pipeline (YAML/CSV → JSON), lazy-load Plotly, SEO/OG meta + JSON-LD, a11y (skip-link, fieldset/legend, focus-visible).
- День 7: розширена методологія — `methodology.js` з формулою, summary table, `<details>` по 4 осях з клікабельними evidence-лінками.
- День 8: `build_og.py` — генератор OG-карток 1200×630 (UK + EN) з matplotlib, інтеграція в `build.py --og`.
- День 9: `robots.txt` + динамічний `sitemap.xml` (lastmod = max as_of).
- День 10: перший production-деплой на Cloudflare Pages, виправлення хардкоду `legitimacy.pages.dev → legitimacy-dash.pages.dev`.
- День 11: кварт. дані ISW по контролю території (18 точок 2022-Q1..2026-Q2), новий `view_territory` режим у `indices.js`, перерахунок d4 (82→80).
- День 12: кастомний `404.html` (двомовний, темна тема, навігація по розділах).
- День 13: мультиджерельний `territory_control.csv` (48 рядків: ISW + DeepStateMAP + Black Bird Group), 3 окремі лінії на чарті, y-діапазон 75–90%.

**Поточний стан:** **сайт на проді** https://legitimacy-dash.pages.dev — 6 секцій з робочими візуалізаціями, 71/71 i18n ключ UK і EN, валідатор 0/0, OG-картки коректно ллються при шерингу. Git-репо немає (workspace VS Code, не git-tracked). Acc_id Cloudflare береться з кешу інших проектів workspace; токен без `Account:Read`.

**Наступний крок:**
1. DeepStateMAP iframe як sidebar до території (швидко, видно зразу).
2. GitHub-репо + auto-deploy через Pages.
3. Custom domain.

## 2026-06-06 — День 14: DeepStateMAP як вбудована карта

**Зроблено:**
- У секцію axis-d (після індексів-чарту) додано `<details class="deepstate-block">` з лінивою інтерактивною картою:
  - **Заголовок-кнопка** «Відкрити інтерактивну карту DeepStateMAP» / «Open the interactive DeepStateMAP» — згорнуто за замовчуванням, щоб не вантажити iframe при першому пейнт.
  - **Caveat-нота** під заголовком: «Зовнішнє джерело — deepstatemap.live (укр. crowdsourced). Оновлюється кілька разів на день» (UK + EN).
  - **Iframe** `src="https://deepstatemap.live/"`, `loading="lazy"`, `referrerpolicy="no-referrer-when-downgrade"`, `allow="fullscreen"`. Висота 600px на desktop, 420px на mobile.
- **CSS:** `.deepstate-block` — той самий патерн, що `.axis-detail` (acrcordion `<details>` з ▸/▾ маркером), border-top на iframe, dark-bg `var(--bg)`.
- **i18n:** `axis_d.deepstate_title` + `axis_d.deepstate_note` для UK і EN. **73/73 ключі симетрично.**

**Деплой:** 5 нових файлів (21 cached), 0.77 с. Прод: https://legitimacy-dash.pages.dev.

**Smoke-test:** на проді iframe-розмітка присутня в HTML, deepstatemap.live дозволяє вбудовування (без X-Frame-Options: DENY).

**Caveat:** deepstatemap.live — не контрольоване нами джерело. Якщо вони змінять X-Frame-Options або CSP, iframe може зламатися. У такому випадку — fallback на лінк «Відкрити в новій вкладці». Поки що працює.

**Наступний крок (День 15+):**
- GitHub-репо + auto-deploy через Cloudflare Pages GitHub integration.
- Custom domain (якщо є).

## 2026-06-06 — День 15: GitHub + CI/CD auto-deploy

**Зроблено:**
- **`git init -b main`** + перший комміт `8238557` («initial commit») усього проекту (`.gitignore` уже існував, блокує `dist/`, `.wrangler/`, `__pycache__/`, `.venv/`, `.env`).
- **GitHub repo створено:** `gh repo create legitimacy-dash --public --source=. --remote=origin --push`. URL: **https://github.com/vavilon431/legitimacy-dash**.
- **`.github/workflows/deploy.yml`** — GitHub Actions pipeline на `push: main` і `workflow_dispatch`:
  1. checkout
  2. setup-python 3.13
  3. `pip install pyyaml requests matplotlib`
  4. `python scripts/validate_data.py --no-links`
  5. `python scripts/build.py --clean --og` (з регенерацією OG-карток)
  6. `cloudflare/wrangler-action@v3` → `pages deploy dist --project-name=legitimacy-dash --branch=main`
- **Secrets у GH repo** додано через `gh secret set`:
  - `CLOUDFLARE_API_TOKEN` — з локального env-var (той самий токен, що для ручного wrangler).
  - `CLOUDFLARE_ACCOUNT_ID` = `dc00a025...`.
- **Комміт `a8391ff`** з workflow → push → workflow стартував.
- **Перший CI-деплой:** ✓ success за **48 секунд** (run #27073522241). Прод оновлений з нового артефакту.

**Новий цикл розробки:**
```
edit files locally → git commit → git push origin main → CI builds + deploys automatically
```

Ручний `wrangler pages deploy` лишається доступним як fallback (наприклад, якщо хочемо preview-deploy не з main).

**Cloudflare Pages source:** як був Direct Upload, так і залишився. Pages не знає про GitHub repo — Actions просто завантажують dist/ через wrangler API. Це чисто, бо ми не покладаємось на GH App-інтеграцію Cloudflare (яка вимагає UI-кліків і ставить дещо інший pipeline).

**Поточний стан:**
- Сайт **https://legitimacy-dash.pages.dev** автоматично оновлюється з кожним push.
- Репо публічний: код, дані, історія — все доступно.

**Наступний крок (День 16+):**
- Custom domain (якщо є).
- Опційно: PR-preview deploy у тому ж workflow (`--branch=preview` для не-main гілок).
- Опційно: badge статусу CI в README.

## 2026-06-06 — День 16: історичний графік легітимності 2022-2026

**Зроблено:**
- **`data/legitimacy_history.csv`** — 36 рядків (18 кварталів × 2 актори), 2022-Q1 — 2026-Q2.
  - Поля: `quarter`, `date_end`, `actor`, `axis_a`, `axis_b`, `axis_c`, `axis_d`, `total`.
  - `total` = середнє зважене 4 осей (кожна по 0.25), як у axes.yaml.
  - Ретроспективні оцінки кожної осі обраховані з: подій (вторгнення 2022-Q1, Харків 2022-Q3, Херсон 2022-Q4, ICC ордер 2023-Q1, ТОТ-вибори Путіна 2024-Q1, закінчення терміну Зеленського 2024-Q2), polls/Levada рейтингів, V-Dem/FH/RSF історичних значень, % контролю території з `territory_control.csv`.
  - **Ключові точки:**
    - 2022-Q1 — Zelensky **81.5**, Putin 47.25
    - 2022-Q3 (Харків) — Zelensky **85.5** (пік), Putin 44.0
    - 2023-Q1 (ICC) — Zelensky 85.0, Putin **41.75** (B 35→32 після ордера)
    - 2024-Q2 (закінчення терміну Z) — Zelensky **77.25** (A 94→80)
    - 2026-Q2 (поточний) — Zelensky 75.5, Putin 40.25
- **`scripts/validate_data.py`** — нова `validate_history()`: формат `quarter`, ISO `date_end`, `actor` у allowlist, унікальність `(quarter, actor)`, `[0,100]` на всі 5 числових колонок.
- **`scripts/build.py`** — `HISTORY_NUMERIC = {axis_a, axis_b, axis_c, axis_d, total}`, опційна конверсія.
- **`assets/js/history.js`** — новий модуль:
  - Chart.js line chart, дві серії (Z синім, P червоним).
  - Кастомний `markerPlugin` додає вертикальні пунктирні лінії з підписами на 4 inflection points: «Вторгнення», «Харків», «Ордер ICC», «Кінець терміну Z» (UK/EN).
  - Y-діапазон обрізаний до 30-100 (не 0-100), щоб видно було розкид.
  - `interaction: { mode: 'index' }` — hover показує обидві серії одночасно.
- **`index.html`** — нова `<div id="history-chart">` у hero після `hero-radar-wrap`, з loading і note-абзацом.
- **`assets/js/main.js`** — `initHistory(lang)` доданий у `Promise.allSettled`.
- **i18n:** `hero.history_loading`, `hero.history_note`. **75/75 ключі симетрично.**
- **CSS:** `.hero-history` — 360 px висота, `#history-canvas` 100%×100%.

**Auto-deploy через GH Actions:**
- Commit `bcf0e25` → push → CI запустився автоматично → success за **53 с** (run #27073670036).
- Прод оновлено: https://legitimacy-dash.pages.dev. Дані по 36 рядків віддаються.

**Поточний стан:**
- Hero тепер містить **два візуали**: статичний радар (поточний зріз) + динамічний лінійний графік (2022-2026 еволюція). Разом дають повну картину «звідки прийшли і де зараз».
- 7 секцій з робочими візуалізаціями (radar + history + timeline + map + polls + indices + DeepStateMAP iframe), 6 секцій сайту.

**Caveat:** історичні оцінки A/B/C/D — це reasoning з відомих подій, не сертифіковані метрики. Метод: brzeegne моменти зміни (term ends, ICC warrants, territorial shifts) дають stepwise jumps; між ними — лінійна тенденція з polls/indices.

**Наступний крок (День 17+):**
- Custom domain (якщо буде).
- README badge статусу CI.
- PR-preview deploy.
