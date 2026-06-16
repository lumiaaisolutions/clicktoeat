<?php

namespace App\Support;

use App\Models\Local;

class TenantContext
{
    protected ?int $localId = null;
    protected ?Local $cachedLocal = null;

    public function set(?int $localId): void
    {
        $this->localId = $localId;
        $this->cachedLocal = null;
    }

    public function id(): ?int
    {
        return $this->localId;
    }

    public function local(): ?Local
    {
        if ($this->localId === null) {
            return null;
        }
        if ($this->cachedLocal && $this->cachedLocal->id === $this->localId) {
            return $this->cachedLocal;
        }
        return $this->cachedLocal = Local::withoutGlobalScopes()->find($this->localId);
    }

    public function has(): bool
    {
        return $this->localId !== null;
    }

    public function clear(): void
    {
        $this->localId = null;
        $this->cachedLocal = null;
    }
}
