# The minesweeper solver is taken from the blog post "Solving Minesweeper in Python as a Constraint Satisfaction Problem"
# by LVNGD. Full credit to the original author for this implementation.
# Blog post URL: https://lvngd.com/blog/solving-minesweeper-python-constraint-satisfaction-problem/
from minesweeper import MinesweeperBoard
from minesweeper_ai import MinesweeperSolver


def main():
    board = MinesweeperBoard(16, 16, 40)
    solver = MinesweeperSolver(board)
    solver.start_game()
    board.show_board()
    print(solver.path_uncovered)

main()
