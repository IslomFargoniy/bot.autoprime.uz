# AutoPrime LMS & Bot Workspace Guidelines

## 🖥️ Server, Environment & Deployment Rules (CRITICAL FOR AGENTS)

Whenever making changes to this codebase, any AI assistant MUST abide by the exact deployment specifications below:

### 1. Server Specification
- **Production Server IP**: `193.181.213.60` (User: `root`)
- **Web Directory**: `/var/www/lms_autoprim_usr/data/www/lms.autoprime.uz`
- **Main Domain**: `https://lms.autoprime.uz`
- **Mini App URL**: `https://lms.autoprime.uz/mini-app`
- **PHP 8.3 Path**: `/opt/php83/bin/php`
- **Git Branch**: `lms` (Always commit and push to `origin/lms`)

### 2. Standard Deployment Sequence (One-Line SSH Command)
After committing and pushing changes locally (`git push origin lms`), execute:
```bash
ssh -o StrictHostKeyChecking=no root@193.181.213.60 "cd /var/www/lms_autoprim_usr/data/www/lms.autoprime.uz && git fetch origin && git checkout lms && git pull origin lms && npm run build && /opt/php83/bin/php artisan migrate --force && /opt/php83/bin/php artisan optimize:clear"
```

### 3. Telegram Bot & Webhook Details
- **Bot Username**: `@LmsAutoprimeBot` (https://t.me/LmsAutoprimeBot)
- **Bot Token**: `8938206376:AAHblup32CcTORASj1ZlkfLts3q20QIn-5A`
- **Webhook Endpoint**: `https://lms.autoprime.uz/api/telegram`
- **Register Webhook Command**:
  ```bash
  /opt/php83/bin/php artisan nutgram:hook:set https://lms.autoprime.uz/api/telegram
  ```

---

## 💻 Flutter Desktop Application & Auto-Update Engine

- **Desktop Codebase**: Located in `/desktop` folder.
- **Server Downloads Folder**: `/public/downloads/desktop/` (Public URL: `https://lms.autoprime.uz/downloads/desktop/`)
- **Auto-Update Endpoint**: `GET https://lms.autoprime.uz/api/desktop/version-check`
- **Building Windows (.exe)**: Run `desktop/build_windows.bat` on Windows.
- **Building macOS (.dmg)**: Run `desktop/build_macos.sh` on macOS.
- **Publishing a New Desktop Release on Server**:
  ```bash
  /opt/php83/bin/php artisan desktop:publish-release <version> --changelog="<description>"
  ```
  *(Add `--mandatory` flag if update is required to proceed)*.
- **Single Active Session Rule**: Each student can only be logged in on ONE desktop device at a time. Authenticating on a new device immediately invalidates all previous sessions via `current_desktop_session_id` and returns `SESSION_SUPERSEDED` (HTTP 401).

---

## 🌐 Localization & Internationalization (MANDATORY)

- **NEVER hardcode raw UI text strings** in React components. Always use the `t('key', 'default_fallback')` translation hook from `react-i18next`.
- Whenever adding new UI elements, buttons, badges, table columns, or status texts, **ALWAYS add the corresponding translation keys to all 4 locale files**:
  1. `resources/js/i18n/locales/ru.json` (Russian)
  2. `resources/js/i18n/locales/uz.json` (Uzbek - Latin)
  3. `resources/js/i18n/locales/krill.json` (Uzbek - Cyrillic)
  4. `resources/js/i18n/locales/en.json` (English)
- Ensure parameters in dynamic strings use interpolation (e.g. `t('instructors.scheduled_drivings', 'dars belgilangan')`).

---

## 🎨 Layout, Component & Security Rules

- **Page Titles & Actions**: Keep page `h1` titles and primary action buttons (e.g. `+ Add`) inline on the same horizontal flex row across all admin pages. Do not add subheader description paragraphs under page titles.
- **Test Solving (Quiz) Layout**:
  - Desktop: 2-column layout (`grid grid-cols-1 md:grid-cols-2 gap-4`) with question image on the LEFT and answer choices (F1–F4) on the RIGHT.
  - Mobile: Clean vertical stack.
  - Keyboard Shortcuts: Support `F1-F4`, `1-4`, `Enter`, `Space`, `Arrow Left/Right`.
- **Mini App Student Guard**: Direct web visits without Telegram student identity must show an authorized student lock card prompting to open via Telegram Bot.
- **Mobile Responsive Grids**: On mobile modal forms, pair related input fields (e.g., Group + Search, Autodrome + Date, Start Time + End Time) side-by-side using 2-column grid rows (`grid grid-cols-2 gap-3`).
- **Instructor Privacy Scoping**: Student ratings, reviews, star badges, and reason tags must stay hidden from users with the `instructor` role across all admin pages (drivings list, student details, etc.).
