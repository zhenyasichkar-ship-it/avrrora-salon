# Адмін-панель Avrrora

Панель живе за адресою **`/admin`** (наприклад `https://avrrora-salon.vercel.app/admin`).
Вона редагує вміст сайту (послуги, ціни, фото робіт, FAQ, контакти) і публікує
зміни коммітом у GitHub — Vercel автоматично викочує сайт за ~1 хвилину.

## Одноразове налаштування (Vercel → Settings → Environment Variables)

Обов'язкові:

| Змінна | Що це | Де взяти |
|---|---|---|
| `ADMIN_PASSWORD` | Пароль входу в панель | придумайте довгий (12+ символів) |
| `GITHUB_TOKEN` | Токен, яким панель комітить у репозиторій | GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token. Repository access: **Only select repositories → avrrora-salon**. Permissions: **Contents → Read and write**. Більше нічого не вмикайте. |

Рекомендовані:

| Змінна | Що це |
|---|---|
| `SESSION_SECRET` | Будь-який випадковий рядок — підписує сесії панелі |
| `TELEGRAM_BOT_TOKEN` | Токен бота для заявок: напишіть [@BotFather](https://t.me/BotFather) → `/newbot` → скопіюйте токен |
| `TELEGRAM_CHAT_ID` | Куди слати заявки: напишіть своєму боту будь-що, потім відкрийте `https://api.telegram.org/bot<ТОКЕН>/getUpdates` і скопіюйте `chat.id` |

Необов'язкові (мають правильні значення за замовчуванням): `GITHUB_REPO`
(`zhenyasichkar-ship-it/avrrora-salon`), `GITHUB_BRANCH` (`main`).

Після додавання змінних зробіть **Redeploy** у Vercel, щоб вони підхопилися.

## Як це працює

- Весь редагований вміст лежить в `assets/content.json`; сторінки читають його
  при завантаженні (`assets/cms.js`).
- Панель (`admin.html`) редагує копію цього файлу. Зміни зберігаються як
  чернетка в браузері, поки не натиснути **«Опублікувати»**.
- «Опублікувати» відправляє файли на `/api/publish`, який робить один коміт у
  GitHub (текст + нові фото в `images/uploads/`). Vercel бачить коміт і
  передеплоює сайт.
- Фото стискаються прямо в браузері до 1600px JPEG — можна сміливо вантажити
  знімки з телефону.
- Форма запису на сторінці «Контакти» шле заявку через `/api/booking` в
  Telegram. Без налаштованого бота форма чемно попросить зателефонувати.

## Якщо забули пароль

Поміняйте `ADMIN_PASSWORD` у Vercel і зробіть Redeploy — старі сесії одразу
стануть недійсними.
