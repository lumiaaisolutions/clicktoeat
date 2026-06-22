<?php

namespace App\Policies;

use App\Models\Review;
use App\Models\User;

/**
 * SEV-12 — autorización de los endpoints admin de Review.
 *
 * Los endpoints públicos (indexForLocal, showByToken, submitByToken) NO usan
 * esta policy — son acceso público gated por slug/token.
 */
class ReviewPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->isOwner() && $user->local_id !== null;
    }

    public function update(User $user, Review $review): bool
    {
        return $user->isOwner() && $user->local_id === $review->local_id;
    }

    public function delete(User $user, Review $review): bool
    {
        return $user->isOwner() && $user->local_id === $review->local_id;
    }
}
