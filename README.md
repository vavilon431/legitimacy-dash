# Legitimacy Dashboard

[![Deploy to Cloudflare Pages](https://github.com/vavilon431/legitimacy-dash/actions/workflows/deploy.yml/badge.svg)](https://github.com/vavilon431/legitimacy-dash/actions/workflows/deploy.yml)
[![Live site](https://img.shields.io/badge/live-legitimacy--dash.pages.dev-4ea1f3)](https://legitimacy-dash.pages.dev/)

Порівняльний дашборд легітимності В. Зеленського і В. Путіна за чотирма вимірами:
юридично-електоральний, міжнародне визнання, внутрішня підтримка, контроль території
та верховенство права. Статичний сайт на Cloudflare Pages, без бекенду.

**Live:** https://legitimacy-dash.pages.dev

Див. [CLAUDE.md](CLAUDE.md) для архітектури і команд,
[.claude/stages.md](.claude/stages.md) — для журналу віх розробки.

## Швидкий старт

```powershell
# повний цикл: валідація → build → local preview
py -3.13 scripts\validate_data.py --no-links
py -3.13 scripts\build.py --clean
py -3.13 -m http.server 8765 --directory dist
# відкрити http://127.0.0.1:8765
```

## Деплой

Будь-який push на `main` запускає GitHub Actions, який валідовує дані,
ребілдить `dist/` (з регенерацією OG-карток) і деплоїть на Cloudflare Pages
через `wrangler-action`. Прод: https://legitimacy-dash.pages.dev (50-60 с
від push до live).

Pull-request з не-main гілки створює preview-деплой
(`https://<hash>.legitimacy-dash.pages.dev`) — посилання залишається коментарем
у PR. Це дозволяє рев'юверам клацнути і побачити зміни до мерджу.

## Ліцензія

- **Код:** MIT.
- **Дані** у `data/`: посилання на першоджерела зберігаються в самих файлах
  (поле `source_url`). Цитати з опитувань і офіційних документів — fair use
  з атрибуцією.
