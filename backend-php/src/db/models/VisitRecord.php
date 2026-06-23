<?php

namespace Db\Models;

class VisitRecord {
    public ?string $date = null;
    public ?string $pmtvisiontpg = null;
    public ?string $pgpower = null;
    public ?string $pmt = null;
    public ?string $pda = null;
    public ?string $adar = null;
    public ?string $dryretinoscopy = null;
    public ?string $wetretinoscopy = null;
    public ?string $bcvanear = null;
    public ?string $bcvadistant = null;
    public ?string $nct = null;
    public ?string $colorvision = null;
    public ?string $ar = null;
    public ?string $visiondistant = null;
    public ?string $visionnear = null;
    public ?string $glassPrescription = null;
    public ?string $notes = null;

    public function __construct(
        ?string $date = null,
        ?string $pmtvisiontpg = null,
        ?string $pgpower = null,
        ?string $pmt = null,
        ?string $pda = null,
        ?string $adar = null,
        ?string $dryretinoscopy = null,
        ?string $wetretinoscopy = null,
        ?string $bcvanear = null,
        ?string $bcvadistant = null,
        ?string $nct = null,
        ?string $colorvision = null,
        ?string $ar = null,
        ?string $visiondistant = null,
        ?string $visionnear = null,
        ?string $glassPrescription = null,
        ?string $notes = null
    ) {
        $this->date = $date ?? date("Y-m-d H:i:s");
        $this->pmtvisiontpg = $pmtvisiontpg;
        $this->pgpower = $pgpower;
        $this->pmt = $pmt;
        $this->pda = $pda;
        $this->adar = $adar;
        $this->dryretinoscopy = $dryretinoscopy;
        $this->wetretinoscopy = $wetretinoscopy;
        $this->bcvanear = $bcvanear;
        $this->bcvadistant = $bcvadistant;
        $this->nct = $nct;
        $this->colorvision = $colorvision;
        $this->ar = $ar;
        $this->visiondistant = $visiondistant;
        $this->visionnear = $visionnear;
        $this->glassPrescription = $glassPrescription;
        $this->notes = $notes;
    }

    public static function fromArray(array $data): self {
        return new self(
            $data["date"] ?? null,
            $data["pmtvisiontpg"] ?? null,
            $data["pgpower"] ?? null,
            $data["pmt"] ?? null,
            $data["pda"] ?? null,
            $data["adar"] ?? null,
            $data["dryretinoscopy"] ?? null,
            $data["wetretinoscopy"] ?? null,
            $data["bcvanear"] ?? null,
            $data["bcvadistant"] ?? null,
            $data["nct"] ?? null,
            $data["colorvision"] ?? null,
            $data["ar"] ?? null,
            $data["visiondistant"] ?? null,
            $data["visionnear"] ?? null,
            $data["glassPrescription"] ?? null,
            $data["notes"] ?? null
        );
    }

    public function toArray(): array {
        return [
            "date" => $this->date,
            "pmtvisiontpg" => $this->pmtvisiontpg,
            "pgpower" => $this->pgpower,
            "pmt" => $this->pmt,
            "pda" => $this->pda,
            "adar" => $this->adar,
            "dryretinoscopy" => $this->dryretinoscopy,
            "wetretinoscopy" => $this->wetretinoscopy,
            "bcvanear" => $this->bcvanear,
            "bcvadistant" => $this->bcvadistant,
            "nct" => $this->nct,
            "colorvision" => $this->colorvision,
            "ar" => $this->ar,
            "visiondistant" => $this->visiondistant,
            "visionnear" => $this->visionnear,
            "glassPrescription" => $this->glassPrescription,
            "notes" => $this->notes,
        ];
    }
}
