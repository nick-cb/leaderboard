# Minesweeper

## Describe

- 2D grid of identically looking tiles
- Some of the tiles hide a mine (armed tile)
- The number armed tiles is known to the player
- Safe tiles contain a number signalling how many of the 8 adjacent tile are armed
- If player click on a `0` safe tile, all adjacent tile is revealed. If in the process another `0` tile is hit, the process is repeat.

## Web features

- [ ] The game
    - [ ] Tracking
        - Time
        - 3BV: The minimum number of clicks required to complete a game without using flags
        - 3BV/s: 3BV per second
        - Clicks
            - Left click
            - Right click
            - Wasted click
            - Chords
        - Efficiency: 3BV/Amount of click
    - [ ] Experience
    - [ ] Game history
    - [ ] Game replay
    - [ ] Ranking
    - [ ] Statisic
    - [ ] Region
