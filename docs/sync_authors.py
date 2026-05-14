"""
sync_authors.py

Reads authors.yml (single source of truth) and writes a contributors: and
affiliations: block into myst.yml between the sentinel comments:

    # <sync-contributors-start>
    # <sync-contributors-end>

Run this whenever authors.yml changes, before myst build / myst start.

Usage (from docs/):
    uv run python sync_authors.py
"""

import re
import sys
from pathlib import Path

import yaml

DOCS = Path(__file__).parent
AUTHORS_YML  = DOCS / "authors.yml"
MYST_YML     = DOCS / "myst.yml"
START_MARKER = "  # <sync-contributors-start>"
END_MARKER   = "  # <sync-contributors-end>"


def aff_id(name: str) -> str:
    return "aff-" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def build_contributors_and_affiliations():
    data = yaml.safe_load(AUTHORS_YML.read_text(encoding="utf-8"))
    src  = data.get("project", {}).get("contributors", [])

    # Collect unique affiliations in encounter order
    affs: dict[str, dict] = {}
    for c in src:
        for aff in c.get("affiliations") or []:
            if aff and aff.get("name"):
                key = aff_id(aff["name"])
                affs.setdefault(key, {"id": key, "name": aff["name"]})

    contributors = []
    for c in src:
        out = {"id": c["id"], "name": c["name"]}
        if c.get("orcid"):  out["orcid"]  = c["orcid"]
        if c.get("email"):  out["email"]  = c["email"]

        # social_links: [{platform, url}]  →  flat fields (github, twitter, etc.)
        for link in c.get("social_links") or []:
            platform = link.get("platform")
            url      = link.get("url", "")
            if not platform or not url:
                continue
            if platform == "github":
                out["github"] = url.rstrip("/").rsplit("/", 1)[-1]
            else:
                out[platform] = url

        if c.get("roles"):
            out["roles"] = c["roles"]

        # affiliations as ID strings
        aff_ids = [
            aff_id(a["name"])
            for a in (c.get("affiliations") or [])
            if a and a.get("name")
        ]
        if aff_ids:
            out["affiliations"] = aff_ids

        contributors.append(out)

    return contributors, list(affs.values())


def render_block(contributors, affiliations) -> str:
    """Serialize both lists as YAML indented 2 spaces (to sit under project:)."""
    obj = {"contributors": contributors, "affiliations": affiliations}
    raw = yaml.dump(obj, allow_unicode=True, sort_keys=False, default_flow_style=False)
    return "\n".join("  " + line for line in raw.rstrip().splitlines())


def patch_myst_yml(block: str):
    src = MYST_YML.read_text(encoding="utf-8")

    start_idx = src.find(START_MARKER)
    end_idx   = src.find(END_MARKER)

    if start_idx == -1 or end_idx == -1:
        print(
            "Sentinel markers not found in myst.yml.\n"
            "Add these two lines under project::\n\n"
            f"  {START_MARKER.strip()}\n"
            f"  {END_MARKER.strip()}\n",
            file=sys.stderr,
        )
        sys.exit(1)

    before = src[: start_idx + len(START_MARKER)]
    after  = src[end_idx:]
    MYST_YML.write_text(f"{before}\n{block}\n  {after}", encoding="utf-8")


if __name__ == "__main__":
    contributors, affiliations = build_contributors_and_affiliations()
    block = render_block(contributors, affiliations)
    patch_myst_yml(block)
    print(f"Synced {len(contributors)} contributors, {len(affiliations)} affiliations → myst.yml")
