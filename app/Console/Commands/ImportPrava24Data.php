<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportPrava24Data extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'prava24:import {--source-db=p24_temp : Source database name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import tickets, questions, answers, signs, and road_lines from panel.prava24.uz temporary database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $sourceDb = $this->option('source-db');

        $this->info("Checking source database `{$sourceDb}`...");
        $tables = DB::select("SHOW TABLES FROM `{$sourceDb}`");
        if (empty($tables)) {
            $this->error("No tables found in `{$sourceDb}`.");
            return Command::FAILURE;
        }

        $this->info("Transforming and importing data from `{$sourceDb}` into AutoPrime database...");

        DB::statement('SET FOREIGN_KEY_CHECKS = 0;');

        // 1. Sign Categories
        $this->line('Importing sign categories...');
        DB::table('sign_categories')->truncate();
        $sourceCategories = DB::table("{$sourceDb}.sign_categories")->orderBy('id')->get();
        foreach ($sourceCategories as $cat) {
            DB::table('sign_categories')->insert([
                'id' => $cat->id,
                'name_uz' => $cat->name,
                'name_ru' => $cat->name,
                'name_krill' => $cat->name,
                'name_en' => $cat->name,
                'slug' => Str::slug($cat->name) . '-' . $cat->id,
                'order' => $cat->id,
                'created_at' => $cat->created_at ?? now(),
                'updated_at' => $cat->updated_at ?? now(),
            ]);
        }

        // 2. Signs
        $this->line('Importing traffic signs...');
        DB::table('signs')->truncate();
        $sourceSigns = DB::table("{$sourceDb}.signs")->orderBy('id')->get();
        foreach ($sourceSigns as $s) {
            $signNumber = (string) $s->id;
            $nameUz = $s->content;

            if (preg_match('/^([0-9\.]+)\s*(.*)$/u', $s->content, $matches)) {
                $signNumber = trim($matches[1]);
                $nameUz = trim($matches[2]) ?: $signNumber;
            }

            $img = $s->image_url ? '/storage/' . ltrim($s->image_url, '/') : null;

            DB::table('signs')->insert([
                'id' => $s->id,
                'category_id' => $s->sign_category_id,
                'sign_number' => $signNumber,
                'name_uz' => $nameUz,
                'name_ru' => $nameUz,
                'name_krill' => $nameUz,
                'name_en' => $nameUz,
                'description_uz' => $nameUz,
                'description_ru' => $nameUz,
                'description_krill' => $nameUz,
                'description_en' => $nameUz,
                'image_url' => $img,
                'order' => $s->id,
                'created_at' => $s->created_at ?? now(),
                'updated_at' => $s->updated_at ?? now(),
            ]);
        }

        // 3. Road Lines
        $this->line('Importing road lines...');
        DB::table('road_lines')->truncate();
        $sourceRoadLines = DB::table("{$sourceDb}.road_lines")->orderBy('id')->get();
        foreach ($sourceRoadLines as $rl) {
            $img = $rl->image_url ? '/storage/' . ltrim($rl->image_url, '/') : null;

            DB::table('road_lines')->insert([
                'id' => $rl->id,
                'line_number' => $rl->name,
                'name_uz' => $rl->name,
                'name_ru' => $rl->name,
                'name_krill' => $rl->name,
                'name_en' => $rl->name,
                'description_uz' => $rl->description,
                'description_ru' => $rl->description,
                'description_krill' => $rl->description,
                'description_en' => $rl->description,
                'image_url' => $img,
                'created_at' => $rl->created_at ?? now(),
                'updated_at' => $rl->updated_at ?? now(),
            ]);
        }

        // 4. Tickets
        $this->line('Importing tickets...');
        DB::table('tickets')->truncate();
        $sourceTickets = DB::table("{$sourceDb}.tickets")->orderBy('id')->get();
        foreach ($sourceTickets as $t) {
            $ticketNumber = (int) preg_replace('/[^0-9]/', '', $t->title) ?: (int) $t->id;

            DB::table('tickets')->insert([
                'id' => $t->id,
                'ticket_number' => $ticketNumber,
                'title_uz' => $t->title,
                'title_ru' => 'Билет ' . $ticketNumber,
                'title_krill' => 'Билет ' . $ticketNumber,
                'title_en' => 'Ticket ' . $ticketNumber,
                'description' => $t->description,
                'is_active' => (bool) $t->is_active,
                'created_at' => $t->created_at ?? now(),
                'updated_at' => $t->updated_at ?? now(),
            ]);
        }

        // 5. Questions
        $this->line('Importing questions...');
        DB::table('questions')->truncate();
        $sourceQuestions = DB::table("{$sourceDb}.questions")->orderBy('ticket_id')->orderBy('id')->get();

        $ticketQuestionCounters = [];
        $questionsBatch = [];

        foreach ($sourceQuestions as $q) {
            if (! isset($ticketQuestionCounters[$q->ticket_id])) {
                $ticketQuestionCounters[$q->ticket_id] = 1;
            } else {
                $ticketQuestionCounters[$q->ticket_id]++;
            }

            $qNum = $ticketQuestionCounters[$q->ticket_id];
            $img = $q->image_url ? '/storage/' . ltrim($q->image_url, '/') : null;

            $questionsBatch[] = [
                'id' => $q->id,
                'ticket_id' => $q->ticket_id,
                'question_number' => $qNum,
                'question_uz' => $q->content,
                'question_ru' => $q->content,
                'question_krill' => $q->content,
                'question_en' => $q->content,
                'description_uz' => $q->description,
                'description_ru' => $q->description,
                'description_krill' => $q->description,
                'description_en' => $q->description,
                'image_url' => $img,
                'audio_url_uz' => null,
                'audio_url_ru' => null,
                'audio_url_krill' => null,
                'audio_url_en' => null,
                'is_active' => true,
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

        // 6. Answers
        $this->line('Importing answers...');
        DB::table('answers')->truncate();
        $sourceAnswers = DB::table("{$sourceDb}.answers")->orderBy('question_id')->orderBy('id')->get();

        $questionAnswerCounters = [];
        $answersBatch = [];

        foreach ($sourceAnswers as $a) {
            if (! isset($questionAnswerCounters[$a->question_id])) {
                $questionAnswerCounters[$a->question_id] = 1;
            } else {
                $questionAnswerCounters[$a->question_id]++;
            }

            $order = $questionAnswerCounters[$a->question_id];

            $answersBatch[] = [
                'id' => $a->id,
                'question_id' => $a->question_id,
                'answer_uz' => $a->content,
                'answer_ru' => $a->content,
                'answer_krill' => $a->content,
                'answer_en' => $a->content,
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

        DB::statement('SET FOREIGN_KEY_CHECKS = 1;');

        $ticketsCount = DB::table('tickets')->count();
        $questionsCount = DB::table('questions')->count();
        $answersCount = DB::table('answers')->count();
        $signsCount = DB::table('signs')->count();
        $categoriesCount = DB::table('sign_categories')->count();
        $roadLinesCount = DB::table('road_lines')->count();

        $this->info('🎉 Prava24 Import Completed Successfully!');
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
}
