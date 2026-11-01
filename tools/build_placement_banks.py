#!/usr/bin/env python3
"""Rebuild placement/data/conversation.json and phonics.json from MRJ source repos."""
from __future__ import annotations

import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_CONV = ROOT / "placement/data/conversation.json"
OUT_PHON = ROOT / "placement/data/phonics.json"

DAY5 = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/sources/day5-practice")
DECOD = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/tmp/sources/mrj-decodable-try")

CONV_BANDS = [
    "Band 1 (Basic A)",
    "Band 2 (Basic B)",
    "Band 3 (Basic C)",
    "Band 4 (Int 3)",
    "Band 5 (Int 2 low)",
    "Band 6 (Int 2 high)",
]

PHON_BANDS = ["Band 1", "Band 2", "Band 3", "Band 4", "Band 5", "Band 6"]

CONV_SOURCES: dict[int, list[Path]] = {
    1: list((DAY5 / "basic_a").rglob("questions.json")),
    2: list((DAY5 / "basic_b").rglob("questions.json")),
    3: list((DAY5 / "basic_c").rglob("questions.json")),
    4: list((DAY5 / "int3_review").rglob("questions.json"))
    + list((DAY5 / "staging/INT3A").rglob("questions.json")),
    5: list((DAY5 / "int2_review/u1").rglob("questions.json"))
    + list((DAY5 / "int2_review/u2").rglob("questions.json"))
    + list((DAY5 / "staging/INT2A").rglob("questions.json")),
    6: list((DAY5 / "int2_review/u3").rglob("questions.json"))
    + list((DAY5 / "int2_review/u4").rglob("questions.json"))
    + list((DAY5 / "staging/INT2B").rglob("questions.json"))
    + list((DAY5 / "staging/INT2C").rglob("questions.json")),
}

PREFERRED_TYPES = (4, 5, 7, 2, 6, 1)
RNG = random.Random(42)


def looks_like_asset_id(c: str) -> bool:
    if not isinstance(c, str):
        return True
    if c.startswith("pic_") or c.startswith("int2") or c.startswith("int3"):
        return True
    return "draw-monster" in c or c.endswith(".webp")


def choice_text(q: dict, c: str) -> str:
    labels = q.get("choice_labels") or {}
    if c in labels:
        return str(labels[c]).strip()
    if looks_like_asset_id(c):
        tail = c.split("_", 1)[-1] if "_" in c else c
        return tail.replace("-", " ").replace("_", " ").strip()
    return str(c).strip()


def choices_are_text(q: dict) -> bool:
    labels = q.get("choice_labels")
    for c in q.get("choices") or []:
        if labels and c in labels:
            continue
        if looks_like_asset_id(c):
            return False
    return len(q.get("choices") or []) >= 2


def format_prompt(q: dict) -> str:
    pt = (q.get("prompt_text") or "").strip()
    repl = {
        "Listen. Click the matching picture.": "Choose the answer that matches the sentence.",
        "Listen. Click the correct English word.": "Which English word fits?",
        "Look at the picture. Click the correct English word.": "Which English word fits?",
        "Listen. Click the correct word.": "Which word do you hear? (Imagine the audio.)",
        "Listen. Click the correct sentence.": "Which sentence do you hear? (Imagine the audio.)",
    }
    for old, new in repl.items():
        pt = pt.replace(old, new)
    pt = re.sub(r"\s+", " ", pt)
    return pt or "Choose the best answer."


def to_placement_item(q: dict, band: int) -> dict | None:
    if q.get("type") not in PREFERRED_TYPES:
        return None
    if not choices_are_text(q):
        return None
    raw_choices = q.get("choices") or []
    if len(raw_choices) < 2:
        return None
    correct_key = q.get("correct")
    if correct_key not in raw_choices:
        return None
    choices = [choice_text(q, c) for c in raw_choices]
    correct_idx = raw_choices.index(correct_key)
    if len(set(choices)) < len(choices):
        return None
    stem = format_prompt(q)
    return {
        "band": band,
        "q": stem,
        "choices": choices,
        "answer": correct_idx,
        "source_id": q.get("id"),
    }


def spread_answers(items: list[dict]) -> None:
    """Light shuffle so stored keys are not all index 0."""
    for it in items:
        idx = it["answer"]
        choices = it["choices"][:]
        correct = choices[idx]
        others = [c for i, c in enumerate(choices) if i != idx]
        RNG.shuffle(others)
        pos = RNG.randrange(len(choices))
        new_choices = others[:pos] + [correct] + others[pos:]
        it["choices"] = new_choices
        it["answer"] = pos


def build_conversation() -> dict:
    items: list[dict] = []
    seen_stems: set[str] = set()
    per_band = 10
    for band in range(1, 7):
        collected: list[dict] = []
        paths = sorted(set(CONV_SOURCES.get(band, [])))
        typed: list[tuple[int, dict]] = []
        for path in paths:
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            for q in data.get("questions") or []:
                it = to_placement_item(q, band)
                if not it or it["q"] in seen_stems:
                    continue
                typed.append((q.get("type", 99), it))
        typed.sort(key=lambda t: (PREFERRED_TYPES.index(t[0]) if t[0] in PREFERRED_TYPES else 99, t[1].get("source_id", "")))
        for _, it in typed:
            if len(collected) >= per_band:
                break
            if it["q"] in seen_stems:
                continue
            seen_stems.add(it["q"])
            collected.append(it)
        if len(collected) < per_band:
            raise SystemExit(f"Band {band}: only {len(collected)} conversation items (need {per_band})")
        spread_answers(collected)
        for it in collected:
            it.pop("source_id", None)
        items.extend(collected)
    return {
        "note": "Sourced from MRJ day5-practice (Day 5 content).",
        "bands": CONV_BANDS,
        "items": items,
    }


VOWEL_POOL = list("AEIOU")
CONSONANT_POOL = list("BCDFGHJKLMNPQRSTVWXYZ")


def parse_sound(sound: str) -> tuple[list[str], list[str]]:
    vowels: list[str] = []
    consonants: list[str] = []
    s = (sound or "").strip()
    if s.startswith("+") and len(s) >= 2:
        letter = s[1:2].upper()
        if letter in VOWEL_POOL:
            vowels.append(letter)
        else:
            consonants.append(letter)
        return vowels, consonants
    for part in s.split("·"):
        part = part.strip()
        if part.lower().startswith("short vowel"):
            letter = part.split()[-1].strip().upper()[:1]
            if letter:
                vowels.append(letter)
        elif "consonant" in part.lower():
            letter = part.split()[-1].strip().upper()[:1]
            if letter:
                consonants.append(letter)
    return vowels, consonants


def load_library_sounds(decod: Path) -> dict[str, str]:
    lib_path = decod / "assets/decodable_library.json"
    if not lib_path.is_file():
        return {}
    data = json.loads(lib_path.read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    for entry in data.get("books") or []:
        bid = entry.get("id")
        if bid:
            out[bid] = entry.get("sound") or ""
    return out


def clean_page_text(text: str) -> str:
    t = text.strip().strip('"')
    t = re.sub(r"\s+", " ", t)
    return t


def pick_distractors(correct: str, pool: list[str], n: int) -> list[str]:
    opts = [p for p in pool if p != correct and len(p) > 1]
    RNG.shuffle(opts)
    out: list[str] = []
    for p in opts:
        if p not in out:
            out.append(p)
        if len(out) >= n:
            break
    return out


def mc_item(band: int, q: str, choices: list[str], answer: int, kind: str) -> dict:
    return {"band": band, "type": kind, "q": q, "choices": choices, "answer": answer}


def build_phonics() -> dict:
    align_files = sorted((DECOD / "assets").glob("align_mlr_dec_*.json"))
    if len(align_files) < 20:
        raise SystemExit(f"Expected 20 decodable align files, found {len(align_files)}")
    lib_sounds = load_library_sounds(DECOD)
    books = [json.loads(p.read_text(encoding="utf-8")) for p in align_files]
    for b in books:
        if (b.get("sound") or "").startswith("+") and b.get("book_id") in lib_sounds:
            b["sound"] = lib_sounds[b["book_id"]]
    all_page_lines = [
        clean_page_text(pg["text"])
        for b in books
        for pg in b.get("pages") or []
        if clean_page_text(pg["text"])
    ]
    items: list[dict] = []
    seen_q: set[str] = set()
    books_per_band = 4
    for band in range(1, 6):
        start = (band - 1) * books_per_band
        band_books = books[start : start + books_per_band]
        band_lines = [
            clean_page_text(pg["text"])
            for b in band_books
            for pg in b.get("pages") or []
            if clean_page_text(pg["text"])
        ]
        band_items: list[dict] = []
        for book in band_books:
            title = book.get("title") or book.get("book_id", "")
            dec = book.get("level") or ""
            vowels, consonants = parse_sound(book.get("sound") or "")
            if vowels:
                v = vowels[0]
                distractors = [x for x in VOWEL_POOL if x != v]
                RNG.shuffle(distractors)
                choices = [v] + distractors[:3]
                RNG.shuffle(choices)
                q = f'Which vowel sound is a focus in Decodable {dec} (“{title}”)?'
                if q not in seen_q:
                    band_items.append(
                        mc_item(band, q, choices, choices.index(v), "letter")
                    )
                    seen_q.add(q)
            for c in consonants[:2]:
                in_book = set(consonants + vowels)
                distractors = [x for x in CONSONANT_POOL if x not in in_book]
                RNG.shuffle(distractors)
                choices = [c] + distractors[:3]
                RNG.shuffle(choices)
                q = f'Which consonant is introduced in Decodable {dec} (“{title}”)? ({c} sound)'
                if q not in seen_q:
                    band_items.append(
                        mc_item(band, q, choices, choices.index(c), "letter")
                    )
                    seen_q.add(q)
            for fw in book.get("famous") or []:
                if not fw or len(fw) > 12:
                    continue
                word = str(fw).strip()
                short_words = sorted(
                    {
                        w
                        for line in all_page_lines
                        for w in re.findall(r"[A-Za-z']+", line)
                        if 2 <= len(w) <= 8
                    }
                )
                distractors = pick_distractors(word, short_words, 3)
                if len(distractors) < 3:
                    continue
                choices = [word] + distractors[:3]
                RNG.shuffle(choices)
                q = f'Which word is a sight-word focus in Decodable {dec} (“{title}”)?'
                if q not in seen_q:
                    band_items.append(
                        mc_item(band, q, choices, choices.index(word), "letter")
                    )
                    seen_q.add(q)
            pages = [clean_page_text(pg["text"]) for pg in book.get("pages") or []]
            pages = [p for p in pages if len(p) > 2]
            for pi, correct in enumerate(pages[:3], start=1):
                distractors = pick_distractors(correct, band_lines + all_page_lines, 3)
                if len(distractors) < 3:
                    continue
                choices = [correct] + distractors
                RNG.shuffle(choices)
                q = f'Which sentence appears on page {pi} of Decodable {dec} (“{title}”)?'
                if q in seen_q:
                    continue
                band_items.append(
                    mc_item(band, q, choices, choices.index(correct), "decode")
                )
                seen_q.add(q)
        RNG.shuffle(band_items)
        if len(band_items) < 10:
            raise SystemExit(f"Phonics band {band}: only {len(band_items)} items")
        items.extend(band_items[:10])
    spread_answers(items)
    return {
        "note": "Based on MRJ Decodable Books letter/sound map (not Day 4 Pronounce).",
        "bands": PHON_BANDS,
        "items": items,
    }


def validate_bank(bank: dict, name: str) -> None:
    stems: set[str] = set()
    for it in bank.get("items") or []:
        ch = it.get("choices") or []
        ans = it.get("answer")
        if not isinstance(ans, int) or ans < 0 or ans >= len(ch):
            raise SystemExit(f"{name}: bad answer index for {it.get('q')!r}")
        if len(ch) != len(set(ch)):
            raise SystemExit(f"{name}: duplicate choices in {it.get('q')!r}")
        stem = it.get("q", "")
        if stem in stems:
            raise SystemExit(f"{name}: duplicate stem {stem!r}")
        stems.add(stem)
        if any(isinstance(c, str) and c.startswith(".") and c[1:2].isupper() for c in ch):
            raise SystemExit(f"{name}: reversed/garbled choice in {stem!r}")


def main() -> None:
    if not DAY5.is_dir() or not DECOD.is_dir():
        print("Usage: build_placement_banks.py [day5-practice-path] [mrj-decodable-try-path]", file=sys.stderr)
        sys.exit(1)
    conv = build_conversation()
    phon = build_phonics()
    validate_bank(conv, "conversation")
    validate_bank(phon, "phonics")
    OUT_CONV.write_text(json.dumps(conv, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    OUT_PHON.write_text(json.dumps(phon, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_CONV} ({len(conv['items'])} items)")
    print(f"Wrote {OUT_PHON} ({len(phon['items'])} items)")


if __name__ == "__main__":
    main()
