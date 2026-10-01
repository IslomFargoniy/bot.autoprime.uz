#!/usr/bin/env bash
#
# AutoPrime LMS — production'ga deploy (https://lms.autoprime.uz).
#
# Lokal kompyuterdan ishga tushiriladi:  ./deploy.sh [branch]   (default: lms)
#
# Qadamlar: lokal tekshiruv → frontend'ni lokal build qilish (serverda RAM kam)
# → DB backup → maintenance mode → git pull → composer → build'ni yuklash
# → migrate → kesh → queue worker restart → maintenance'dan chiqish.
# Biror qadam xato bersa, skript to'xtaydi va sayt maintenance rejimida qoladi:
#   ssh autoprime "sudo -u lms_autoprim_usr /opt/php83/bin/php <APP_DIR>/artisan up"

set -euo pipefail

BRANCH="${1:-lms}"
SSH_HOST="${DEPLOY_SSH_HOST:-autoprime}"
APP_DIR="/var/www/lms_autoprim_usr/data/www/lms.autoprime.uz"
APP_USER="lms_autoprim_usr"
PHP="/opt/php83/bin/php"
COMPOSER="/usr/local/bin/composer"
SUPERVISOR_GROUP="lms-worker:*"

cd "$(dirname "$0")"

echo "▶ Deploy: branch=${BRANCH}, server=${SSH_HOST}:${APP_DIR}"

if [ -n "$(git status --porcelain)" ]; then
    echo "✖ Lokal o'zgarishlar commit qilinmagan." >&2
    exit 1
fi

git fetch -q origin "${BRANCH}"
if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/${BRANCH}")" ]; then
    echo "✖ Lokal HEAD origin/${BRANCH} bilan bir xil emas. ${BRANCH} ga o'tib, push qiling." >&2
    exit 1
fi

echo "▶ Frontend build (lokal)"
npm run build

remote() {
    ssh -o BatchMode=yes "${SSH_HOST}" \
        BRANCH="${BRANCH}" APP_DIR="${APP_DIR}" APP_USER="${APP_USER}" PHP="${PHP}" \
        COMPOSER="${COMPOSER}" SUPERVISOR_GROUP="${SUPERVISOR_GROUP}" STEP="$1" \
        'bash -s' <<'REMOTE'
set -euo pipefail

as_app() { sudo -u "${APP_USER}" -H bash -c "cd '${APP_DIR}' && $*"; }
git_app() { as_app "git -c safe.directory='${APP_DIR}' $*"; }
env_value() { grep -E "^$1=" "${APP_DIR}/.env" | tail -1 | cut -d= -f2- | tr -d '"'; }

cd "${APP_DIR}"

case "${STEP}" in
prepare)
    if [ "$(env_value APP_ENV)" != "production" ] || [ "$(env_value APP_DEBUG)" != "false" ]; then
        echo "✖ .env da APP_ENV=production va APP_DEBUG=false bo'lishi shart." >&2
        exit 1
    fi

    echo "▶ Ma'lumotlar bazasi backup'i"
    BACKUP_DIR="${APP_DIR}/storage/backups"
    as_app "mkdir -p '${BACKUP_DIR}'"
    BACKUP_FILE="${BACKUP_DIR}/db-$(date +%Y%m%d-%H%M%S).sql.gz"
    MYSQL_PWD="$(env_value DB_PASSWORD)" mysqldump \
        --single-transaction --routines --no-tablespaces \
        -h "$(env_value DB_HOST)" -P "$(env_value DB_PORT)" -u "$(env_value DB_USERNAME)" \
        "$(env_value DB_DATABASE)" | gzip | sudo -u "${APP_USER}" tee "${BACKUP_FILE}" > /dev/null
    echo "  ✓ ${BACKUP_FILE}"

    echo "▶ Maintenance mode"
    as_app "${PHP} artisan down --retry=30"

    echo "▶ Kodni yangilash (${BRANCH})"
    # Serverda yaratiladigan fayllar (masalan desktop version.json) saqlanadi;
    # agar yangi commit ham ularni o'zgartirsa, --ff-only to'xtatadi.
    git_app fetch origin "${BRANCH}"
    git_app checkout "${BRANCH}"
    git_app pull --ff-only origin "${BRANCH}"

    echo "▶ Composer"
    as_app "${PHP} ${COMPOSER} install --no-dev --optimize-autoloader --no-interaction"
    ;;
finish)
    sudo chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/public/build"

    echo "▶ Migratsiyalar"
    as_app "${PHP} artisan migrate --force"

    echo "▶ Kesh"
    as_app "${PHP} artisan optimize:clear && ${PHP} artisan config:cache && ${PHP} artisan route:cache && ${PHP} artisan view:cache"

    echo "▶ Queue worker'larni qayta ishga tushirish"
    as_app "${PHP} artisan queue:restart"
    sudo supervisorctl restart "${SUPERVISOR_GROUP}"

    echo "▶ Saytni ochish"
    as_app "${PHP} artisan up"

    echo "✓ Deploy tugadi: $(git_app log --oneline -1)"
    ;;
esac
REMOTE
}

remote prepare

echo "▶ Build fayllarini yuklash"
rsync -az --delete --rsync-path="sudo rsync" public/build/ "${SSH_HOST}:${APP_DIR}/public/build/"

remote finish

echo "▶ Tekshiruv"
curl -s -o /dev/null -w "  https://lms.autoprime.uz/login → HTTP %{http_code}\n" https://lms.autoprime.uz/login
