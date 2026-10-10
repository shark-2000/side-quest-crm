#!/usr/bin/env python3
"""Convert ai-job-search results to an import batch; never sends or publishes data."""
import argparse
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("upstream_job_key", ROOT / "vendor/ai-job-search/tools/job_key.py")
keys = importlib.util.module_from_spec(spec)
spec.loader.exec_module(keys)

def convert(doc):
    rows = doc if isinstance(doc, list) else doc.get("results", doc.get("seen", doc))
    if isinstance(rows, dict):
        rows = list(rows.values())
    if not isinstance(rows, list):
        raise ValueError("Expected search results or seen_jobs JSON")
    results, seen = [], set()
    for row in rows:
        if not isinstance(row, dict) or not row.get("title") or not row.get("description"):
            continue
        key = keys.make_key(row.get("company", ""), row["title"], row.get("url", ""))
        if key in seen:
            continue
        seen.add(key)
        results.append({"title": row["title"], "company": row.get("company") or "", "description": row["description"], "url": row.get("url") or "", "source": row.get("portal", row.get("source", "other")), "workMode": row.get("work_mode", "unknown"), "requiredSkills": row.get("skills") or [], "deadline": row.get("deadline") or "", "postedDate": (row.get("date") or row.get("posted_date") or "")[:10]})
    return {"opportunities": results[:20], "remaining": max(0, len(results)-20)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    args = parser.parse_args()
    print(json.dumps(convert(json.loads(args.input.read_text(encoding="utf-8"))), ensure_ascii=False, indent=2))
