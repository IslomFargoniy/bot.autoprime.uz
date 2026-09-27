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
    protected $signature = 'tests:import {--source-db=p24_temp : Source database name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import tickets, questions, answers, signs, and road_lines from temporary database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $sourceDb = $this->option('source-db');

        $this->info("Importing test and exam data from database `{$sourceDb}`...");

        // 1. Verify source tables exist
        $tables = DB::select("SHOW TABLES FROM `{$sourceDb}`");
        if (empty($tables)) {
            $this->error("No tables found in `{$sourceDb}`.");

            return Command::FAILURE;
        }

        // 2. Import Sign Categories
        $this->info('1/5 Importing Sign Categories...');
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
        $this->info('   Imported '.count($sourceCats).' sign categories.');

        // 3. Import Signs
        $this->info('2/5 Importing Signs...');
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
        $this->info('   Imported '.count($sourceSigns).' signs.');

        // 4. Import Road Lines
        $this->info('3/5 Importing Road Lines...');
        DB::table('road_lines')->truncate();
        $sourceRoadLines = DB::table("{$sourceDb}.road_lines")->orderBy('id')->get();
        foreach ($sourceRoadLines as $rl) {
            $img = $rl->image_url ? '/storage/'.ltrim($rl->image_url, '/') : null;

            DB::table('road_lines')->insert([
                'id' => $rl->id,
                'number' => $rl->title ?: (string) $rl->id,
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
        $this->info('   Imported '.count($sourceRoadLines).' road lines.');

        // 5. Import Tickets
        $this->info('4/5 Importing Tickets...');
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
        $this->info('   Imported '.count($sourceTickets).' tickets.');

        // 6. Import Questions & Answers
        $this->info('5/5 Importing Questions and Answers...');
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

            if (count($questionsBatch) >= 200) {
                DB::table('questions')->insert($questionsBatch);
                $questionsBatch = [];
            }
        }
        if (! empty($questionsBatch)) {
            DB::table('questions')->insert($questionsBatch);
        }
        $this->info('   Imported '.count($sourceQuestions).' questions.');

        // Answers
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

            if (count($answersBatch) >= 500) {
                DB::table('answers')->insert($answersBatch);
                $answersBatch = [];
            }
        }
        if (! empty($answersBatch)) {
            DB::table('answers')->insert($answersBatch);
        }
        $this->info('   Imported '.count($sourceAnswers).' answers.');

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->info('🎉 Test Data Import Completed Successfully!');

        return Command::SUCCESS;
    }
}
