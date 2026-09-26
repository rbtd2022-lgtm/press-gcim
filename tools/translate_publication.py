#!/usr/bin/env python3
"""
GCIM Press Office translation pipeline.

The pipeline does not contain or expose an AI/API key.
It prepares strict translation jobs from translations.ru and can optionally
send each job to an external translator command over stdin/stdout.

Translator command contract:
  stdin  -> one JSON translation job
  stdout -> one JSON object:
            {
              "targetLanguage": "...",
              "translation": {
                "title": "...",
                "body": [...],
                "serviceInfo": [...],
                "links": [...],
                "attachments": [...]
              }
            }

Generated translations are set to status "review", never "approved".
"""

from __future__ import annotations

import argparse
import copy
import json
import subprocess
import sys
from pathlib import Path

LANGUAGES = ["en", "ar", "es", "zh", "ru", "fr", "uk"]
TARGET_LANGUAGES = ["en", "ar", "es", "zh", "fr", "uk"]
SOURCE_LANGUAGE = "ru"
ALLOWED_BODY_TYPES = {"paragraph", "heading", "quote", "list"}

ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / "content" / "translation-policy.json"


class PipelineError(RuntimeError):
    pass


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise PipelineError(f"File not found: {path}")
    except json.JSONDecodeError as exc:
        raise PipelineError(f"Invalid JSON in {path}: {exc}")


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def validate_source(publication):
    if publication.get("sourceLanguage") != SOURCE_LANGUAGE:
        raise PipelineError("sourceLanguage must be 'ru'.")

    translations = publication.get("translations")
    if not isinstance(translations, dict):
        raise PipelineError("translations must be an object.")

    source = translations.get(SOURCE_LANGUAGE)
    if not isinstance(source, dict):
        raise PipelineError("translations.ru is required.")

    if not str(source.get("title", "")).strip():
        raise PipelineError("translations.ru.title is required.")

    body = source.get("body")
    if not isinstance(body, list) or not body:
        raise PipelineError("translations.ru.body must contain the full Russian official text.")

    for i, block in enumerate(body):
        if not isinstance(block, dict) or block.get("type") not in ALLOWED_BODY_TYPES:
            raise PipelineError(f"Invalid Russian body block at index {i}.")

        if block["type"] == "list":
            if not isinstance(block.get("items"), list):
                raise PipelineError(f"Russian list block {i} requires items[].")
        elif not isinstance(block.get("text"), str):
            raise PipelineError(f"Russian body block {i} requires text.")

    statuses = publication.get("translationStatus")
    if not isinstance(statuses, dict):
        raise PipelineError("translationStatus is required.")

    missing = [lang for lang in LANGUAGES if lang not in statuses]
    if missing:
        raise PipelineError("translationStatus missing: " + ", ".join(missing))

    return source


def load_policy():
    policy_doc = load_json(POLICY_PATH)
    policy = policy_doc.get("translationPolicy")
    if not isinstance(policy, dict):
        raise PipelineError("translation-policy.json is missing translationPolicy.")
    if policy.get("sourceLanguage") != SOURCE_LANGUAGE:
        raise PipelineError("translation policy sourceLanguage must be 'ru'.")
    return policy


def make_job(publication, target_language, policy):
    if target_language not in TARGET_LANGUAGES:
        raise PipelineError(f"Unsupported target language: {target_language}")

    source = validate_source(publication)

    registers = policy.get("registers", {})
    target_register = registers.get(target_language)
    if not target_register:
        raise PipelineError(f"No diplomatic register policy for {target_language}.")

    return {
        "publicationId": publication.get("id", ""),
        "sourceLanguage": SOURCE_LANGUAGE,
        "targetLanguage": target_language,
        "source": copy.deepcopy(source),
        "policy": {
            "corePrinciple": policy.get("corePrinciple", ""),
            "registerPriorityRule": policy.get("registerPriorityRule", ""),
            "prohibitedRegisterSubstitution": policy.get("prohibitedRegisterSubstitution", ""),
            "targetRegister": target_register,
            "generalRules": copy.deepcopy(policy.get("generalRules", [])),
            "prohibited": copy.deepcopy(policy.get("prohibited", [])),
            "terminologyRules": copy.deepcopy(policy.get("terminologyRules", {})),
            "sourceLanguageRule": policy.get("sourceLanguageRule", "")
        }
    }


def validate_result(result, target_language):
    if not isinstance(result, dict):
        raise PipelineError(f"{target_language}: translator result must be a JSON object.")

    if result.get("targetLanguage") != target_language:
        raise PipelineError(f"{target_language}: targetLanguage mismatch.")

    translation = result.get("translation")
    if not isinstance(translation, dict):
        raise PipelineError(f"{target_language}: translation object is required.")

    title = translation.get("title")
    body = translation.get("body")

    if not isinstance(title, str) or not title.strip():
        raise PipelineError(f"{target_language}: translated title is required.")

    if not isinstance(body, list) or not body:
        raise PipelineError(f"{target_language}: translated body is required.")

    source_required_fields = ["serviceInfo", "links", "attachments"]
    for field in source_required_fields:
        if field not in translation or not isinstance(translation[field], list):
            raise PipelineError(f"{target_language}: {field} must be an array.")

    for i, block in enumerate(body):
        if not isinstance(block, dict) or block.get("type") not in ALLOWED_BODY_TYPES:
            raise PipelineError(f"{target_language}: invalid body block at index {i}.")
        if block["type"] == "list":
            if not isinstance(block.get("items"), list):
                raise PipelineError(f"{target_language}: list block {i} requires items[].")
        elif not isinstance(block.get("text"), str):
            raise PipelineError(f"{target_language}: body block {i} requires text.")

    return translation


def run_translator(command, job):
    proc = subprocess.run(
        command,
        input=json.dumps(job, ensure_ascii=False),
        text=True,
        shell=True,
        capture_output=True
    )

    if proc.returncode != 0:
        raise PipelineError(
            f"Translator command failed ({proc.returncode}): {proc.stderr.strip()}"
        )

    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise PipelineError(f"Translator returned invalid JSON: {exc}")


def prepare_jobs(publication, output_dir: Path):
    policy = load_policy()
    validate_source(publication)

    jobs = []
    for lang in TARGET_LANGUAGES:
        job = make_job(publication, lang, policy)
        path = output_dir / f"{publication.get('id') or publication.get('slug') or 'publication'}-{lang}.json"
        write_json(path, job)
        jobs.append(path)
    return jobs


def translate(publication, translator_command):
    policy = load_policy()
    validate_source(publication)

    updated = copy.deepcopy(publication)
    updated.setdefault("translations", {})
    updated.setdefault("translationStatus", {})

    for lang in TARGET_LANGUAGES:
        job = make_job(updated, lang, policy)
        result = run_translator(translator_command, job)
        translated = validate_result(result, lang)

        # Never alter the Russian authoritative source.
        updated["translations"][lang] = translated

        # Automatic translation must undergo human/editorial review.
        updated["translationStatus"][lang] = "review"

    return updated


def apply_results(publication, results_dir: Path):
    validate_source(publication)

    updated = copy.deepcopy(publication)

    prefix = publication.get("id") or publication.get("slug") or "publication"
    for lang in TARGET_LANGUAGES:
        result_path = results_dir / f"{prefix}-{lang}.json"
        result = load_json(result_path)
        translated = validate_result(result, lang)
        updated["translations"][lang] = translated
        updated["translationStatus"][lang] = "review"

    return updated


def main():
    parser = argparse.ArgumentParser(description="GCIM publication translation pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    p_prepare = sub.add_parser("prepare", help="Create six strict translation job JSON files")
    p_prepare.add_argument("publication", type=Path)
    p_prepare.add_argument("output_dir", type=Path)

    p_translate = sub.add_parser("translate", help="Run an external translator command for all six target languages")
    p_translate.add_argument("publication", type=Path)
    p_translate.add_argument("output", type=Path)
    p_translate.add_argument("--translator-command", required=True)

    p_apply = sub.add_parser("apply", help="Apply six completed translator result JSON files")
    p_apply.add_argument("publication", type=Path)
    p_apply.add_argument("results_dir", type=Path)
    p_apply.add_argument("output", type=Path)

    args = parser.parse_args()
    publication = load_json(args.publication)

    try:
        if args.command == "prepare":
            paths = prepare_jobs(publication, args.output_dir)
            for path in paths:
                print(path)

        elif args.command == "translate":
            updated = translate(publication, args.translator_command)
            write_json(args.output, updated)
            print(args.output)

        elif args.command == "apply":
            updated = apply_results(publication, args.results_dir)
            write_json(args.output, updated)
            print(args.output)

    except PipelineError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
