<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class PublishDesktopReleaseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'desktop:publish-release
                            {version : Yangi versiya raqami (masalan: 1.0.1)}
                            {--mandatory : Yangilanish majburiy ekanligini belgilash}
                            {--changelog= : Yangilanish tavsifi (o\'zgarishlar ro\'yxati)}
                            {--build= : Yangi build raqami}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Desktop dasturning yangi versiyasini version.json da e\'lon qilish va barcha ilovalarga yangilanish signali yuborish';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $version = trim((string) $this->argument('version'));
        $isMandatory = (bool) $this->option('mandatory');
        $changelog = (string) ($this->option('changelog') ?: 'Yangi yaxshilanishlar va qulayliklar qo\'shildi.');

        $versionFilePath = public_path('downloads/desktop/version.json');
        $downloadsDir = public_path('downloads/desktop');

        if (! File::exists($downloadsDir)) {
            File::makeDirectory($downloadsDir, 0755, true);
        }

        $currentData = [];
        if (File::exists($versionFilePath)) {
            $currentData = json_decode(File::get($versionFilePath), true) ?: [];
        }

        $buildOption = $this->option('build');
        if ($buildOption !== null && is_numeric($buildOption)) {
            $newBuild = (int) $buildOption;
        } else {
            $pubspecPath = base_path('desktop/pubspec.yaml');
            if (File::exists($pubspecPath) && preg_match('/version:\s*[0-9\.]+\+(\d+)/', (string) File::get($pubspecPath), $m)) {
                $newBuild = (int) $m[1];
            } else {
                $currentBuild = isset($currentData['build_number']) ? (int) $currentData['build_number'] : 0;
                $newBuild = $currentBuild + 1;
            }
        }

        $appUrl = config('app.url');
        if (! str_starts_with($appUrl, 'https://')) {
            $appUrl = preg_replace('/^http:/i', 'https:', $appUrl);
        }

        $newData = [
            'version' => $version,
            'build_number' => $newBuild,
            'release_date' => date('Y-m-d'),
            'is_mandatory' => $isMandatory,
            'download_url_windows' => "{$appUrl}/downloads/desktop/AutoPrime-Setup-{$version}.exe",
            'download_url_macos' => "{$appUrl}/downloads/desktop/AutoPrime-Setup-{$version}.dmg",
            'file_size_mb' => 25.0,
            'changelog_uz' => "AutoPrime LMS Desktop v{$version}\n• {$changelog}",
            'changelog_ru' => "AutoPrime LMS Desktop v{$version}\n• {$changelog}",
        ];

        File::put($versionFilePath, json_encode($newData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $this->info("✅ Yangi versiya muvaffaqiyatli e'lon qilindi: v{$version} (Build #{$newBuild})");
        $this->line("📁 version.json yangilandi: {$versionFilePath}");
        $this->line("🔗 Windows URL: {$newData['download_url_windows']}");

        return self::SUCCESS;
    }
}
