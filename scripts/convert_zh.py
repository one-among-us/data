#!/usr/bin/env python3
import os
from pathlib import Path
from subprocess import check_output

import opencc
from hypy_utils import write
from hypy_utils.tqdm_utils import pmap

ALLOWED_DIRS = {Path(p) for p in ['people']}
ALLOWED_SUF = {'.json5', '.md'}

HANS_TO_HANT = opencc.OpenCC('s2t.json')

D_SELF = Path(__file__).parent
D_PAST = D_SELF / '.convert_past'
D_LAST_HASH = D_PAST / 'last-hash.txt'


def list_files() -> set[Path]:
    # List all files
    files = {Path(dp) / f for dp, ds, fs in os.walk('.') for f in fs}

    # Filter extensions
    files = {f for f in files if f.suffix in ALLOWED_SUF}

    # Filter allowed dirs
    files = {f for f in files if any(d in f.parents for d in ALLOWED_DIRS)}

    return files


def process_file(f: Path):
    if '.zh_hant.' in f.name:
        return

    f_hant = f.with_name(f'{f.stem}.zh_hant{f.suffix}')

    if not f_hant.is_file():
        # If hant file doesn't exist, create
        f_hant.write_text(HANS_TO_HANT.convert(f.read_text()))

    else:
        # TODO
        pass


if __name__ == '__main__':
    # Process files
    pmap(process_file, list_files())

    # Write last hash
    last_commit = check_output(['git', 'rev-parse', 'HEAD'])
    write(D_LAST_HASH, last_commit)

    print('Done')
