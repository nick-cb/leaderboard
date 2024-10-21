# Minesweeper

## Describe

- 2D grid of identically looking tiles
- Some of the tiles hide a mine (armed tile)
- The number armed tiles is known to the player
- Safe tiles contain a number signalling how many of the 8 adjacent tile are armed
- If player click on a `0` safe tile, all adjacent tile is revealed. If in the process another `0` tile is hit, the process is repeat.

## Implementation

```python
# Used internally to keep track of the game tiles
board = []
# Used to keep track of what to show to player
mask = []
```
