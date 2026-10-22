# Stadium 1 cleanup review

Folder: `Supplementary-Series/Stadium/Stadium-1` (12 pages). These are the same checks as the Stadium 0 review. All 7 edited files were checked byte-for-byte against the device after writing, and each kept its existing line endings.

## Checked, no problems found

- **Moves:** every move cell (about 3,200 Pokémon rows) was compared with Gen 1 data, covering cell type class, status-move class, and type and category icons. The only problem was the Amnesia cell below.
- **Japanese/English pairs:** the Nintendo Cup '98 page names were consistent.
- **Pokémon images:**
  - every render exists and matches its alt text and name cell;
  - the same variant is used as on the rest of the site;
  - `data-species` keys match `base-stats-gen1.js`.
- **Stats and levels:**
  - IVs are 0–15, and each HP IV matches the Gen 1 formula;
  - EVs are 65535 or less;
  - every cup's levels are inside its rules: Poké Cup and Nintendo Cup '97 50–55, Nintendo Cup '98 ≤30, Nintendo Cup '99 ≤50, Petit Cup 25–30, Pika Cup 15–20, Prime Cup, Battle Now and Mewtwo at 100 or 50.
- **Trainer images:** all present.
- **Links and anchors:** all resolve.
- **Spelling and doubled words:** none found.

## Fixed

- gameboy-rewards: Psyduck's **Amnesia** cell had class `status` instead of `psychic status-move`. The icons were already Psychic/Status, but the cell showed the wrong colour.
- prime-cup: three "Lab Man" tables had an empty `<caption>`.
- nintendo-cup-99: the rentals table had an empty caption, and its heading said "Rentals". Both now say "Rental Pokémon", like the other cups and the page's own contents link.
- poke-cup and nintendo-cup-97: "cannot be entered, even they are" → "even if they are".
- pika-cup: caption "Rental Pokémon (international release)" → "(International releases)", matching Gym Leader Castle and Petit Cup.
- gameboy-rewards (118 lines) and index (5 lines): tab indentation converted to spaces.

## Left as is (intentional)

- Captions that add detail to their heading, such as "Rival (RGB w/ Bulbasaur)" under "Rival" and "Mewtwo, Round 1" under "Round 1".
- The eligible/banned Pokémon grids have no caption, the same as the Stadium 0 index.
- "Vicegrip", "Sonicboom" and other Gen 1 spellings are used consistently.
