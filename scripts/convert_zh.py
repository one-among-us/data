#!/usr/bin/env python3
import difflib
import os
from pathlib import Path
from subprocess import check_output

import opencc
from hypy_utils import write
from hypy_utils.tqdm_utils import pmap, smap

ALLOWED_DIRS = {Path(p) for p in ['people']}
ALLOWED_SUF = {'.json5', '.md'}

HANS_TO_HANT = opencc.OpenCC('s2t.json')

D_SELF = Path(__file__).parent
D_PAST = D_SELF / '.convert_past'
D_LAST_HASH = D_PAST / 'last-hash.txt'
LAST_HASH = D_LAST_HASH.read_text().strip()


def list_files() -> set[Path]:
    # List all files
    files = {Path(dp) / f for dp, ds, fs in os.walk('.') for f in fs}

    # Filter extensions
    files = {f for f in files if f.suffix in ALLOWED_SUF}

    # Filter allowed dirs
    files = {f for f in files if any(d in f.parents for d in ALLOWED_DIRS)}

    return files


def inline_diff(old: str, new: str) -> tuple[list[str], list[str], list[tuple[str, str]]]:
    matcher = difflib.SequenceMatcher(None, old, new)

    a: list[str] = []
    d: list[str] = []
    r: list[tuple[str, str]] = []

    def find_change(tag, s0, e0, s1, e1):
        # Tag can be replace, delete, insert, equal
        if tag == 'replace':
            r.append((old[s0:e0], new[s1:e1]))
        if tag == 'delete':
            d.append(old[s0:e0])
        if tag == 'insert':
            a.append(new[s1:e1])

    for t in matcher.get_opcodes():
        find_change(*t)

    return a, d, r


def inline_diff_apply(old: str, new: str, alt: str) -> str:
    """
    Apply inline diff between two strings to an alternative string

    Changes between new and old will be applied to alt, while changes in alt will not be removed.

    :param old: Old string
    :param new: New string
    :param alt: Old alternative string to apply to
    :return: New alternative string
    """
    # Find differences between old and new
    a, d, r = inline_diff(old, new)

    # Find differences between alt and new, apply differences that are present between old and new
    matcher = difflib.SequenceMatcher(None, alt, new)
    inc = 0

    for tag, s0, e0, s1, e1 in matcher.get_opcodes():
        s0 += inc
        e0 += inc

        # Tag can be replace, delete, insert, equal
        if tag == 'replace':
            df = (alt[s0:e0], new[s1:e1])
            if df not in r:
                continue

            print(f'[Diff] Applying [U] {repr(df)}')
            alt = alt[:s0] + new[s1:e1] + alt[e0:]
            inc += (e1 - s1) - (e0 - s0)

        if tag == 'delete':
            if alt[s0:e0] not in d:
                continue

            print(f'[Diff] Applying [-] {repr(alt[s0:e0])}')
            alt = alt[:s0] + alt[e0:]
            inc -= e0 - s0

        if tag == 'insert':
            if new[s1:e1] not in a:
                continue

            print(f'[Diff] Applying [+] {repr(new[s1:e1])}')
            alt = alt[:s0] + new[s1:e1] + alt[s0:]
            inc += e1 - s1

    return alt


def process_file(f: Path):
    if '.zh_hant.' in f.name:
        return

    hans = f.read_text()
    converted = HANS_TO_HANT.convert(hans)
    f_hant = f.with_name(f'{f.stem}.zh_hant{f.suffix}')

    if not f_hant.is_file():
        # If hant file doesn't exist, create
        f_hant.write_text(converted)

    else:
        hant_current = f_hant.read_text()

        # Hant file exists, use diff
        # Obtain original version from git
        past = check_output(['git', 'show', f"{LAST_HASH}:{f.relative_to('.')}"]).decode()

        # Nothing changed, skip
        if past == hans:
            return

        print(f"\n============ CHANGED FILE: {f} ============")
        print("> Trying to apply diff...")

        # Diff: Obtain a list of inline differences from the HANS change (converted to HANT)
        a, d, r = inline_diff(HANS_TO_HANT.convert(past), converted)
        print('> Diff from old to new:', a, d, r)

        a, d, r = inline_diff(hant_current, converted)
        print('> Diff from hant to new:', a, d, r)

        hant_new = inline_diff_apply(HANS_TO_HANT.convert(past), converted, hant_current)
        f_hant.write_text(hant_new)

        a, d, r = inline_diff(hant_new, converted)
        print('> Diff from hant_new to new:', a, d, r)
        print(f"============ DONE ============")


if __name__ == '__main__':
    # Process files
    smap(process_file, list_files())

    # Write last hash
    last_commit = check_output(['git', 'rev-parse', 'HEAD']).decode()
    write(D_LAST_HASH, last_commit)

    print('Done')
