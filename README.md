# langcards

Flashcards for practicing Chinese characters. It's an installable web app that also works offline.

- Each card shows the hanzi first. Tap once to reveal the pinyin, tap again for the Spanish meaning, and tap a third time to go to the next card.
- **Niveles** selects which levels to practice. Cards from those levels come up in random order, and each one appears once before the deck reshuffles.
- 🔊 plays the pronunciation with the device's Chinese (zh-CN) voice.
- 笔 animates the stroke order (powered by [Hanzi Writer](https://hanziwriter.org)). Stroke data is bundled, so it works offline.
- ◐ switches between light and dark mode. It follows the system setting until you pick one.

## Levels

`words.csv` has no level column, so words are grouped in file order, 50 per level (`LEVEL_SIZE` in `app.js`).
If you add a `Nivel` column to the CSV, the app uses that column instead.

## Updating the word list

Edit `../source/chinese_words.csv`, then run:

```sh
tools/update_words.sh   # copies the CSV and rebuilds strokes.json (needs internet)
```

The installed app picks up the changes the second time it's opened while online.

## Running locally

```sh
python3 -m http.server 8765   # then open http://localhost:8765
```

## Installing on iPhone

Service workers need HTTPS, so host the site with GitHub Pages: *Settings → Pages → Deploy from branch → main / root*.
Open `https://marioles.github.io/langcards/` in **Safari**, then choose Share → **Add to Home Screen**.
Open it once while online so it can cache everything. After that it works offline.

For a better voice, download one in *Settings → Accessibility → Spoken Content → Voices → Chinese (China mainland)*, for example an "Enhanced" Tingting.
