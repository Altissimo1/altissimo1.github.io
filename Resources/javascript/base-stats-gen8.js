const BASE_STATS = {
  "bulbasaur": { hp:  45, atk:  49, def:  49, spa:  65, spd:  65, spe:  45 },  // Bulbasaur
  "ivysaur": { hp:  60, atk:  62, def:  63, spa:  80, spd:  80, spe:  60 },  // Ivysaur
  "venusaur": { hp:  80, atk:  82, def:  83, spa: 100, spd: 100, spe:  80 },  // Venusaur
  "charmander": { hp:  39, atk:  52, def:  43, spa:  60, spd:  50, spe:  65 },  // Charmander
  "charmeleon": { hp:  58, atk:  64, def:  58, spa:  80, spd:  65, spe:  80 },  // Charmeleon
  "charizard": { hp:  78, atk:  84, def:  78, spa: 109, spd:  85, spe: 100 },  // Charizard
  "squirtle": { hp:  44, atk:  48, def:  65, spa:  50, spd:  64, spe:  43 },  // Squirtle
  "wartortle": { hp:  59, atk:  63, def:  80, spa:  65, spd:  80, spe:  58 },  // Wartortle
  "blastoise": { hp:  79, atk:  83, def: 100, spa:  85, spd: 105, spe:  78 },  // Blastoise
  "caterpie": { hp:  45, atk:  30, def:  35, spa:  20, spd:  20, spe:  45 },  // Caterpie
  "metapod": { hp:  50, atk:  20, def:  55, spa:  25, spd:  25, spe:  30 },  // Metapod
  "butterfree": { hp:  60, atk:  45, def:  50, spa:  90, spd:  80, spe:  70 },  // Butterfree
  "pikachu": { hp:  35, atk:  55, def:  40, spa:  50, spd:  50, spe:  90 },  // Pikachu
  "raichu": { hp:  60, atk:  90, def:  55, spa:  90, spd:  80, spe: 110 },  // Raichu (Kantonian)
  "raichu-alola": { hp:  60, atk:  85, def:  50, spa:  95, spd:  85, spe: 110 },  // Raichu (Alolan)
  "clefairy": { hp:  70, atk:  45, def:  48, spa:  60, spd:  65, spe:  35 },  // Clefairy
  "clefable": { hp:  95, atk:  70, def:  73, spa:  95, spd:  90, spe:  60 },  // Clefable
  "vulpix": { hp:  38, atk:  41, def:  40, spa:  50, spd:  65, spe:  65 },  // Vulpix
  "ninetales": { hp:  73, atk:  76, def:  75, spa:  81, spd: 100, spe: 100 },  // Ninetales (Kantonian)
  "ninetales-alola": { hp:  73, atk:  67, def:  75, spa:  81, spd: 100, spe: 109 },  // Ninetales (Alolan)
  "oddish": { hp:  45, atk:  50, def:  55, spa:  75, spd:  65, spe:  30 },  // Oddish
  "gloom": { hp:  60, atk:  65, def:  70, spa:  85, spd:  75, spe:  40 },  // Gloom
  "vileplume": { hp:  75, atk:  80, def:  85, spa: 110, spd:  90, spe:  50 },  // Vileplume
  "diglett": { hp:  10, atk:  55, def:  25, spa:  35, spd:  45, spe:  95 },  // Diglett (Kantonian)
  "diglett-alola": { hp:  10, atk:  55, def:  30, spa:  35, spd:  45, spe:  90 },  // Diglett (Alolan)
  "dugtrio": { hp:  35, atk: 100, def:  50, spa:  50, spd:  70, spe: 120 },  // Dugtrio (Kantonian)
  "dugtrio-alola": { hp:  35, atk: 100, def:  60, spa:  50, spd:  70, spe: 110 },  // Dugtrio (Alolan)
  "meowth": { hp:  40, atk:  45, def:  35, spa:  40, spd:  40, spe:  90 },  // Meowth (Kantonian)
  "meowth-alola": { hp:  40, atk:  35, def:  35, spa:  50, spd:  40, spe:  90 },  // Meowth (Alolan)
  "meowth-galar": { hp:  50, atk:  65, def:  55, spa:  40, spd:  40, spe:  40 },  // Meowth (Galarian)
  "persian": { hp:  65, atk:  70, def:  60, spa:  65, spd:  65, spe: 115 },  // Persian (Kantonian)
  "persian-alola": { hp:  65, atk:  60, def:  60, spa:  75, spd:  65, spe: 115 },  // Persian (Alolan)
  "growlithe": { hp:  55, atk:  70, def:  45, spa:  70, spd:  50, spe:  60 },  // Growlithe
  "arcanine": { hp:  90, atk: 110, def:  80, spa: 100, spd:  80, spe:  95 },  // Arcanine
  "machop": { hp:  70, atk:  80, def:  50, spa:  35, spd:  35, spe:  35 },  // Machop
  "machoke": { hp:  80, atk: 100, def:  70, spa:  50, spd:  60, spe:  45 },  // Machoke
  "machamp": { hp:  90, atk: 130, def:  80, spa:  65, spd:  85, spe:  55 },  // Machamp
  "ponyta": { hp:  50, atk:  85, def:  55, spa:  65, spd:  65, spe:  90 },  // Ponyta
  "rapidash": { hp:  65, atk: 100, def:  70, spa:  80, spd:  80, spe: 105 },  // Rapidash
  "slowpoke": { hp:  90, atk:  65, def:  65, spa:  40, spd:  40, spe:  15 },  // Slowpoke
  "farfetchd": { hp:  52, atk:  90, def:  55, spa:  58, spd:  62, spe:  60 },  // Farfetch'd (Kantonian)
  "farfetchd-galar": { hp:  52, atk:  95, def:  55, spa:  58, spd:  62, spe:  55 },  // Farfetch'd (Galarian)
  "shellder": { hp:  30, atk:  65, def: 100, spa:  45, spd:  25, spe:  40 },  // Shellder
  "cloyster": { hp:  50, atk:  95, def: 180, spa:  85, spd:  45, spe:  70 },  // Cloyster
  "gastly": { hp:  30, atk:  35, def:  30, spa: 100, spd:  35, spe:  80 },  // Gastly
  "haunter": { hp:  45, atk:  50, def:  45, spa: 115, spd:  55, spe:  95 },  // Haunter
  "gengar": { hp:  60, atk:  65, def:  60, spa: 130, spd:  75, spe: 110 },  // Gengar
  "onix": { hp:  35, atk:  45, def: 160, spa:  30, spd:  45, spe:  70 },  // Onix
  "krabby": { hp:  30, atk: 105, def:  90, spa:  25, spd:  25, spe:  50 },  // Krabby
  "kingler": { hp:  55, atk: 130, def: 115, spa:  50, spd:  50, spe:  75 },  // Kingler
  "hitmonlee": { hp:  50, atk: 120, def:  53, spa:  35, spd: 110, spe:  87 },  // Hitmonlee
  "hitmonchan": { hp:  50, atk: 105, def:  79, spa:  35, spd: 110, spe:  76 },  // Hitmonchan
  "koffing": { hp:  40, atk:  65, def:  95, spa:  60, spd:  45, spe:  35 },  // Koffing
  "weezing": { hp:  65, atk:  90, def: 120, spa:  85, spd:  70, spe:  60 },  // Weezing
  "rhyhorn": { hp:  80, atk:  85, def:  95, spa:  30, spd:  30, spe:  25 },  // Rhyhorn
  "rhydon": { hp: 105, atk: 130, def: 120, spa:  45, spd:  45, spe:  40 },  // Rhydon
  "goldeen": { hp:  45, atk:  67, def:  60, spa:  35, spd:  50, spe:  63 },  // Goldeen
  "seaking": { hp:  80, atk:  92, def:  65, spa:  65, spd:  80, spe:  68 },  // Seaking
  "mr-mime": { hp:  40, atk:  45, def:  65, spa: 100, spd: 120, spe:  90 },  // Mr. Mime (Kantonian)
  "mr-mime-galar": { hp:  50, atk:  65, def:  65, spa:  90, spd:  90, spe: 100 },  // Mr. Mime (Galarian)
  "magikarp": { hp:  20, atk:  10, def:  55, spa:  15, spd:  20, spe:  80 },  // Magikarp
  "gyarados": { hp:  95, atk: 125, def:  79, spa:  60, spd: 100, spe:  81 },  // Gyarados
  "lapras": { hp: 130, atk:  85, def:  80, spa:  85, spd:  95, spe:  60 },  // Lapras
  "ditto": { hp:  48, atk:  48, def:  48, spa:  48, spd:  48, spe:  48 },  // Ditto
  "eevee": { hp:  55, atk:  55, def:  50, spa:  45, spd:  65, spe:  55 },  // Eevee
  "vaporeon": { hp: 130, atk:  65, def:  60, spa: 110, spd:  95, spe:  65 },  // Vaporeon
  "jolteon": { hp:  65, atk:  65, def:  60, spa: 110, spd:  95, spe: 130 },  // Jolteon
  "flareon": { hp:  65, atk: 130, def:  60, spa:  95, spd: 110, spe:  65 },  // Flareon
  "snorlax": { hp: 160, atk: 110, def:  65, spa:  65, spd: 110, spe:  30 },  // Snorlax
  "mewtwo": { hp: 106, atk: 110, def:  90, spa: 154, spd:  90, spe: 130 },  // Mewtwo
  "hoothoot": { hp:  60, atk:  30, def:  30, spa:  36, spd:  56, spe:  50 },  // Hoothoot
  "noctowl": { hp: 100, atk:  50, def:  50, spa:  86, spd:  96, spe:  70 },  // Noctowl
  "chinchou": { hp:  75, atk:  38, def:  38, spa:  56, spd:  56, spe:  67 },  // Chinchou
  "lanturn": { hp: 125, atk:  58, def:  58, spa:  76, spd:  76, spe:  67 },  // Lanturn
  "pichu": { hp:  20, atk:  40, def:  15, spa:  35, spd:  35, spe:  60 },  // Pichu
  "cleffa": { hp:  50, atk:  25, def:  28, spa:  45, spd:  55, spe:  15 },  // Cleffa
  "togepi": { hp:  35, atk:  20, def:  65, spa:  40, spd:  65, spe:  20 },  // Togepi
  "togetic": { hp:  55, atk:  40, def:  85, spa:  80, spd: 105, spe:  40 },  // Togetic
  "natu": { hp:  40, atk:  50, def:  45, spa:  70, spd:  45, spe:  70 },  // Natu
  "xatu": { hp:  65, atk:  75, def:  70, spa:  95, spd:  70, spe:  95 },  // Xatu
  "bellossom": { hp:  75, atk:  80, def:  95, spa:  90, spd: 100, spe:  50 },  // Bellossom
  "sudowoodo": { hp:  70, atk: 100, def: 115, spa:  30, spd:  65, spe:  30 },  // Sudowoodo
  "wooper": { hp:  55, atk:  45, def:  45, spa:  25, spd:  25, spe:  15 },  // Wooper
  "quagsire": { hp:  95, atk:  85, def:  85, spa:  65, spd:  65, spe:  35 },  // Quagsire
  "espeon": { hp:  65, atk:  65, def:  60, spa: 130, spd:  95, spe: 110 },  // Espeon
  "umbreon": { hp:  95, atk:  65, def: 110, spa:  60, spd: 130, spe:  65 },  // Umbreon
  "wobbuffet": { hp: 190, atk:  33, def:  58, spa:  33, spd:  58, spe:  33 },  // Wobbuffet
  "steelix": { hp:  75, atk:  85, def: 200, spa:  55, spd:  65, spe:  30 },  // Steelix
  "qwilfish": { hp:  65, atk:  95, def:  85, spa:  55, spd:  55, spe:  85 },  // Qwilfish
  "shuckle": { hp:  20, atk:  10, def: 230, spa:  10, spd: 230, spe:   5 },  // Shuckle
  "sneasel": { hp:  55, atk:  95, def:  55, spa:  35, spd:  75, spe: 115 },  // Sneasel
  "swinub": { hp:  50, atk:  50, def:  40, spa:  30, spd:  30, spe:  50 },  // Swinub
  "piloswine": { hp: 100, atk: 100, def:  80, spa:  60, spd:  60, spe:  50 },  // Piloswine
  "corsola": { hp:  65, atk:  55, def:  95, spa:  65, spd:  95, spe:  35 },  // Corsola (Johtonian)
  "corsola-galar": { hp:  60, atk:  55, def: 100, spa:  65, spd: 100, spe:  30 },  // Corsola (Galarian)
  "remoraid": { hp:  35, atk:  65, def:  35, spa:  65, spd:  35, spe:  65 },  // Remoraid
  "octillery": { hp:  75, atk: 105, def:  75, spa: 105, spd:  75, spe:  45 },  // Octillery
  "delibird": { hp:  45, atk:  55, def:  45, spa:  65, spd:  45, spe:  75 },  // Delibird
  "mantine": { hp:  85, atk:  40, def:  70, spa:  80, spd: 140, spe:  70 },  // Mantine
  "tyrogue": { hp:  35, atk:  35, def:  35, spa:  35, spd:  35, spe:  35 },  // Tyrogue
  "hitmontop": { hp:  50, atk:  95, def:  95, spa:  35, spd: 110, spe:  70 },  // Hitmontop
  "raikou": { hp:  90, atk:  85, def:  75, spa: 115, spd: 100, spe: 115 },  // Raikou
  "entei": { hp: 115, atk: 115, def:  85, spa:  90, spd:  75, spe: 100 },  // Entei
  "suicune": { hp: 100, atk:  75, def: 115, spa:  90, spd: 115, spe:  85 },  // Suicune
  "larvitar": { hp:  50, atk:  64, def:  50, spa:  45, spd:  50, spe:  41 },  // Larvitar
  "pupitar": { hp:  70, atk:  84, def:  70, spa:  65, spd:  70, spe:  51 },  // Pupitar
  "tyranitar": { hp: 100, atk: 134, def: 110, spa:  95, spd: 100, spe:  61 },  // Tyranitar
  "lugia": { hp: 106, atk:  90, def: 130, spa:  90, spd: 154, spe: 110 },  // Lugia
  "ho-oh": { hp: 106, atk: 130, def:  90, spa: 110, spd: 154, spe:  90 },  // Ho-Oh
  "celebi": { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },  // Celebi
  "treecko": { hp:  40, atk:  45, def:  35, spa:  65, spd:  55, spe:  70 },  // Treecko
  "grovyle": { hp:  50, atk:  65, def:  45, spa:  85, spd:  65, spe:  95 },  // Grovyle
  "sceptile": { hp:  70, atk:  85, def:  65, spa: 105, spd:  85, spe: 120 },  // Sceptile
  "torchic": { hp:  45, atk:  60, def:  40, spa:  70, spd:  50, spe:  45 },  // Torchic
  "combusken": { hp:  60, atk:  85, def:  60, spa:  85, spd:  60, spe:  55 },  // Combusken
  "blaziken": { hp:  80, atk: 120, def:  70, spa: 110, spd:  70, spe:  80 },  // Blaziken
  "mudkip": { hp:  50, atk:  70, def:  50, spa:  50, spd:  50, spe:  40 },  // Mudkip
  "marshtomp": { hp:  70, atk:  85, def:  70, spa:  60, spd:  70, spe:  50 },  // Marshtomp
  "swampert": { hp: 100, atk: 110, def:  90, spa:  85, spd:  90, spe:  60 },  // Swampert
  "zigzagoon": { hp:  38, atk:  30, def:  41, spa:  30, spd:  41, spe:  60 },  // Zigzagoon
  "linoone": { hp:  78, atk:  70, def:  61, spa:  50, spd:  61, spe: 100 },  // Linoone
  "lotad": { hp:  40, atk:  30, def:  30, spa:  40, spd:  50, spe:  30 },  // Lotad
  "lombre": { hp:  60, atk:  50, def:  50, spa:  60, spd:  70, spe:  50 },  // Lombre
  "ludicolo": { hp:  80, atk:  70, def:  70, spa:  90, spd: 100, spe:  70 },  // Ludicolo
  "seedot": { hp:  40, atk:  40, def:  50, spa:  30, spd:  30, spe:  30 },  // Seedot
  "nuzleaf": { hp:  70, atk:  70, def:  40, spa:  60, spd:  40, spe:  60 },  // Nuzleaf
  "shiftry": { hp:  90, atk: 100, def:  60, spa:  90, spd:  60, spe:  80 },  // Shiftry
  "wingull": { hp:  40, atk:  30, def:  30, spa:  55, spd:  30, spe:  85 },  // Wingull
  "pelipper": { hp:  60, atk:  50, def: 100, spa:  95, spd:  70, spe:  65 },  // Pelipper
  "ralts": { hp:  28, atk:  25, def:  25, spa:  45, spd:  35, spe:  40 },  // Ralts
  "kirlia": { hp:  38, atk:  35, def:  35, spa:  65, spd:  55, spe:  50 },  // Kirlia
  "gardevoir": { hp:  68, atk:  65, def:  65, spa: 125, spd: 115, spe:  80 },  // Gardevoir
  "nincada": { hp:  31, atk:  45, def:  90, spa:  30, spd:  30, spe:  40 },  // Nincada
  "ninjask": { hp:  61, atk:  90, def:  45, spa:  50, spd:  50, spe: 160 },  // Ninjask
  "shedinja": { hp:   1, atk:  90, def:  45, spa:  30, spd:  30, spe:  40 },  // Shedinja
  "sableye": { hp:  50, atk:  75, def:  75, spa:  65, spd:  65, spe:  50 },  // Sableye
  "mawile": { hp:  50, atk:  85, def:  85, spa:  55, spd:  55, spe:  50 },  // Mawile
  "electrike": { hp:  40, atk:  45, def:  40, spa:  65, spd:  40, spe:  65 },  // Electrike
  "manectric": { hp:  70, atk:  75, def:  60, spa: 105, spd:  60, spe: 105 },  // Manectric
  "roselia": { hp:  50, atk:  60, def:  45, spa: 100, spd:  80, spe:  65 },  // Roselia
  "wailmer": { hp: 130, atk:  70, def:  35, spa:  70, spd:  35, spe:  60 },  // Wailmer
  "wailord": { hp: 170, atk:  90, def:  45, spa:  90, spd:  45, spe:  60 },  // Wailord
  "torkoal": { hp:  70, atk:  85, def: 140, spa:  85, spd:  70, spe:  20 },  // Torkoal
  "trapinch": { hp:  45, atk: 100, def:  45, spa:  45, spd:  45, spe:  10 },  // Trapinch
  "vibrava": { hp:  50, atk:  70, def:  50, spa:  50, spd:  50, spe:  70 },  // Vibrava
  "flygon": { hp:  80, atk: 100, def:  80, spa:  80, spd:  80, spe: 100 },  // Flygon
  "lunatone": { hp:  90, atk:  55, def:  65, spa:  95, spd:  85, spe:  70 },  // Lunatone
  "solrock": { hp:  90, atk:  95, def:  85, spa:  55, spd:  65, spe:  70 },  // Solrock
  "barboach": { hp:  50, atk:  48, def:  43, spa:  46, spd:  41, spe:  60 },  // Barboach
  "whiscash": { hp: 110, atk:  78, def:  73, spa:  76, spd:  71, spe:  60 },  // Whiscash
  "corphish": { hp:  43, atk:  80, def:  65, spa:  50, spd:  35, spe:  35 },  // Corphish
  "crawdaunt": { hp:  63, atk: 120, def:  85, spa:  90, spd:  55, spe:  55 },  // Crawdaunt
  "baltoy": { hp:  40, atk:  40, def:  55, spa:  40, spd:  70, spe:  55 },  // Baltoy
  "claydol": { hp:  60, atk:  70, def: 105, spa:  70, spd: 120, spe:  75 },  // Claydol
  "feebas": { hp:  20, atk:  15, def:  20, spa:  10, spd:  55, spe:  80 },  // Feebas
  "milotic": { hp:  95, atk:  60, def:  79, spa: 100, spd: 125, spe:  81 },  // Milotic
  "duskull": { hp:  20, atk:  40, def:  90, spa:  30, spd:  90, spe:  25 },  // Duskull
  "dusclops": { hp:  40, atk:  70, def: 130, spa:  60, spd: 130, spe:  25 },  // Dusclops
  "wynaut": { hp:  95, atk:  23, def:  48, spa:  23, spd:  48, spe:  23 },  // Wynaut
  "snorunt": { hp:  50, atk:  50, def:  50, spa:  50, spd:  50, spe:  50 },  // Snorunt
  "glalie": { hp:  80, atk:  80, def:  80, spa:  80, spd:  80, spe:  80 },  // Glalie
  "latias": { hp:  80, atk:  80, def:  90, spa: 110, spd: 130, spe: 110 },  // Latias
  "latios": { hp:  80, atk:  90, def:  80, spa: 130, spd: 110, spe: 110 },  // Latios
  "kyogre": { hp: 100, atk: 100, def:  90, spa: 150, spd: 140, spe:  90 },  // Kyogre
  "groudon": { hp: 100, atk: 150, def: 140, spa: 100, spd:  90, spe:  90 },  // Groudon
  "rayquaza": { hp: 105, atk: 150, def:  90, spa: 150, spd:  90, spe:  95 },  // Rayquaza
  "jirachi": { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },  // Jirachi
  "budew": { hp:  40, atk:  30, def:  35, spa:  50, spd:  70, spe:  55 },  // Budew
  "roserade": { hp:  60, atk:  70, def:  65, spa: 125, spd: 105, spe:  90 },  // Roserade
  "combee": { hp:  30, atk:  30, def:  42, spa:  30, spd:  42, spe:  70 },  // Combee
  "vespiquen": { hp:  70, atk:  80, def: 102, spa:  80, spd: 102, spe:  40 },  // Vespiquen
  "cherubi": { hp:  45, atk:  35, def:  45, spa:  62, spd:  53, spe:  35 },  // Cherubi
  "cherrim": { hp:  70, atk:  60, def:  70, spa:  87, spd:  78, spe:  85 },  // Cherrim (Overcast)
  "shellos": { hp:  76, atk:  48, def:  48, spa:  57, spd:  62, spe:  34 },  // Shellos
  "gastrodon": { hp: 111, atk:  83, def:  68, spa:  92, spd:  82, spe:  39 },  // Gastrodon
  "drifloon": { hp:  90, atk:  50, def:  34, spa:  60, spd:  44, spe:  70 },  // Drifloon
  "drifblim": { hp: 150, atk:  80, def:  44, spa:  90, spd:  54, spe:  80 },  // Drifblim
  "stunky": { hp:  63, atk:  63, def:  47, spa:  41, spd:  41, spe:  74 },  // Stunky
  "skuntank": { hp: 103, atk:  93, def:  67, spa:  71, spd:  61, spe:  84 },  // Skuntank
  "bronzor": { hp:  57, atk:  24, def:  86, spa:  24, spd:  86, spe:  23 },  // Bronzor
  "bronzong": { hp:  67, atk:  89, def: 116, spa:  79, spd: 116, spe:  33 },  // Bronzong
  "bonsly": { hp:  50, atk:  80, def:  95, spa:  10, spd:  45, spe:  10 },  // Bonsly
  "mime-jr": { hp:  20, atk:  25, def:  45, spa:  70, spd:  90, spe:  60 },  // Mime Jr.
  "munchlax": { hp: 135, atk:  85, def:  40, spa:  40, spd:  85, spe:   5 },  // Munchlax
  "riolu": { hp:  40, atk:  70, def:  40, spa:  35, spd:  40, spe:  60 },  // Riolu
  "lucario": { hp:  70, atk: 110, def:  70, spa: 115, spd:  70, spe:  90 },  // Lucario
  "hippopotas": { hp:  68, atk:  72, def:  78, spa:  38, spd:  42, spe:  32 },  // Hippopotas
  "hippowdon": { hp: 108, atk: 112, def: 118, spa:  68, spd:  72, spe:  47 },  // Hippowdon
  "skorupi": { hp:  40, atk:  50, def:  90, spa:  30, spd:  55, spe:  65 },  // Skorupi
  "drapion": { hp:  70, atk:  90, def: 110, spa:  60, spd:  75, spe:  95 },  // Drapion
  "croagunk": { hp:  48, atk:  61, def:  40, spa:  61, spd:  40, spe:  50 },  // Croagunk
  "toxicroak": { hp:  83, atk: 106, def:  65, spa:  86, spd:  65, spe:  85 },  // Toxicroak
  "mantyke": { hp:  45, atk:  20, def:  50, spa:  60, spd: 120, spe:  50 },  // Mantyke
  "snover": { hp:  60, atk:  62, def:  50, spa:  62, spd:  60, spe:  40 },  // Snover
  "abomasnow": { hp:  90, atk:  92, def:  75, spa:  92, spd:  85, spe:  60 },  // Abomasnow
  "weavile": { hp:  70, atk: 120, def:  65, spa:  45, spd:  85, spe: 125 },  // Weavile
  "rhyperior": { hp: 115, atk: 140, def: 130, spa:  55, spd:  55, spe:  40 },  // Rhyperior
  "togekiss": { hp:  85, atk:  50, def:  95, spa: 120, spd: 115, spe:  80 },  // Togekiss
  "leafeon": { hp:  65, atk: 110, def: 130, spa:  60, spd:  65, spe:  95 },  // Leafeon
  "glaceon": { hp:  65, atk:  60, def: 110, spa: 130, spd:  95, spe:  65 },  // Glaceon
  "mamoswine": { hp: 110, atk: 130, def:  80, spa:  70, spd:  60, spe:  80 },  // Mamoswine
  "gallade": { hp:  68, atk: 125, def:  65, spa:  65, spd: 115, spe:  80 },  // Gallade
  "dusknoir": { hp:  45, atk: 100, def: 135, spa:  65, spd: 135, spe:  45 },  // Dusknoir
  "froslass": { hp:  70, atk:  80, def:  70, spa:  80, spd:  70, spe: 110 },  // Froslass
  "rotom": { hp:  50, atk:  50, def:  77, spa:  95, spd:  77, spe:  91 },  // Rotom (Normal)
  "rotom-heat": { hp:  50, atk:  65, def: 107, spa: 105, spd: 107, spe:  86 },  // Rotom-Heat
  "rotom-wash": { hp:  50, atk:  65, def: 107, spa: 105, spd: 107, spe:  86 },  // Rotom-Wash
  "rotom-frost": { hp:  50, atk:  65, def: 107, spa: 105, spd: 107, spe:  86 },  // Rotom-Frost
  "rotom-fan": { hp:  50, atk:  65, def: 107, spa: 105, spd: 107, spe:  86 },  // Rotom-Fan
  "rotom-mow": { hp:  50, atk:  65, def: 107, spa: 105, spd: 107, spe:  86 },  // Rotom-Mow
  "uxie": { hp:  75, atk:  75, def: 130, spa:  75, spd: 130, spe:  95 },  // Uxie
  "mesprit": { hp:  80, atk: 105, def: 105, spa: 105, spd: 105, spe:  80 },  // Mesprit
  "azelf": { hp:  75, atk: 125, def:  70, spa: 125, spd:  70, spe: 115 },  // Azelf
  "dialga": { hp: 100, atk: 120, def: 120, spa: 150, spd: 100, spe:  90 },  // Dialga
  "palkia": { hp:  90, atk: 120, def: 100, spa: 150, spd: 120, spe: 100 },  // Palkia
  "heatran": { hp:  91, atk:  90, def: 106, spa: 130, spd: 106, spe:  77 },  // Heatran
  "regigigas": { hp: 110, atk: 160, def: 110, spa:  80, spd: 110, spe: 100 },  // Regigigas
  "giratina-altered": { hp: 150, atk: 100, def: 120, spa: 100, spd: 120, spe:  90 },  // Giratina (Altered)
  "giratina-origin": { hp: 150, atk: 120, def: 100, spa: 120, spd: 100, spe:  90 },  // Giratina (Origin)
  "cresselia": { hp: 120, atk:  70, def: 120, spa:  75, spd: 130, spe:  85 },  // Cresselia
  "victini": { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },  // Victini
  "purrloin": { hp:  41, atk:  50, def:  37, spa:  50, spd:  37, spe:  66 },  // Purrloin
  "liepard": { hp:  64, atk:  88, def:  50, spa:  88, spd:  50, spe: 106 },  // Liepard
  "munna": { hp:  76, atk:  25, def:  45, spa:  67, spd:  55, spe:  24 },  // Munna
  "musharna": { hp: 116, atk:  55, def:  85, spa: 107, spd:  95, spe:  29 },  // Musharna
  "pidove": { hp:  50, atk:  55, def:  50, spa:  36, spd:  30, spe:  43 },  // Pidove
  "tranquill": { hp:  62, atk:  77, def:  62, spa:  50, spd:  42, spe:  65 },  // Tranquill
  "unfezant": { hp:  80, atk: 115, def:  80, spa:  65, spd:  55, spe:  93 },  // Unfezant
  "roggenrola": { hp:  55, atk:  75, def:  85, spa:  25, spd:  25, spe:  15 },  // Roggenrola
  "boldore": { hp:  70, atk: 105, def: 105, spa:  50, spd:  40, spe:  20 },  // Boldore
  "gigalith": { hp:  85, atk: 135, def: 130, spa:  60, spd:  80, spe:  25 },  // Gigalith
  "woobat": { hp:  65, atk:  45, def:  43, spa:  55, spd:  43, spe:  72 },  // Woobat
  "swoobat": { hp:  67, atk:  57, def:  55, spa:  77, spd:  55, spe: 114 },  // Swoobat
  "drilbur": { hp:  60, atk:  85, def:  40, spa:  30, spd:  45, spe:  68 },  // Drilbur
  "excadrill": { hp: 110, atk: 135, def:  60, spa:  50, spd:  65, spe:  88 },  // Excadrill
  "timburr": { hp:  75, atk:  80, def:  55, spa:  25, spd:  35, spe:  35 },  // Timburr
  "gurdurr": { hp:  85, atk: 105, def:  85, spa:  40, spd:  50, spe:  40 },  // Gurdurr
  "conkeldurr": { hp: 105, atk: 140, def:  95, spa:  55, spd:  65, spe:  45 },  // Conkeldurr
  "tympole": { hp:  50, atk:  50, def:  40, spa:  50, spd:  40, spe:  64 },  // Tympole
  "palpitoad": { hp:  75, atk:  65, def:  55, spa:  65, spd:  55, spe:  69 },  // Palpitoad
  "seismitoad": { hp: 105, atk:  95, def:  75, spa:  85, spd:  75, spe:  74 },  // Seismitoad
  "throh": { hp: 120, atk: 100, def:  85, spa:  30, spd:  85, spe:  45 },  // Throh
  "sawk": { hp:  75, atk: 125, def:  75, spa:  30, spd:  75, spe:  85 },  // Sawk
  "cottonee": { hp:  40, atk:  27, def:  60, spa:  37, spd:  50, spe:  66 },  // Cottonee
  "whimsicott": { hp:  60, atk:  67, def:  85, spa:  77, spd:  75, spe: 116 },  // Whimsicott
  "basculin": { hp:  70, atk:  92, def:  65, spa:  80, spd:  55, spe:  98 },  // Basculin
  "darumaka": { hp:  70, atk:  90, def:  45, spa:  15, spd:  45, spe:  50 },  // Darumaka
  "darmanitan": { hp: 105, atk: 140, def:  55, spa:  30, spd:  55, spe:  95 },  // Darmanitan
  "darmanitan-zen": { hp: 105, atk:  30, def: 105, spa: 140, spd: 105, spe:  55 },  // Darmanitan-Zen
  "darmanitan-galar-zen": { hp: 105, atk: 160, def:  55, spa:  30, spd:  55, spe: 135 },  // Darmanitan-Zen-Galar
  "maractus": { hp:  75, atk:  86, def:  67, spa: 106, spd:  67, spe:  60 },  // Maractus
  "dwebble": { hp:  50, atk:  65, def:  85, spa:  35, spd:  35, spe:  55 },  // Dwebble
  "crustle": { hp:  70, atk: 105, def: 125, spa:  65, spd:  75, spe:  45 },  // Crustle
  "scraggy": { hp:  50, atk:  75, def:  70, spa:  35, spd:  70, spe:  48 },  // Scraggy
  "scrafty": { hp:  65, atk:  90, def: 115, spa:  45, spd: 115, spe:  58 },  // Scrafty
  "sigilyph": { hp:  72, atk:  58, def:  80, spa: 103, spd:  80, spe:  97 },  // Sigilyph
  "yamask": { hp:  38, atk:  30, def:  85, spa:  55, spd:  65, spe:  30 },  // Yamask (Unovan)
  "yamask-galar": { hp:  38, atk:  55, def:  85, spa:  30, spd:  65, spe:  30 },  // Yamask (Galarian)
  "cofagrigus": { hp:  58, atk:  50, def: 145, spa:  95, spd: 105, spe:  30 },  // Cofagrigus
  "trubbish": { hp:  50, atk:  50, def:  62, spa:  40, spd:  62, spe:  65 },  // Trubbish
  "garbodor": { hp:  80, atk:  95, def:  82, spa:  60, spd:  82, spe:  75 },  // Garbodor
  "minccino": { hp:  55, atk:  50, def:  40, spa:  40, spd:  40, spe:  75 },  // Minccino
  "cinccino": { hp:  75, atk:  95, def:  60, spa:  65, spd:  60, spe: 115 },  // Cinccino
  "gothita": { hp:  45, atk:  30, def:  50, spa:  55, spd:  65, spe:  45 },  // Gothita
  "gothorita": { hp:  60, atk:  45, def:  70, spa:  75, spd:  85, spe:  55 },  // Gothorita
  "gothitelle": { hp:  70, atk:  55, def:  95, spa:  95, spd: 110, spe:  65 },  // Gothitelle
  "solosis": { hp:  45, atk:  30, def:  40, spa: 105, spd:  50, spe:  20 },  // Solosis
  "duosion": { hp:  65, atk:  40, def:  50, spa: 125, spd:  60, spe:  30 },  // Duosion
  "reuniclus": { hp: 110, atk:  65, def:  75, spa: 125, spd:  85, spe:  30 },  // Reuniclus
  "vanillite": { hp:  36, atk:  50, def:  50, spa:  65, spd:  60, spe:  44 },  // Vanillite
  "vanillish": { hp:  51, atk:  65, def:  65, spa:  80, spd:  75, spe:  59 },  // Vanillish
  "vanilluxe": { hp:  71, atk:  95, def:  85, spa: 110, spd:  95, spe:  79 },  // Vanilluxe
  "karrablast": { hp:  50, atk:  75, def:  45, spa:  40, spd:  45, spe:  60 },  // Karrablast
  "escavalier": { hp:  70, atk: 135, def: 105, spa:  60, spd: 105, spe:  20 },  // Escavalier
  "frillish": { hp:  55, atk:  40, def:  50, spa:  65, spd:  85, spe:  40 },  // Frillish
  "jellicent": { hp: 100, atk:  60, def:  70, spa:  85, spd: 105, spe:  60 },  // Jellicent
  "joltik": { hp:  50, atk:  47, def:  50, spa:  57, spd:  50, spe:  65 },  // Joltik
  "galvantula": { hp:  70, atk:  77, def:  60, spa:  97, spd:  60, spe: 108 },  // Galvantula
  "ferroseed": { hp:  44, atk:  50, def:  91, spa:  24, spd:  86, spe:  10 },  // Ferroseed
  "ferrothorn": { hp:  74, atk:  94, def: 131, spa:  54, spd: 116, spe:  20 },  // Ferrothorn
  "klink": { hp:  40, atk:  55, def:  70, spa:  45, spd:  60, spe:  30 },  // Klink
  "klang": { hp:  60, atk:  80, def:  95, spa:  70, spd:  85, spe:  50 },  // Klang
  "klinklang": { hp:  60, atk: 100, def: 115, spa:  70, spd:  85, spe:  90 },  // Klinklang
  "elgyem": { hp:  55, atk:  55, def:  55, spa:  85, spd:  55, spe:  30 },  // Elgyem
  "beheeyem": { hp:  75, atk:  75, def:  75, spa: 125, spd:  95, spe:  40 },  // Beheeyem
  "litwick": { hp:  50, atk:  30, def:  55, spa:  65, spd:  55, spe:  20 },  // Litwick
  "lampent": { hp:  60, atk:  40, def:  60, spa:  95, spd:  60, spe:  55 },  // Lampent
  "chandelure": { hp:  60, atk:  55, def:  90, spa: 145, spd:  90, spe:  80 },  // Chandelure
  "axew": { hp:  46, atk:  87, def:  60, spa:  30, spd:  40, spe:  57 },  // Axew
  "fraxure": { hp:  66, atk: 117, def:  70, spa:  40, spd:  50, spe:  67 },  // Fraxure
  "haxorus": { hp:  76, atk: 147, def:  90, spa:  60, spd:  70, spe:  97 },  // Haxorus
  "cubchoo": { hp:  55, atk:  70, def:  40, spa:  60, spd:  40, spe:  40 },  // Cubchoo
  "beartic": { hp:  95, atk: 130, def:  80, spa:  70, spd:  80, spe:  50 },  // Beartic
  "shelmet": { hp:  50, atk:  40, def:  85, spa:  40, spd:  65, spe:  25 },  // Shelmet
  "accelgor": { hp:  80, atk:  70, def:  40, spa: 100, spd:  60, spe: 145 },  // Accelgor
  "stunfisk": { hp: 109, atk:  66, def:  84, spa:  81, spd:  99, spe:  32 },  // Stunfisk (Unovan)
  "stunfisk-galar": { hp: 109, atk:  81, def:  99, spa:  66, spd:  84, spe:  32 },  // Stunfisk (Galarian)
  "golett": { hp:  59, atk:  74, def:  50, spa:  35, spd:  50, spe:  35 },  // Golett
  "golurk": { hp:  89, atk: 124, def:  80, spa:  55, spd:  80, spe:  55 },  // Golurk
  "pawniard": { hp:  45, atk:  85, def:  70, spa:  40, spd:  40, spe:  60 },  // Pawniard
  "bisharp": { hp:  65, atk: 125, def: 100, spa:  60, spd:  70, spe:  70 },  // Bisharp
  "rufflet": { hp:  70, atk:  83, def:  50, spa:  37, spd:  50, spe:  60 },  // Rufflet
  "braviary": { hp: 100, atk: 123, def:  75, spa:  57, spd:  75, spe:  80 },  // Braviary
  "vullaby": { hp:  70, atk:  55, def:  75, spa:  45, spd:  65, spe:  60 },  // Vullaby
  "mandibuzz": { hp: 110, atk:  65, def: 105, spa:  55, spd:  95, spe:  80 },  // Mandibuzz
  "heatmor": { hp:  85, atk:  97, def:  66, spa: 105, spd:  66, spe:  65 },  // Heatmor
  "durant": { hp:  58, atk: 109, def: 112, spa:  48, spd:  48, spe: 109 },  // Durant
  "deino": { hp:  52, atk:  65, def:  50, spa:  45, spd:  50, spe:  38 },  // Deino
  "zweilous": { hp:  72, atk:  85, def:  70, spa:  65, spd:  70, spe:  58 },  // Zweilous
  "hydreigon": { hp:  92, atk: 105, def:  90, spa: 125, spd:  90, spe:  98 },  // Hydreigon
  "cobalion": { hp:  91, atk:  90, def: 129, spa:  90, spd:  72, spe: 108 },  // Cobalion
  "terrakion": { hp:  91, atk: 129, def:  90, spa:  72, spd:  90, spe: 108 },  // Terrakion
  "virizion": { hp:  91, atk:  90, def:  72, spa:  90, spd: 129, spe: 108 },  // Virizion
  "tornadus-incarnate": { hp:  79, atk: 115, def:  70, spa: 125, spd:  80, spe: 111 },  // Tornadus (Incarnate)
  "tornadus-therian": { hp:  79, atk: 100, def:  80, spa: 110, spd:  90, spe: 121 },  // Tornadus (Therian)
  "thundurus-incarnate": { hp:  79, atk: 115, def:  70, spa: 125, spd:  80, spe: 111 },  // Thundurus (Incarnate)
  "thundurus-therian": { hp:  79, atk: 105, def:  70, spa: 145, spd:  80, spe: 101 },  // Thundurus (Therian)
  "reshiram": { hp: 100, atk: 120, def: 100, spa: 150, spd: 120, spe:  90 },  // Reshiram
  "zekrom": { hp: 100, atk: 150, def: 120, spa: 120, spd: 100, spe:  90 },  // Zekrom
  "landorus-incarnate": { hp:  89, atk: 125, def:  90, spa: 115, spd:  80, spe: 101 },  // Landorus (Incarnate)
  "landorus-therian": { hp:  89, atk: 145, def:  90, spa: 105, spd:  80, spe:  91 },  // Landorus (Therian)
  "kyurem": { hp: 125, atk: 130, def:  90, spa: 130, spd:  90, spe:  95 },  // Kyurem (Normal)
  "kyurem-white": { hp: 125, atk: 120, def:  90, spa: 170, spd: 100, spe:  95 },  // Kyurem (White)
  "kyurem-black": { hp: 125, atk: 170, def: 100, spa: 120, spd:  90, spe:  95 },  // Kyurem (Black)
  "keldeo": { hp:  91, atk:  72, def:  90, spa: 129, spd:  90, spe: 108 },  // Keldeo
  "genesect": { hp:  71, atk: 120, def:  95, spa: 120, spd:  95, spe:  99 },  // Genesect
  "bunnelby": { hp:  38, atk:  36, def:  38, spa:  32, spd:  36, spe:  57 },  // Bunnelby
  "diggersby": { hp:  85, atk:  56, def:  77, spa:  50, spd:  77, spe:  78 },  // Diggersby
  "pancham": { hp:  67, atk:  82, def:  62, spa:  46, spd:  48, spe:  43 },  // Pancham
  "pangoro": { hp:  95, atk: 124, def:  78, spa:  69, spd:  71, spe:  58 },  // Pangoro
  "espurr": { hp:  62, atk:  48, def:  54, spa:  63, spd:  60, spe:  68 },  // Espurr
  "meowstic": { hp:  74, atk:  48, def:  76, spa:  83, spd:  81, spe: 104 },  // Meowstic
  "honedge": { hp:  45, atk:  80, def: 100, spa:  35, spd:  37, spe:  28 },  // Honedge
  "doublade": { hp:  59, atk: 110, def: 150, spa:  45, spd:  49, spe:  35 },  // Doublade
  "aegislash-shield": { hp:  60, atk:  50, def: 140, spa:  50, spd: 140, spe:  60 },  // Aegislash (Shield)
  "aegislash-blade": { hp:  60, atk: 140, def:  50, spa: 140, spd:  50, spe:  60 },  // Aegislash (Blade)
  "spritzee": { hp:  78, atk:  52, def:  60, spa:  63, spd:  65, spe:  23 },  // Spritzee
  "aromatisse": { hp: 101, atk:  72, def:  72, spa:  99, spd:  89, spe:  29 },  // Aromatisse
  "swirlix": { hp:  62, atk:  48, def:  66, spa:  59, spd:  57, spe:  49 },  // Swirlix
  "slurpuff": { hp:  82, atk:  80, def:  86, spa:  85, spd:  75, spe:  72 },  // Slurpuff
  "inkay": { hp:  53, atk:  54, def:  53, spa:  37, spd:  46, spe:  45 },  // Inkay
  "malamar": { hp:  86, atk:  92, def:  88, spa:  68, spd:  75, spe:  73 },  // Malamar
  "binacle": { hp:  42, atk:  52, def:  67, spa:  39, spd:  56, spe:  50 },  // Binacle
  "barbaracle": { hp:  72, atk: 105, def: 115, spa:  54, spd:  86, spe:  68 },  // Barbaracle
  "helioptile": { hp:  44, atk:  38, def:  33, spa:  61, spd:  43, spe:  70 },  // Helioptile
  "heliolisk": { hp:  62, atk:  55, def:  52, spa: 109, spd:  94, spe: 109 },  // Heliolisk
  "sylveon": { hp:  95, atk:  65, def:  65, spa: 110, spd: 130, spe:  60 },  // Sylveon
  "hawlucha": { hp:  78, atk:  92, def:  75, spa:  74, spd:  63, spe: 118 },  // Hawlucha
  "goomy": { hp:  45, atk:  50, def:  35, spa:  55, spd:  75, spe:  40 },  // Goomy
  "sliggoo": { hp:  68, atk:  75, def:  53, spa:  83, spd: 113, spe:  60 },  // Sliggoo
  "goodra": { hp:  90, atk: 100, def:  70, spa: 110, spd: 150, spe:  80 },  // Goodra
  "phantump": { hp:  43, atk:  70, def:  48, spa:  50, spd:  60, spe:  38 },  // Phantump
  "trevenant": { hp:  85, atk: 110, def:  76, spa:  65, spd:  82, spe:  56 },  // Trevenant
  "pumpkaboo-small": { hp:  44, atk:  66, def:  70, spa:  44, spd:  55, spe:  56 },  // Pumpkaboo (Small)
  "pumpkaboo-average": { hp:  49, atk:  66, def:  70, spa:  44, spd:  55, spe:  51 },  // Pumpkaboo (Average)
  "pumpkaboo-large": { hp:  54, atk:  66, def:  70, spa:  44, spd:  55, spe:  46 },  // Pumpkaboo (Large)
  "pumpkaboo-super": { hp:  59, atk:  66, def:  70, spa:  44, spd:  55, spe:  41 },  // Pumpkaboo (Super)
  "gourgeist-small": { hp:  55, atk:  85, def: 122, spa:  58, spd:  75, spe:  99 },  // Gourgeist (Small)
  "gourgeist-average": { hp:  65, atk:  90, def: 122, spa:  58, spd:  75, spe:  84 },  // Gourgeist (Average)
  "gourgeist-large": { hp:  75, atk:  95, def: 122, spa:  58, spd:  75, spe:  69 },  // Gourgeist (Large)
  "gourgeist-super": { hp:  85, atk: 100, def: 122, spa:  58, spd:  75, spe:  54 },  // Gourgeist (Super)
  "bergmite": { hp:  55, atk:  69, def:  85, spa:  32, spd:  35, spe:  28 },  // Bergmite
  "avalugg": { hp:  95, atk: 117, def: 184, spa:  44, spd:  46, spe:  28 },  // Avalugg
  "noibat": { hp:  40, atk:  30, def:  35, spa:  45, spd:  40, spe:  55 },  // Noibat
  "noivern": { hp:  85, atk:  70, def:  80, spa:  97, spd:  80, spe: 123 },  // Noivern
  "xerneas": { hp: 126, atk: 131, def:  95, spa: 131, spd:  98, spe:  99 },  // Xerneas
  "yveltal": { hp: 126, atk: 131, def:  95, spa: 131, spd:  98, spe:  99 },  // Yveltal
  "zygarde-50": { hp: 108, atk: 100, def: 121, spa:  81, spd:  95, spe:  95 },  // Zygarde (50%)
  "zygarde-10": { hp:  54, atk: 100, def:  71, spa:  61, spd:  85, spe: 115 },  // Zygarde (10%)
  "zygarde-complete": { hp: 216, atk: 100, def: 121, spa:  91, spd:  95, spe:  85 },  // Zygarde (Complete)
  "diancie": { hp:  50, atk: 100, def: 150, spa: 100, spd: 150, spe:  50 },  // Diancie
  "volcanion": { hp:  80, atk: 110, def: 120, spa: 130, spd:  90, spe:  70 },  // Volcanion
  "rowlet": { hp:  68, atk:  55, def:  55, spa:  50, spd:  50, spe:  42 },  // Rowlet
  "dartrix": { hp:  78, atk:  75, def:  75, spa:  70, spd:  70, spe:  52 },  // Dartrix
  "decidueye": { hp:  78, atk: 107, def:  75, spa: 100, spd: 100, spe:  70 },  // Decidueye
  "litten": { hp:  45, atk:  65, def:  40, spa:  60, spd:  40, spe:  70 },  // Litten
  "torracat": { hp:  65, atk:  85, def:  50, spa:  80, spd:  50, spe:  90 },  // Torracat
  "incineroar": { hp:  95, atk: 115, def:  90, spa:  80, spd:  90, spe:  60 },  // Incineroar
  "popplio": { hp:  50, atk:  54, def:  54, spa:  66, spd:  56, spe:  40 },  // Popplio
  "brionne": { hp:  60, atk:  69, def:  69, spa:  91, spd:  81, spe:  50 },  // Brionne
  "primarina": { hp:  80, atk:  74, def:  74, spa: 126, spd: 116, spe:  60 },  // Primarina
  "grubbin": { hp:  47, atk:  62, def:  45, spa:  55, spd:  45, spe:  46 },  // Grubbin
  "charjabug": { hp:  57, atk:  82, def:  95, spa:  55, spd:  75, spe:  36 },  // Charjabug
  "vikavolt": { hp:  77, atk:  70, def:  90, spa: 145, spd:  75, spe:  43 },  // Vikavolt
  "cutiefly": { hp:  40, atk:  45, def:  40, spa:  55, spd:  40, spe:  84 },  // Cutiefly
  "ribombee": { hp:  60, atk:  55, def:  60, spa:  95, spd:  70, spe: 124 },  // Ribombee
  "wishiwashi-solo": { hp:  45, atk:  20, def:  20, spa:  25, spd:  25, spe:  40 },  // Wishiwashi (Solo)
  "wishiwashi-school": { hp:  45, atk: 140, def: 130, spa: 140, spd: 135, spe:  30 },  // Wishiwashi (School)
  "mareanie": { hp:  50, atk:  53, def:  62, spa:  43, spd:  52, spe:  45 },  // Mareanie
  "toxapex": { hp:  50, atk:  63, def: 152, spa:  53, spd: 142, spe:  35 },  // Toxapex
  "mudbray": { hp:  70, atk: 100, def:  70, spa:  45, spd:  55, spe:  45 },  // Mudbray
  "mudsdale": { hp: 100, atk: 125, def: 100, spa:  55, spd:  85, spe:  35 },  // Mudsdale
  "dewpider": { hp:  38, atk:  40, def:  52, spa:  40, spd:  72, spe:  27 },  // Dewpider
  "araquanid": { hp:  68, atk:  70, def:  92, spa:  50, spd: 132, spe:  42 },  // Araquanid
  "morelull": { hp:  40, atk:  35, def:  55, spa:  65, spd:  75, spe:  15 },  // Morelull
  "shiinotic": { hp:  60, atk:  45, def:  80, spa:  90, spd: 100, spe:  30 },  // Shiinotic
  "salandit": { hp:  48, atk:  44, def:  40, spa:  71, spd:  40, spe:  77 },  // Salandit
  "salazzle": { hp:  68, atk:  64, def:  60, spa: 111, spd:  60, spe: 117 },  // Salazzle
  "stufful": { hp:  70, atk:  75, def:  50, spa:  45, spd:  50, spe:  50 },  // Stufful
  "bewear": { hp: 120, atk: 125, def:  80, spa:  55, spd:  60, spe:  60 },  // Bewear
  "bounsweet": { hp:  42, atk:  30, def:  38, spa:  30, spd:  38, spe:  32 },  // Bounsweet
  "steenee": { hp:  52, atk:  40, def:  48, spa:  40, spd:  48, spe:  62 },  // Steenee
  "tsareena": { hp:  72, atk: 120, def:  98, spa:  50, spd:  98, spe:  72 },  // Tsareena
  "oranguru": { hp:  90, atk:  60, def:  80, spa:  90, spd: 110, spe:  60 },  // Oranguru
  "passimian": { hp: 100, atk: 120, def:  90, spa:  40, spd:  60, spe:  80 },  // Passimian
  "wimpod": { hp:  25, atk:  35, def:  40, spa:  20, spd:  30, spe:  80 },  // Wimpod
  "golisopod": { hp:  75, atk: 125, def: 140, spa:  60, spd:  90, spe:  40 },  // Golisopod
  "pyukumuku": { hp:  55, atk:  60, def: 130, spa:  30, spd: 130, spe:   5 },  // Pyukumuku
  "type-null": { hp:  95, atk:  95, def:  95, spa:  95, spd:  95, spe:  59 },  // Type: Null
  "silvally": { hp:  95, atk:  95, def:  95, spa:  95, spd:  95, spe:  95 },  // Silvally
  "turtonator": { hp:  60, atk:  78, def: 135, spa:  91, spd:  85, spe:  36 },  // Turtonator
  "togedemaru": { hp:  65, atk:  98, def:  63, spa:  40, spd:  73, spe:  96 },  // Togedemaru
  "mimikyu": { hp:  55, atk:  90, def:  80, spa:  50, spd: 105, spe:  96 },  // Mimikyu
  "drampa": { hp:  78, atk:  60, def:  85, spa: 135, spd:  91, spe:  36 },  // Drampa
  "dhelmise": { hp:  70, atk: 131, def: 100, spa:  86, spd:  90, spe:  40 },  // Dhelmise
  "jangmo-o": { hp:  45, atk:  55, def:  65, spa:  45, spd:  45, spe:  45 },  // Jangmo-o
  "hakamo-o": { hp:  55, atk:  75, def:  90, spa:  65, spd:  70, spe:  65 },  // Hakamo-o
  "kommo-o": { hp:  75, atk: 110, def: 125, spa: 100, spd: 105, spe:  85 },  // Kommo-o
  "tapu-koko": { hp:  70, atk: 115, def:  85, spa:  95, spd:  75, spe: 130 },  // Tapu Koko
  "tapu-lele": { hp:  70, atk:  85, def:  75, spa: 130, spd: 115, spe:  95 },  // Tapu Lele
  "tapu-bulu": { hp:  70, atk: 130, def: 115, spa:  85, spd:  95, spe:  75 },  // Tapu Bulu
  "tapu-fini": { hp:  70, atk:  75, def: 115, spa:  95, spd: 130, spe:  85 },  // Tapu Fini
  "cosmog": { hp:  43, atk:  29, def:  31, spa:  29, spd:  31, spe:  37 },  // Cosmog
  "cosmoem": { hp:  43, atk:  29, def: 131, spa:  29, spd: 131, spe:  37 },  // Cosmoem
  "solgaleo": { hp: 137, atk: 137, def: 107, spa: 113, spd:  89, spe:  97 },  // Solgaleo
  "lunala": { hp: 137, atk: 113, def:  89, spa: 137, spd: 107, spe:  97 },  // Lunala
  "nihilego": { hp: 109, atk:  53, def:  47, spa: 127, spd: 131, spe: 103 },  // Nihilego
  "buzzwole": { hp: 107, atk: 139, def: 139, spa:  53, spd:  53, spe:  79 },  // Buzzwole
  "pheromosa": { hp:  71, atk: 137, def:  37, spa: 137, spd:  37, spe: 151 },  // Pheromosa
  "xurkitree": { hp:  83, atk:  89, def:  71, spa: 173, spd:  71, spe:  83 },  // Xurkitree
  "celesteela": { hp:  97, atk: 101, def: 103, spa: 107, spd: 101, spe:  61 },  // Celesteela
  "kartana": { hp:  59, atk: 181, def: 131, spa:  59, spd:  31, spe: 109 },  // Kartana
  "guzzlord": { hp: 223, atk: 101, def:  53, spa:  97, spd:  53, spe:  43 },  // Guzzlord
  "necrozma": { hp:  97, atk: 107, def: 101, spa: 127, spd:  89, spe:  79 },  // Necrozma
  "necrozma-dusk": { hp:  97, atk: 157, def: 127, spa: 113, spd: 109, spe:  77 },  // Necrozma (Dusk)
  "necrozma-dawn": { hp:  97, atk: 113, def: 109, spa: 157, spd: 127, spe:  77 },  // Necrozma (Dawn)
  "necrozma-ultra": { hp:  97, atk: 167, def:  97, spa: 167, spd:  97, spe: 129 },  // Necrozma (Ultra)
  "magearna": { hp:  80, atk:  95, def: 115, spa: 130, spd: 115, spe:  65 },  // Magearna
  "marshadow": { hp:  90, atk: 125, def:  80, spa:  90, spd:  90, spe: 125 },  // Marshadow
  "poipole": { hp:  67, atk:  73, def:  67, spa:  73, spd:  67, spe:  73 },  // Poipole
  "naganadel": { hp:  73, atk:  73, def:  73, spa: 127, spd:  73, spe: 121 },  // Naganadel
  "stakataka": { hp:  61, atk: 131, def: 211, spa:  53, spd: 101, spe:  13 },  // Stakataka
  "blacephalon": { hp:  53, atk: 127, def:  53, spa: 151, spd:  79, spe: 107 },  // Blacephalon
  "zeraora": { hp:  88, atk: 112, def:  75, spa: 102, spd:  80, spe: 143 },  // Zeraora
  "meltan": { hp:  46, atk:  65, def:  65, spa:  55, spd:  35, spe:  34 },  // Meltan
  "melmetal": { hp: 135, atk: 143, def: 143, spa:  80, spd:  65, spe:  34 },  // Melmetal
  "grookey": { hp:  50, atk:  65, def:  50, spa:  40, spd:  40, spe:  65 },  // Grookey
  "thwackey": { hp:  70, atk:  85, def:  70, spa:  55, spd:  60, spe:  80 },  // Thwackey
  "rillaboom": { hp: 100, atk: 125, def:  90, spa:  60, spd:  70, spe:  85 },  // Rillaboom
  "scorbunny": { hp:  50, atk:  71, def:  40, spa:  40, spd:  40, spe:  69 },  // Scorbunny
  "raboot": { hp:  65, atk:  86, def:  60, spa:  55, spd:  60, spe:  94 },  // Raboot
  "cinderace": { hp:  80, atk: 116, def:  75, spa:  65, spd:  75, spe: 119 },  // Cinderace
  "sobble": { hp:  50, atk:  40, def:  40, spa:  70, spd:  40, spe:  70 },  // Sobble
  "drizzile": { hp:  65, atk:  60, def:  55, spa:  95, spd:  55, spe:  90 },  // Drizzile
  "inteleon": { hp:  70, atk:  85, def:  65, spa: 125, spd:  65, spe: 120 },  // Inteleon
  "skwovet": { hp:  70, atk:  55, def:  55, spa:  35, spd:  35, spe:  25 },  // Skwovet
  "greedent": { hp: 120, atk:  95, def:  95, spa:  55, spd:  75, spe:  20 },  // Greedent
  "rookidee": { hp:  38, atk:  47, def:  35, spa:  33, spd:  35, spe:  57 },  // Rookidee
  "corvisquire": { hp:  68, atk:  67, def:  55, spa:  43, spd:  55, spe:  77 },  // Corvisquire
  "corviknight": { hp:  98, atk:  87, def: 105, spa:  53, spd:  85, spe:  67 },  // Corviknight
  "blipbug": { hp:  25, atk:  20, def:  20, spa:  25, spd:  45, spe:  45 },  // Blipbug
  "dottler": { hp:  50, atk:  35, def:  80, spa:  50, spd:  90, spe:  30 },  // Dottler
  "orbeetle": { hp:  60, atk:  45, def: 110, spa:  80, spd: 120, spe:  90 },  // Orbeetle
  "nickit": { hp:  40, atk:  28, def:  28, spa:  47, spd:  52, spe:  50 },  // Nickit
  "thievul": { hp:  70, atk:  58, def:  58, spa:  87, spd:  92, spe:  90 },  // Thievul
  "gossifleur": { hp:  40, atk:  40, def:  60, spa:  40, spd:  60, spe:  10 },  // Gossifleur
  "eldegoss": { hp:  60, atk:  50, def:  90, spa:  80, spd: 120, spe:  60 },  // Eldegoss
  "wooloo": { hp:  42, atk:  40, def:  55, spa:  40, spd:  45, spe:  48 },  // Wooloo
  "dubwool": { hp:  72, atk:  80, def: 100, spa:  60, spd:  90, spe:  88 },  // Dubwool
  "chewtle": { hp:  50, atk:  64, def:  50, spa:  38, spd:  38, spe:  44 },  // Chewtle
  "drednaw": { hp:  90, atk: 115, def:  90, spa:  48, spd:  68, spe:  74 },  // Drednaw
  "yamper": { hp:  59, atk:  45, def:  50, spa:  40, spd:  50, spe:  26 },  // Yamper
  "boltund": { hp:  69, atk:  90, def:  60, spa:  90, spd:  60, spe: 121 },  // Boltund
  "rolycoly": { hp:  30, atk:  40, def:  50, spa:  40, spd:  50, spe:  30 },  // Rolycoly
  "carkol": { hp:  80, atk:  60, def:  90, spa:  60, spd:  70, spe:  50 },  // Carkol
  "coalossal": { hp: 110, atk:  80, def: 120, spa:  80, spd:  90, spe:  30 },  // Coalossal
  "applin": { hp:  40, atk:  40, def:  80, spa:  40, spd:  40, spe:  20 },  // Applin
  "flapple": { hp:  70, atk: 110, def:  80, spa:  95, spd:  60, spe:  70 },  // Flapple
  "appletun": { hp: 110, atk:  85, def:  80, spa: 100, spd:  80, spe:  30 },  // Appletun
  "silicobra": { hp:  52, atk:  57, def:  75, spa:  35, spd:  50, spe:  46 },  // Silicobra
  "sandaconda": { hp:  72, atk: 107, def: 125, spa:  65, spd:  70, spe:  71 },  // Sandaconda
  "cramorant": { hp:  70, atk:  85, def:  55, spa:  85, spd:  95, spe:  85 },  // Cramorant
  "arrokuda": { hp:  41, atk:  63, def:  40, spa:  40, spd:  30, spe:  66 },  // Arrokuda
  "barraskewda": { hp:  61, atk: 123, def:  60, spa:  60, spd:  50, spe: 136 },  // Barraskewda
  "toxel": { hp:  40, atk:  38, def:  35, spa:  54, spd:  35, spe:  40 },  // Toxel
  "toxtricity": { hp:  75, atk:  98, def:  70, spa: 114, spd:  70, spe:  75 },  // Toxtricity
  "sizzlipede": { hp:  50, atk:  65, def:  45, spa:  50, spd:  50, spe:  45 },  // Sizzlipede
  "centiskorch": { hp: 100, atk: 115, def:  65, spa:  90, spd:  90, spe:  65 },  // Centiskorch
  "clobbopus": { hp:  50, atk:  68, def:  60, spa:  50, spd:  50, spe:  32 },  // Clobbopus
  "grapploct": { hp:  80, atk: 118, def:  90, spa:  70, spd:  80, spe:  42 },  // Grapploct
  "sinistea": { hp:  40, atk:  45, def:  45, spa:  74, spd:  54, spe:  50 },  // Sinistea
  "polteageist": { hp:  60, atk:  65, def:  65, spa: 134, spd: 114, spe:  70 },  // Polteageist
  "hatenna": { hp:  42, atk:  30, def:  45, spa:  56, spd:  53, spe:  39 },  // Hatenna
  "hattrem": { hp:  57, atk:  40, def:  65, spa:  86, spd:  73, spe:  49 },  // Hattrem
  "hatterene": { hp:  57, atk:  90, def:  95, spa: 136, spd: 103, spe:  29 },  // Hatterene
  "impidimp": { hp:  45, atk:  45, def:  30, spa:  55, spd:  40, spe:  50 },  // Impidimp
  "morgrem": { hp:  65, atk:  60, def:  45, spa:  75, spd:  55, spe:  70 },  // Morgrem
  "grimmsnarl": { hp:  95, atk: 120, def:  65, spa:  95, spd:  75, spe:  60 },  // Grimmsnarl
  "obstagoon": { hp:  93, atk:  90, def: 101, spa:  60, spd:  81, spe:  95 },  // Obstagoon
  "perrserker": { hp:  70, atk: 110, def: 100, spa:  50, spd:  60, spe:  50 },  // Perrserker
  "cursola": { hp:  60, atk:  95, def:  50, spa: 145, spd: 130, spe:  30 },  // Cursola
  "sirfetchd": { hp:  62, atk: 135, def:  95, spa:  68, spd:  82, spe:  65 },  // Sirfetch'd
  "mr-rime": { hp:  80, atk:  85, def:  75, spa: 110, spd: 100, spe:  70 },  // Mr. Rime
  "runerigus": { hp:  58, atk:  95, def: 145, spa:  50, spd: 105, spe:  30 },  // Runerigus
  "milcery": { hp:  45, atk:  40, def:  40, spa:  50, spd:  61, spe:  34 },  // Milcery
  "alcremie": { hp:  65, atk:  60, def:  75, spa: 110, spd: 121, spe:  64 },  // Alcremie
  "falinks": { hp:  65, atk: 100, def: 100, spa:  70, spd:  60, spe:  75 },  // Falinks
  "pincurchin": { hp:  48, atk: 101, def:  95, spa:  91, spd:  85, spe:  15 },  // Pincurchin
  "snom": { hp:  30, atk:  25, def:  35, spa:  45, spd:  30, spe:  20 },  // Snom
  "frosmoth": { hp:  70, atk:  65, def:  60, spa: 125, spd:  90, spe:  65 },  // Frosmoth
  "stonjourner": { hp: 100, atk: 125, def: 135, spa:  20, spd:  20, spe:  70 },  // Stonjourner
  "eiscue": { hp:  75, atk:  80, def: 110, spa:  65, spd:  90, spe:  50 },  // Eiscue (Ice Face)
  "eiscue-noice-face": { hp:  75, atk:  80, def:  70, spa:  65, spd:  50, spe: 130 },  // Eiscue (Noice Face)
  "indeedee-male": { hp:  60, atk:  65, def:  55, spa: 105, spd:  95, spe:  95 },  // Indeedee (Male)
  "indeedee-female": { hp:  70, atk:  55, def:  65, spa:  95, spd: 105, spe:  85 },  // Indeedee (Female)
  "morpeko": { hp:  58, atk:  95, def:  58, spa:  70, spd:  58, spe:  97 },  // Morpeko
  "cufant": { hp:  72, atk:  80, def:  49, spa:  40, spd:  49, spe:  40 },  // Cufant
  "copperajah": { hp: 122, atk: 130, def:  69, spa:  80, spd:  69, spe:  30 },  // Copperajah
  "dracozolt": { hp:  90, atk: 100, def:  90, spa:  80, spd:  70, spe:  75 },  // Dracozolt
  "arctozolt": { hp:  90, atk: 100, def:  90, spa:  90, spd:  80, spe:  55 },  // Arctozolt
  "dracovish": { hp:  90, atk:  90, def: 100, spa:  70, spd:  80, spe:  75 },  // Dracovish
  "arctovish": { hp:  90, atk:  90, def: 100, spa:  80, spd:  90, spe:  55 },  // Arctovish
  "duraludon": { hp:  70, atk:  95, def: 115, spa: 120, spd:  50, spe:  85 },  // Duraludon
  "dreepy": { hp:  28, atk:  60, def:  30, spa:  40, spd:  30, spe:  82 },  // Dreepy
  "drakloak": { hp:  68, atk:  80, def:  50, spa:  60, spd:  50, spe: 102 },  // Drakloak
  "dragapult": { hp:  88, atk: 120, def:  75, spa: 100, spd:  75, spe: 142 },  // Dragapult
  "zacian": { hp:  92, atk: 130, def: 115, spa:  80, spd: 115, spe: 138 },  // Zacian (Hero of Many Battles)
  "zacian-crowned": { hp:  92, atk: 170, def: 115, spa:  80, spd: 115, spe: 148 },  // Zacian (Crowned Sword)
  "zamazenta": { hp:  92, atk: 130, def: 115, spa:  80, spd: 115, spe: 138 },  // Zamazenta (Hero of Many battles)
  "zamazenta-crowned": { hp:  92, atk: 130, def: 145, spa:  80, spd: 145, spe: 128 },  // Zamazenta (Crowned Shield)
  "eternatus": { hp: 140, atk:  85, def:  95, spa: 145, spd:  95, spe: 130 },  // Eternatus (Normal)
  "eternatus-eternamax": { hp: 255, atk: 115, def: 250, spa: 125, spd: 250, spe: 130 },  // Eternatus (Eternamax)
  "kubfu": { hp:  60, atk:  90, def:  60, spa:  53, spd:  50, spe:  72 },  // Kubfu
  "urshifu": { hp: 100, atk: 130, def: 100, spa:  63, spd:  60, spe:  97 },  // Urshifu
  "zarude": { hp: 105, atk: 120, def: 105, spa:  70, spd:  95, spe: 105 },  // Zarude
  "regieleki": { hp:  80, atk: 100, def:  50, spa: 100, spd:  50, spe: 200 },  // Regieleki
  "regidrago": { hp: 200, atk: 100, def:  50, spa: 100, spd:  50, spe:  80 },  // Regidrago
  "glastrier": { hp: 100, atk: 145, def: 130, spa:  65, spd: 110, spe:  30 },  // Glastrier
  "spectrier": { hp: 100, atk:  65, def:  60, spa: 145, spd:  80, spe: 130 },  // Spectrier
  "calyrex": { hp: 100, atk:  80, def:  80, spa:  80, spd:  80, spe:  80 },  // Calyrex (Normal)
  "calyrex-ice-rider": { hp: 100, atk: 165, def: 150, spa:  85, spd: 130, spe:  50 },  // Calyrex (Ice Rider)
  "calyrex-shadow-rider": { hp: 100, atk:  85, def:  80, spa: 165, spd: 100, spe: 150 },  // Calyrex (Shadow Rider)
};
