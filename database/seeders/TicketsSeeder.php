<?php

namespace Database\Seeders;

use App\Models\Answer;
use App\Models\Question;
use App\Models\RoadLine;
use App\Models\Sign;
use App\Models\SignCategory;
use App\Models\Ticket;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TicketsSeeder extends Seeder
{
    /**
     * Run the database seeds for all 130 tickets, questions, answers, signs, and road lines.
     */
    public function run(): void
    {
        $this->command->info('Starting Tickets, Questions, Traffic Signs & Road Lines seeding...');

        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        }

        // 1. Truncate test entities
        Answer::truncate();
        Question::truncate();
        Ticket::truncate();
        Sign::truncate();
        SignCategory::truncate();
        RoadLine::truncate();

        // ---------------------------------------------------------------------
        // 2. SEED TICKETS, QUESTIONS & ANSWERS (130 Tickets, 1,300 Questions)
        // ---------------------------------------------------------------------
        $avtoFile = database_path('data/avtoimtihon_1190.json');
        $eavtoFile = database_path('data/e-avtomaktab_1190-1300.json');

        $avtoQuestions = file_exists($avtoFile) ? json_decode(file_get_contents($avtoFile), true) : [];
        $eavtoQuestions = file_exists($eavtoFile) ? json_decode(file_get_contents($eavtoFile), true) : [];

        $allQuestions = array_merge($avtoQuestions ?: [], $eavtoQuestions ?: []);
        $this->command->info('Loaded '.count($allQuestions).' questions from dataset.');

        $ticketChunks = array_chunk($allQuestions, 10);
        $ticketId = 1;
        $questionId = 1;
        $answerId = 1;

        $ticketsBatch = [];
        $questionsBatch = [];
        $answersBatch = [];
        $now = now();

        foreach ($ticketChunks as $index => $chunk) {
            $ticketNumber = $index + 1;
            $currentTicketId = $ticketId++;

            $ticketsBatch[] = [
                'id' => $currentTicketId,
                'ticket_number' => $ticketNumber,
                'title_uz' => "{$ticketNumber}-Bilet",
                'title_ru' => "Билет №{$ticketNumber}",
                'title_krill' => "{$ticketNumber}-Билет",
                'title_en' => "Ticket #{$ticketNumber}",
                'description' => "Haydovchilik guvohnomasi imtihoni uchun {$ticketNumber}-bilet savollari",
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            foreach ($chunk as $qIndex => $qData) {
                $currentQuestionId = $questionId++;
                $qNumber = $qIndex + 1;
                $content = $qData['content'] ?? "Savol {$qNumber}";
                $description = $qData['description'] ?? null;
                $imageUrl = $qData['image_url'] ?? null;

                $questionsBatch[] = [
                    'id' => $currentQuestionId,
                    'ticket_id' => $currentTicketId,
                    'question_number' => $qNumber,
                    'question_uz' => $content,
                    'question_ru' => $content,
                    'question_krill' => $content,
                    'question_en' => $content,
                    'description_uz' => $description,
                    'description_ru' => $description,
                    'description_krill' => $description,
                    'description_en' => $description,
                    'image_url' => $imageUrl,
                    'audio_url_uz' => null,
                    'audio_url_ru' => null,
                    'audio_url_krill' => null,
                    'audio_url_en' => null,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                $answers = $qData['answers'] ?? [];
                foreach ($answers as $aIndex => $aData) {
                    $aContent = $aData['content'] ?? '';
                    $isCorrect = (bool) ($aData['is_correct'] ?? false);

                    $answersBatch[] = [
                        'id' => $answerId++,
                        'question_id' => $currentQuestionId,
                        'answer_uz' => $aContent,
                        'answer_ru' => $aContent,
                        'answer_krill' => $aContent,
                        'answer_en' => $aContent,
                        'is_correct' => $isCorrect,
                        'order' => $aIndex + 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        // Safe batch insert in chunks of 25 to respect SQLite/MySQL variable limits
        foreach (array_chunk($ticketsBatch, 25) as $chunk) {
            DB::table('tickets')->insert($chunk);
        }
        foreach (array_chunk($questionsBatch, 25) as $chunk) {
            DB::table('questions')->insert($chunk);
        }
        foreach (array_chunk($answersBatch, 25) as $chunk) {
            DB::table('answers')->insert($chunk);
        }

        $this->command->info('Seeded '.count($ticketsBatch).' tickets and '.count($questionsBatch).' questions.');

        // ---------------------------------------------------------------------
        // 3. SEED TRAFFIC SIGNS & CATEGORIES
        // ---------------------------------------------------------------------
        $signsFile = database_path('data/yol_belgilari_full.json');
        if (file_exists($signsFile)) {
            $categoriesData = json_decode(file_get_contents($signsFile), true) ?: [];
            $categoryId = 1;
            $signId = 1;
            $signsBatch = [];

            foreach ($categoriesData as $catData) {
                $catName = $catData['category'] ?? "Belgilar guruhi {$categoryId}";
                $currentCatId = $categoryId++;
                $slug = Str::slug($catName) ?: "cat-{$currentCatId}";

                DB::table('sign_categories')->insert([
                    'id' => $currentCatId,
                    'name_uz' => $catName,
                    'name_ru' => $catName,
                    'name_krill' => $catName,
                    'name_en' => $catName,
                    'slug' => $slug,
                    'order' => $currentCatId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $signs = $catData['signs'] ?? [];
                foreach ($signs as $sIndex => $sData) {
                    $sContent = $sData['content'] ?? "Belgi {$signId}";
                    $sNumber = (string) ($sIndex + 1);

                    if (preg_match('/^([\d\.\w]+)\s+(.+)$/u', $sContent, $matches)) {
                        $sNumber = trim($matches[1]);
                        $sContent = trim($matches[2]) ?: $sNumber;
                    }

                    $signsBatch[] = [
                        'id' => $signId++,
                        'category_id' => $currentCatId,
                        'sign_number' => $sNumber,
                        'name_uz' => $sContent,
                        'name_ru' => $sContent,
                        'name_krill' => $sContent,
                        'name_en' => $sContent,
                        'description_uz' => $sContent,
                        'description_ru' => $sContent,
                        'description_krill' => $sContent,
                        'description_en' => $sContent,
                        'image_url' => $sData['image_url'] ?? null,
                        'order' => $sIndex + 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            foreach (array_chunk($signsBatch, 25) as $chunk) {
                DB::table('signs')->insert($chunk);
            }
            $this->command->info('Seeded '.($categoryId - 1).' sign categories and '.count($signsBatch).' signs.');
        }

        // ---------------------------------------------------------------------
        // 4. SEED ROAD LINES
        // ---------------------------------------------------------------------
        $linesFile = database_path('data/yol_chiziqlari_full.json');
        if (file_exists($linesFile)) {
            $linesData = json_decode(file_get_contents($linesFile), true) ?: [];
            $lineId = 1;
            $linesBatch = [];

            foreach ($linesData as $lData) {
                $lineNumber = $lData['id'] ?? (string) $lineId;
                $desc = $lData['description'] ?? '';
                $color = $lData['color'] ?? '';
                $fullDesc = trim("{$desc} ({$color})");

                $linesBatch[] = [
                    'id' => $lineId++,
                    'line_number' => $lineNumber,
                    'name_uz' => "Yo'l chizig'i {$lineNumber}",
                    'name_ru' => "Дорожная разметка {$lineNumber}",
                    'name_krill' => "Йўл чизиғи {$lineNumber}",
                    'name_en' => "Road line {$lineNumber}",
                    'description_uz' => $fullDesc,
                    'description_ru' => $fullDesc,
                    'description_krill' => $fullDesc,
                    'description_en' => $fullDesc,
                    'image_url' => $lData['image_url'] ?? null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            foreach (array_chunk($linesBatch, 25) as $chunk) {
                DB::table('road_lines')->insert($chunk);
            }
            $this->command->info('Seeded '.count($linesBatch).' road lines.');
        }

        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON;');
        }

        $this->command->info('✅ TicketsSeeder completed successfully!');
    }
}
