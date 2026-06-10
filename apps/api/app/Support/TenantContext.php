<?php

namespace App\Support;

class TenantContext
{
    protected ?int $localId = null;

    public function set(?int $localId): void
    {
        $this->localId = $localId;
    }

    public function id(): ?int
    {
        return $this->localId;
    }

    public function has(): bool
    {
        return $this->localId !== null;
    }

    public function clear(): void
    {
        $this->localId = null;
    }
}
