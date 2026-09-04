# 🚀 AutoPrimeBot - Serverga O'rnatish va Sozlash Qo'llanmasi (INSTALL.md)

Ushbu hujjat **AutoPrimeBot** loyihasini (Laravel 13, Inertia.js React, MySQL, Telegram Nutgram Bot) Linux (Ubuntu/Debian, FastPanel yoki NGINX) serverida to'liq o'rnatish va sozlash bo'yicha bosqichma-bosqich yo'riqnomadir.

---

## 📋 1. Tizim Talablari (System Requirements)

- **PHP**: `^8.3` (Kengaytmalar: `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `json`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `zip`)
- **Database**: MySQL `^8.0` yoki MariaDB `^10.6`
- **Composer**: `^2.x`
- **Node.js**: `^18.x` yoki `^20.x` & NPM
- **Web Server**: NGINX / Apache (FastPanel tavsiya etiladi)
- **SSL Sertifikat**: HTTPS (Telegram Webhook va WebApp ishlashi uchun shart)

---

## 🛠 2. Bosqichma-bosqich O'rnatish Ketma-ketligi

### 1-Qadam: PHP 8.3 versiyasini standart qilish (FastPanel/Linux)
Serverdagi terminal CLI uchun PHP 8.3 ni ko'rsating:
```bash
ln -sf /opt/php83/bin/php /usr/bin/php
# PHP versiyasini tekshirish:
php -v
```

---

### 2-Qadam: Loyihani ko'chirib olish (Git Clone)
```bash
cd /var/www/bot_autoprim_usr/data/www/bot.autoprime.uz
git clone https://github.com/IslomFargoniy/AutoPrimeBot.git .
git config --global --add safe.directory $(pwd)
```

---

### 3-Qadam: PHP va Frontend Kutubxonalarini O'rnatish

**Composer kutubxonalarini o'rnatish:**
```bash
composer install --no-dev --optimize-autoloader
```

**NPM kutubxonalari va Frontend fayllarni build qilish:**
```bash
npm install
npm run build
```

---

### 4-Qadam: Muhit Faylini (`.env`) Yaratish va Sozlash

```bash
cp .env.example .env
nano .env
```

`.env` faylini quyidagi namuna asosida to'ldiring:

```env
APP_NAME=AutoPrimeBot
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://bot.autoprime.uz

APP_LOCALE=uz
APP_FALLBACK_LOCALE=uz

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bot_autoprim
DB_USERNAME=bot_autoprim
DB_PASSWORD=SeningBazaParoling

SESSION_DRIVER=database
SESSION_LIFETIME=120
QUEUE_CONNECTION=database
CACHE_STORE=database

TELEGRAM_TOKEN=8681143266:AAERUptavEcHTudnEAZbRvXIOmKYUtW_VY8
```

---

### 5-Qadam: Loyiha Kalitini va Baza Jadvallarini Yaratish

```bash
# 1. Loyiha kalitini yaratish
php artisan key:generate

# 2. Ma'lumotlar bazasi jadvallarini va boshlang'ich Admin akkauntini yaratish
php artisan migrate --force
php artisan db:seed --force

# 3. Media fayllar uchun storage simlinkini ulash
php artisan storage:link
```

---

### 6-Qadam: Keshni Optimallashtirish va Ruxsatlarni Berish

```bash
# Keshni tozalash va qayta yaratish
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Papka huquqlarini FastPanel sayt foydalanuvchisiga berish
chown -R bot_autoprim_usr:bot_autoprim_usr /var/www/bot_autoprim_usr/data/www/bot.autoprime.uz
chmod -R 775 storage bootstrap/cache
```

---

## 🤖 3. Telegram Bot Webhook-ni Sozlash

Botga Telegram serverlaridan real vaqt rejimida xabarlar kelishi uchun Webhook URL ulashingiz kerak:

```bash
# 1. Webhook-ni ulash
php artisan nutgram:hook:set https://bot.autoprime.uz/api/telegram

# 2. Webhook holatini tekshirish
php artisan nutgram:hook:info

# 3. Telegram Bot buyruqlarini ro'yxatdan o'tkazish
php artisan nutgram:register-commands
```

---

## ⚙️ 4. Supervisor (Queue Worker va Scheduler) ni Sozlash

Dars yaratilganda tezkor xabarnomalar va darsdan 24 soat / 2 soat oldin avtomatik eslatmalar (reminders) yuborilishi uchun fonda **Supervisor** ishlashi kerak:

```bash
# 1. Supervisor-ni o'rnatish (agar serverda bo'lmasa)
sudo apt-get install -y supervisor

# 2. Loyihadagi konfiguratsiya faylini Supervisor katalogiga nusxalash
sudo cp supervisor/autoprime.conf /etc/supervisor/conf.d/autoprime.conf

# 3. Supervisor-ni yangilash va jarayonlarni ishga tushirish
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all

# 4. Jarayonlar holatini tekshirish
sudo supervisorctl status
```

---

## 🔐 5. Tizimga Kirish Ma'lumotlari (Default Credentials)

Bo'sh bazani seed qilganingizdan so'ng, tizimga kirish uchun quyidagi default Admin ma'lumotlaridan foydalanishingiz mumkin:

- **Login (Telefon):** `+998911157709`
- **Parol:** `12345678`
- **Link:** `https://bot.autoprime.uz/login`

---

## 🔄 6. Yangilanishlarni Yuklash (Deployment Updates)

Kelgusida kodingizni yangilamoqchi bo'lsangiz, serverda ushbu buyruqlarni yurgizish kifoya:

```bash
git pull origin main
composer install --no-dev --optimize-autoloader
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Supervisor workerlarini yangi kod bilan qayta yuklash
sudo supervisorctl restart all
```

