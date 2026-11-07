# Domain glossary

- **Card**: a Lovelace dashboard element (power flow, energy flow, energy breakdown, sortable list) configured in YAML or the UI editor.
- **Node**: a circle on a flow card standing for a source or sink: grid, solar, battery, home, non-fossil, or an individual device.
- **Flow**: energy moving between two nodes (e.g. solar → home), drawn as a line with moving dots.
- **Flow rate / duration**: how fast a flow's dots move, expressed as seconds per trip along the line; larger flows move faster.
- **Readings**: the numbers a card works from. Power readings are live watts (W) from entity states; energy readings are watt-hours (Wh) accumulated over the selected energy period.
- **Card state**: everything a card renders (nodes, flows, home ring, layout, colours), derived from its config and readings.
- **Tolerance** (`display_zero_tolerance`): readings at or below this magnitude count as zero, to hide sensor noise.
- **display_zero**: whether a node stays visible while its reading is zero.
- **Display zero lines**: how lines with nothing flowing are drawn: shown, hidden, greyed out or faded.
- **Secondary info**: a small extra value or rendered template shown inside a node, e.g. a price or a state of charge.
- **Individual device**: a consumer the user tracks separately (EV charger, heat pump), shown in one of up to four **slots** around the home.
- **Home ring**: the circle around the home node, split by how much of home consumption each source supplies.
- **Non-fossil**: the share of grid import from low-carbon sources, from a fossil-percentage entity or the energy dashboard's CO2 data.
