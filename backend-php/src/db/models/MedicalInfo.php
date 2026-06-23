<?php

namespace Db\Models;

class MedicalInfo {
    public ?string $visionwithpg = null;
    public ?string $chiefcomplaint = null;
    public ?string $presentingillness = null;
    public ?string $pastHistory = null;
    public ?string $personalHistory = null;
    public ?string $familyHistory = null;
    public ?string $drugHistory = null;
    public ?string $allergyHistory = null;
    public ?string $bp = null;
    public ?string $pr = null;
    public ?string $temp = null;
    public ?string $respirationrate = null;
    public ?string $notes = null;

    public function __construct(
        ?string $visionwithpg = null,
        ?string $chiefcomplaint = null,
        ?string $presentingillness = null,
        ?string $pastHistory = null,
        ?string $personalHistory = null,
        ?string $familyHistory = null,
        ?string $drugHistory = null,
        ?string $allergyHistory = null,
        ?string $bp = null,
        ?string $pr = null,
        ?string $temp = null,
        ?string $respirationrate = null,
        ?string $notes = null
    ) {
        $this->visionwithpg = $visionwithpg;
        $this->chiefcomplaint = $chiefcomplaint;
        $this->presentingillness = $presentingillness;
        $this->pastHistory = $pastHistory;
        $this->personalHistory = $personalHistory;
        $this->familyHistory = $familyHistory;
        $this->drugHistory = $drugHistory;
        $this->allergyHistory = $allergyHistory;
        $this->bp = $bp;
        $this->pr = $pr;
        $this->temp = $temp;
        $this->respirationrate = $respirationrate;
        $this->notes = $notes;
    }

    public static function fromArray(array $data): self {
        return new self(
            $data["visionwithpg"] ?? null,
            $data["chiefcomplaint"] ?? null,
            $data["presentingillness"] ?? null,
            $data["pastHistory"] ?? null,
            $data["personalHistory"] ?? null,
            $data["familyHistory"] ?? null,
            $data["drugHistory"] ?? null,
            $data["allergyHistory"] ?? null,
            $data["bp"] ?? null,
            $data["pr"] ?? null,
            $data["temp"] ?? null,
            $data["respirationrate"] ?? null,
            $data["notes"] ?? null
        );
    }

    public function toArray(): array {
        return [
            "visionwithpg" => $this->visionwithpg,
            "chiefcomplaint" => $this->chiefcomplaint,
            "presentingillness" => $this->presentingillness,
            "pastHistory" => $this->pastHistory,
            "personalHistory" => $this->personalHistory,
            "familyHistory" => $this->familyHistory,
            "drugHistory" => $this->drugHistory,
            "allergyHistory" => $this->allergyHistory,
            "bp" => $this->bp,
            "pr" => $this->pr,
            "temp" => $this->temp,
            "respirationrate" => $this->respirationrate,
            "notes" => $this->notes,
        ];
    }
}
