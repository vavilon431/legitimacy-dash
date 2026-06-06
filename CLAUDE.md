# CLAUDE.md — legitimacy-dash

Порівняльний дашборд легітимності В. Зеленського і В. Путіна за чотирма вимірами:
**A** юридично-електоральна, **B** міжнародне визнання, **C** внутрішня підтримка,
**D** контроль території та верховенство права. Статичний сайт на Cloudflare Pages,
без бекенду, без бази даних. Усі дані — у `data/` як YAML/CSV з посиланнями на
першоджерела.

## Команди

```powershell
# повний цикл: валідація → build → local preview
py -3.13 scripts\validate_data.py --no-links
py -3.13 scripts\build.py --clean
py -3.13 -m http.server 8765 --directory dist
# відкрити http://127.0.0.1:8765

# валідація + перевірка лінків HEAD/GET 200 OK
py -3.13 scripts\validate_data.py

# build з регенерацією OG-карток (повільніше, бо matplotlib)
py -3.13 scripts\build.py --clean --og

# тільки OG-картки (assets/img/og-{uk,en}.png)
py -3.13 scripts\build_og.py

# деплой на Cloudflare Pages (token без Account:Read → передаємо account_id явно)
$env:CLOUDFLARE_ACCOUNT_ID = 'dc00a025ad54b70f182a71067a83add1'
npx wrangler pages deploy dist --project-name=legitimacy-dash --branch=main
```

**Важливо:** dev-цикл — `build → serve dist/`. `data/*.yaml` і `data/*.csv` —
authoring-формат, рантайм їх не читає. `scripts/build.py` конвертує їх у
`dist/data/*.json`, рантайм робить `fetch('data/<name>.json')`.

## Стек

- **Frontend:** ваніль HTML + CSS + ES modules, без React/Vue/збірників.
- **Чарти (CDN):** Chart.js 4 (радар, лінії), Plotly.js (опитування з CI), Leaflet (карта),
  vis-timeline (хронологія).
- **Build:** Python 3.11+, тільки stdlib (`json`, `csv`, `yaml` через `pyyaml` —
  єдина dep). Для лінк-чеку — `requests`.
- **Хостинг:** Cloudflare Pages (`legitimacy-dash.pages.dev`).
- **Мови UI:** UK (default), EN.

## Архітектура

```
index.html                  — одна сторінка, hreflang uk/en, JSON-LD Dataset, OG/Twitter cards
404.html                    — кастомна сторінка-помилка (двомовна, Cloudflare Pages fallback)
robots.txt                  — Allow: /, посилання на sitemap
assets/js/main.js           — bootstrap, перемикач мови, оркестрація модулів
assets/js/{radar,timeline,map,polls,indices,methodology}.js — по модулю на секцію
assets/i18n/{uk,en}.json    — UI strings (71 ключ симетрично)
assets/img/og-{uk,en}.png   — 1200×630 OG-картки (генеровані build_og.py)
data/axes.yaml              — визначення осей, ваги, формула агрегації  ── authoring
data/events.yaml            — хронологія подій (юр.-електоральна + міжнародна)
data/polls_ua.csv           — рейтинги довіри UA
data/polls_ru.csv           — рейтинги довіри RU
data/indices.csv            — V-Dem, Freedom House, RSF — щорічно
data/territory_control.csv  — % контролю території УКР по кварталах × 3 джерела (ISW/DeepState/BlackBird)
data/icc_un_docs.yaml       — ICC ордери, UN резолюції з посиланнями
data/country_status.yaml    — голосування ООН + санкції + Рим. статут
data/world.geojson          — Natural Earth 110m (єдиний JSON, що пишеться вручну)
scripts/validate_data.py    — JSON-Schema-style перевірка + лінк-чек
scripts/build.py            — YAML/CSV → JSON, копіювання static у dist/, генерація sitemap.xml
scripts/build_og.py         — matplotlib-генератор OG-карток 1200×630 (UK + EN)
dist/                       — артефакт; це і є те, що деплоїться у Pages
  └─ sitemap.xml            — генерується в build.py, lastmod = max(as_of) з axes.yaml
```

**Lazy-load:** Plotly (3.5 МБ) підвантажується через `IntersectionObserver`
на секцію C, не з head-у. Радар/таймлайн/карта — eager, бо в перший viewport.

**Методологія (секція 6):** рендериться динамічно `methodology.js` з `axes.json`
+ `events.json` + `icc_un_docs.json`. Підсумкова таблиця, формула, `<details>`
по 4 осях з компонентами і клікабельними evidence-лінками.

## Принципи методології (не порушувати)

1. **Симетричність.** Будь-яка формула / штраф / бал застосовується **до обох**
   акторів за однакових умов. Якщо невибори-2024 в UA знижують A для Зеленського —
   обнулення-2020 і голосування на ТОТ-2024 знижують A для Путіна.
2. **Атрибуція.** Кожен бал клікабельний до формули **і** до першоджерела
   (ICC документ, текст конституції, PDF опитування, V-Dem звіт).
3. **Поллстери розділяти.** UA: КМІС / Разумков / Rating окремо. RU: Левада
   окремо від ВЦИОМ/ФОМ, з підписом «незалежний (іноагент у РФ)» vs «державний».
4. **Не оцінювати в коді.** Тон — фактографічний. Будь-який епітет («сумнівні»,
   «фейкові») — лише цитатою з джерела з лапками і посиланням.
5. **Дата зрізу.** Кожна вісь має `as_of: YYYY-MM-DD`. У футері — глобальна дата
   останнього апдейту = max(as_of).

## Стан

Див. [.claude/stages.md](.claude/stages.md).
