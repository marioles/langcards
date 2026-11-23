#!/bin/sh
# Copy the word list from ../source and rebuild stroke data for any new characters.
set -e
cd "$(dirname "$0")/.."
cp ../source/chinese_words.csv words.csv
python3 -I tools/build_strokes.py words.csv strokes.json
