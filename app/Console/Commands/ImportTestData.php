<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportTestData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tests:import {--source-db= : Optional source database name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import all 130 tickets, 1,300 questions, answers, signs, and road_lines from JSON datasets or temporary database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $sourceDb = $this->option('source-db');

        if (! empty($sourceDb)) {
            $tables = DB::select("SHOW TABLES FROM `{$sourceDb}`");
            if (! empty($tables)) {
                return $this->importFromDatabase($sourceDb);
            }
            $this->warn("Database `{$sourceDb}` not found. Falling back to JSON dataset files in database/data/...");
        }

        return $this->importFromJsonFiles();
    }

    /**
     * Import tickets, questions, signs, and lines from JSON data files.
     */
    protected function importFromJsonFiles(): int
    {
        $this->info('Starting test and exam import from JSON dataset (database/data/)...');

        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        }

        // 1. Truncate
        DB::table('answers')->truncate();
        DB::table('questions')->truncate();
        DB::table('tickets')->truncate();
        DB::table('signs')->truncate();
        DB::table('sign_categories')->truncate();
        DB::table('road_lines')->truncate();

        $now = now();

        // 2. Sign Categories & Signs
        $this->info('1/4 Importing Sign Categories and Signs...');
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

            foreach (array_chunk($signsBatch, 50) as $chunk) {
                DB::table('signs')->insert($chunk);
            }
            $this->info('   Imported '.($categoryId - 1).' categories and '.count($signsBatch).' signs.');
        }

        // 3. Road Lines
        $this->info('2/4 Importing Road Lines...');
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

            foreach (array_chunk($linesBatch, 50) as $chunk) {
                DB::table('road_lines')->insert($chunk);
            }
            $this->info('   Imported '.count($linesBatch).' road lines.');
        }

        // 4. Tickets, Questions and Answers
        $this->info('3/4 Importing 130 Tickets and 1,300 Questions...');
        $avtoFile = database_path('data/avtoimtihon_1190.json');
        $eavtoFile = database_path('data/e-avtomaktab_1190-1300.json');

        $avtoQuestions = file_exists($avtoFile) ? json_decode(file_get_contents($avtoFile), true) : [];
        $eavtoQuestions = file_exists($eavtoFile) ? json_decode(file_get_contents($eavtoFile), true) : [];

        $allQuestions = array_merge($avtoQuestions ?: [], $eavtoQuestions ?: []);
        $ticketChunks = array_chunk($allQuestions, 10);

        $ticketId = 1;
        $questionId = 1;
        $answerId = 1;

        $ticketsBatch = [];
        $questionsBatch = [];
        $answersBatch = [];

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

        foreach (array_chunk($ticketsBatch, 50) as $chunk) {
            DB::table('tickets')->insert($chunk);
        }
        foreach (array_chunk($questionsBatch, 50) as $chunk) {
            DB::table('questions')->insert($chunk);
        }
        foreach (array_chunk($answersBatch, 50) as $chunk) {
            DB::table('answers')->insert($chunk);
        }

        $this->info('4/4 Summary verification...');
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON;');
        }

        $ticketsCount = DB::table('tickets')->count();
        $questionsCount = DB::table('questions')->count();
        $answersCount = DB::table('answers')->count();
        $signsCount = DB::table('signs')->count();
        $categoriesCount = DB::table('sign_categories')->count();
        $roadLinesCount = DB::table('road_lines')->count();

        $this->info('🎉 Test Data Import Completed Successfully!');
        $this->table(['Entity', 'Count'], [
            ['Tickets (Biletlar)', $ticketsCount],
            ['Questions (Savollar)', $questionsCount],
            ['Answers (Javoblar)', $answersCount],
            ['Traffic Signs (Belgilar)', $signsCount],
            ['Sign Categories', $categoriesCount],
            ['Road Lines (Chiziqlar)', $roadLinesCount],
        ]);

        return Command::SUCCESS;
    }

    /**
     * Legacy import from external DB schema.
     */
    protected function importFromDatabase(string $sourceDb): int
    {
        $this->info("Importing test and exam data from database `{$sourceDb}`...");

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('sign_categories')->truncate();
        $sourceCats = DB::table("{$sourceDb}.sign_categories")->orderBy('id')->get();
        foreach ($sourceCats as $cat) {
            DB::table('sign_categories')->insert([
                'id' => $cat->id,
                'name_uz' => $cat->name,
                'name_ru' => $cat->name,
                'name_krill' => $cat->name,
                'name_en' => $cat->name,
                'slug' => Str::slug($cat->name).'-'.$cat->id,
                'order' => $cat->id,
                'created_at' => $cat->created_at ?? now(),
                'updated_at' => $cat->updated_at ?? now(),
            ]);
        }

        DB::table('signs')->truncate();
        $sourceSigns = DB::table("{$sourceDb}.signs")->orderBy('id')->get();
        foreach ($sourceSigns as $s) {
            $signNumber = $s->title ?: (string) $s->id;
            $nameUz = $s->title ?: 'Belgi '.$s->id;
            if (preg_match('/^([\d\.\w]+)\s+(.+)$/u', $s->title, $matches)) {
                $signNumber = trim($matches[1]);
                $nameUz = trim($matches[2]) ?: $signNumber;
            }

            $img = $s->image_url ? '/storage/'.ltrim($s->image_url, '/') : null;

            DB::table('signs')->insert([
                'id' => $s->id,
                'category_id' => $s->category_id,
                'sign_number' => $signNumber,
                'name_uz' => $nameUz,
                'name_ru' => $nameUz,
                'name_krill' => $nameUz,
                'name_en' => $nameUz,
                'description_uz' => $s->description ?? '',
                'description_ru' => $s->description ?? '',
                'description_krill' => $s->description ?? '',
                'description_en' => $s->description ?? '',
                'image_url' => $img,
                'order' => $s->id,
                'created_at' => $s->created_at ?? now(),
                'updated_at' => $s->updated_at ?? now(),
            ]);
        }

        DB::table('road_lines')->truncate();
        $sourceRoadLines = DB::table("{$sourceDb}.road_lines")->orderBy('id')->get();
        foreach ($sourceRoadLines as $rl) {
            $img = $rl->image_url ? '/storage/'.ltrim($rl->image_url, '/') : null;

            DB::table('road_lines')->insert([
                'id' => $rl->id,
                'line_number' => $rl->title ?: (string) $rl->id,
                'name_uz' => $rl->title ?: 'Yo\'l chizig\'i '.$rl->id,
                'name_ru' => $rl->title ?: 'Yo\'l chizig\'i '.$rl->id,
                'name_krill' => $rl->title ?: 'Yo\'l chizig\'i '.$rl->id,
                'name_en' => $rl->title ?: 'Yo\'l chizig\'i '.$rl->id,
                'description_uz' => $rl->description ?? '',
                'description_ru' => $rl->description ?? '',
                'description_krill' => $rl->description ?? '',
                'description_en' => $rl->description ?? '',
                'image_url' => $img,
                'created_at' => $rl->created_at ?? now(),
                'updated_at' => $rl->updated_at ?? now(),
            ]);
        }

        DB::table('tickets')->truncate();
        $sourceTickets = DB::table("{$sourceDb}.tickets")->orderBy('id')->get();
        foreach ($sourceTickets as $t) {
            $ticketNumber = (int) preg_replace('/\D/', '', $t->title) ?: (int) $t->id;
            DB::table('tickets')->insert([
                'id' => $t->id,
                'ticket_number' => $ticketNumber,
                'title_uz' => $t->title,
                'title_ru' => 'Билет '.$ticketNumber,
                'title_krill' => 'Билет '.$ticketNumber,
                'title_en' => 'Ticket '.$ticketNumber,
                'description' => $t->description,
                'is_active' => (bool) $t->is_active,
                'created_at' => $t->created_at ?? now(),
                'updated_at' => $t->updated_at ?? now(),
            ]);
        }

        DB::table('questions')->truncate();
        DB::table('answers')->truncate();

        $sourceQuestions = DB::table("{$sourceDb}.questions")->orderBy('id')->get();
        $ticketQuestionCounters = [];
        $questionsBatch = [];

        foreach ($sourceQuestions as $q) {
            if (! isset($ticketQuestionCounters[$q->ticket_id])) {
                $ticketQuestionCounters[$q->ticket_id] = 1;
            } else {
                $ticketQuestionCounters[$q->ticket_id]++;
            }

            $qNum = $ticketQuestionCounters[$q->ticket_id];
            $img = $q->image_url ? '/storage/'.ltrim($q->image_url, '/') : null;

            $questionsBatch[] = [
                'id' => $q->id,
                'ticket_id' => $q->ticket_id,
                'question_number' => $qNum,
                'question_uz' => $q->title ?? '',
                'question_ru' => $q->title ?? '',
                'question_krill' => $q->title ?? '',
                'question_en' => $q->title ?? '',
                'description_uz' => $q->description ?? '',
                'description_ru' => $q->description ?? '',
                'description_krill' => $q->description ?? '',
                'description_en' => $q->description ?? '',
                'image_url' => $img,
                'audio_url_uz' => null,
                'audio_url_ru' => null,
                'audio_url_krill' => null,
                'audio_url_en' => null,
                'is_active' => (bool) $q->is_active,
                'created_at' => $q->created_at ?? now(),
                'updated_at' => $q->updated_at ?? now(),
            ];
        }
        foreach (array_chunk($questionsBatch, 50) as $chunk) {
            DB::table('questions')->insert($chunk);
        }

        $sourceAnswers = DB::table("{$sourceDb}.answers")->orderBy('id')->get();
        $answersBatch = [];
        $questionAnswerOrder = [];

        foreach ($sourceAnswers as $a) {
            if (! isset($questionAnswerOrder[$a->question_id])) {
                $questionAnswerOrder[$a->question_id] = 1;
            } else {
                $questionAnswerOrder[$a->question_id]++;
            }

            $order = $questionAnswerOrder[$a->question_id];

            $answersBatch[] = [
                'id' => $a->id,
                'question_id' => $a->question_id,
                'answer_uz' => $a->title ?? '',
                'answer_ru' => $a->title ?? '',
                'answer_krill' => $a->title ?? '',
                'answer_en' => $a->title ?? '',
                'is_correct' => (bool) $a->is_correct,
                'order' => $order,
                'created_at' => $a->created_at ?? now(),
                'updated_at' => $a->updated_at ?? now(),
            ];
        }
        foreach (array_chunk($answersBatch, 50) as $chunk) {
            DB::table('answers')->insert($chunk);
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->info('🎉 Test Data Import Completed Successfully!');

        return Command::SUCCESS;
    }
}
