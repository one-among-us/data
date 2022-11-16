#!/usr/bin/env bash
ls -lah
git log
python3 scripts/convert_zh.py

# If the hash is the only thing that's changed, don't commit
if [[ "$(git diff --numstat | wc -l)" == "1" ]]; then
    git reset –hard
fi
