<?php

namespace App\Services;

use App\Models\Driving;
use App\Models\Review;

class DrivingReviewService
{
    public const MIN_RATING = 1;

    public const MAX_RATING = 5;

    /**
     * Why the Telegram user may not rate this driving, or null when allowed.
     *
     * Callback data can be forged by a client, so every rating callback must
     * re-check ownership, lesson status, rating bounds and that the lesson has
     * not been reviewed yet.
     */
    public function rejectionReason(?Driving $driving, int|string|null $telegramUserId, int|string|null $rating = null): ?string
    {
        if (! $driving) {
            return "Mashg'ulot topilmadi.";
        }

        $student = $driving->student;
        if (! $student || $telegramUserId === null || (string) $student->telegram_id !== (string) $telegramUserId) {
            return "Bu sizning mashg'ulotingiz emas.";
        }

        if ($driving->status !== 'completed') {
            return "Faqat yakunlangan mashg'ulotni baholash mumkin.";
        }

        if ($rating !== null && ! $this->isValidRating($rating)) {
            return "Noto'g'ri baho.";
        }

        if ($driving->review()->exists()) {
            return "Siz bu mashg'ulotni allaqachon baholagansiz.";
        }

        return null;
    }

    public function isValidRating(int|string $rating): bool
    {
        return filter_var($rating, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => self::MIN_RATING, 'max_range' => self::MAX_RATING],
        ]) !== false;
    }

    /**
     * Store the review once; a second submission for the same driving is ignored.
     *
     * @param  array<int, string>  $reasonTags
     */
    public function store(Driving $driving, int $rating, array $reasonTags): Review
    {
        return Review::firstOrCreate(
            ['driving_id' => $driving->id],
            ['rating' => $rating, 'reason_tags' => $reasonTags],
        );
    }

    /**
     * Whether this Telegram user owns the driving (used for comment/skip steps).
     */
    public function isOwner(?Driving $driving, int|string|null $telegramUserId): bool
    {
        return $driving?->student !== null
            && $telegramUserId !== null
            && (string) $driving->student->telegram_id === (string) $telegramUserId;
    }
}
