"""A small desktop calculator built with PyQt6."""

import ast
import math
import operator
import sys

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QKeySequence, QShortcut
from PyQt6.QtWidgets import (
    QApplication,
    QGridLayout,
    QLineEdit,
    QMainWindow,
    QPushButton,
    QVBoxLayout,
    QWidget,
)


class ArithmeticParser:
    """Evaluate expressions containing only numbers and basic arithmetic."""

    _binary_operators = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
    }
    _unary_operators = {
        ast.UAdd: operator.pos,
        ast.USub: operator.neg,
    }

    @classmethod
    def evaluate(cls, expression):
        """Parse and calculate an expression without using eval()."""
        if not expression or len(expression) > 200:
            raise ValueError("Enter a shorter arithmetic expression.")

        syntax_tree = ast.parse(expression, mode="eval")
        result = cls._evaluate_node(syntax_tree.body)
        if isinstance(result, float) and not math.isfinite(result):
            raise ValueError("The result is too large to display.")
        return result

    @classmethod
    def _evaluate_node(cls, node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return node.value

        if isinstance(node, ast.BinOp) and type(node.op) in cls._binary_operators:
            left = cls._evaluate_node(node.left)
            right = cls._evaluate_node(node.right)
            if isinstance(node.op, ast.Div) and right == 0:
                raise ZeroDivisionError("Cannot divide by zero.")
            return cls._binary_operators[type(node.op)](left, right)

        if isinstance(node, ast.UnaryOp) and type(node.op) in cls._unary_operators:
            return cls._unary_operators[type(node.op)](cls._evaluate_node(node.operand))

        raise ValueError("Use only numbers and +, -, *, or /.")


class CalculatorWindow(QMainWindow):
    """Main calculator window and its button and keyboard handlers."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Simple Calculator")
        self.setMinimumSize(320, 440)
        self.resize(380, 520)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)

        self.display = QLineEdit()
        self.display.setReadOnly(True)
        self.display.setAlignment(Qt.AlignmentFlag.AlignRight)
        self.display.setPlaceholderText("0")
        self.display.setAccessibleName("Calculator display")
        self.display.setMinimumHeight(76)

        layout = QGridLayout()
        layout.setSpacing(10)
        layout.setContentsMargins(0, 0, 0, 0)

        button_rows = [
            [("C", "clear"), ("⌫", "backspace"), ("/", "operator"), ("*", "operator")],
            [("7", "number"), ("8", "number"), ("9", "number"), ("-", "operator")],
            [("4", "number"), ("5", "number"), ("6", "number"), ("+", "operator")],
            [("1", "number"), ("2", "number"), ("3", "number")],
            [("0", "number"), (".", "number")],
        ]

        for row_index, row in enumerate(button_rows):
            column_index = 0
            for label, button_type in row:
                button = self._create_button(label, button_type)
                if label == "0":
                    layout.addWidget(button, row_index, column_index, 1, 2)
                    column_index += 2
                else:
                    layout.addWidget(button, row_index, column_index)
                    column_index += 1

        equals_button = self._create_button("=", "equals")
        layout.addWidget(equals_button, 3, 3, 2, 1)

        main_layout = QVBoxLayout()
        main_layout.setSpacing(18)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.addWidget(self.display)
        main_layout.addLayout(layout)

        central_widget = QWidget()
        central_widget.setLayout(main_layout)
        central_widget.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setCentralWidget(central_widget)
        self._create_keyboard_shortcuts()

        self.setStyleSheet(
            """
            QMainWindow, QWidget {
                background-color: #171a21;
                color: #f4f6fb;
            }
            QLineEdit {
                background-color: #222733;
                border: 1px solid #343b4b;
                border-radius: 14px;
                color: #f4f6fb;
                font-size: 30px;
                padding: 12px 16px;
                selection-background-color: #4f8cff;
            }
            QPushButton {
                background-color: #282e3a;
                border: none;
                border-radius: 12px;
                color: #f4f6fb;
                font-size: 20px;
                font-weight: 600;
                min-height: 54px;
            }
            QPushButton:hover {
                background-color: #363e4d;
            }
            QPushButton:pressed {
                background-color: #414b5d;
            }
            QPushButton[buttonType="operator"] {
                background-color: #303d54;
                color: #8db7ff;
            }
            QPushButton[buttonType="operator"]:hover {
                background-color: #3c4e6b;
            }
            QPushButton[buttonType="clear"] {
                background-color: #49313b;
                color: #ff9aaa;
            }
            QPushButton[buttonType="clear"]:hover {
                background-color: #60404d;
            }
            QPushButton[buttonType="backspace"] {
                background-color: #303640;
                color: #c6d0e0;
            }
            QPushButton[buttonType="equals"] {
                background-color: #3978e8;
                color: white;
                font-size: 24px;
            }
            QPushButton[buttonType="equals"]:hover {
                background-color: #4d8aff;
            }
            """
        )

    def _create_button(self, label, button_type):
        button = QPushButton(label)
        button.setProperty("buttonType", button_type)
        button.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        button.clicked.connect(lambda checked=False, value=label: self.handle_button(value))
        return button

    def _create_keyboard_shortcuts(self):
        """Make keyboard input work even when a calculator button has focus."""
        for key in "0123456789.+-*/":
            shortcut = QShortcut(QKeySequence(key), self)
            shortcut.setContext(Qt.ShortcutContext.WindowShortcut)
            shortcut.activated.connect(lambda value=key: self.add_to_display(value))

        actions = {
            "Return": self.calculate_result,
            "Enter": self.calculate_result,
            "Backspace": self.backspace,
            "Escape": self.clear_display,
        }
        for key, action in actions.items():
            shortcut = QShortcut(QKeySequence(key), self)
            shortcut.setContext(Qt.ShortcutContext.WindowShortcut)
            shortcut.activated.connect(action)

    def handle_button(self, value):
        """Run the action associated with a calculator button."""
        if value == "C":
            self.clear_display()
        elif value == "⌫":
            self.backspace()
        elif value == "=":
            self.calculate_result()
        else:
            self.add_to_display(value)

    def add_to_display(self, value):
        """Append a number, decimal point, or operator to the expression."""
        current_text = self.display.text()
        if current_text.startswith("Error"):
            current_text = ""
        if len(current_text) >= 200:
            self.display.setText("Error: expression too long")
            return
        self.display.setText(current_text + value)

    def clear_display(self):
        """Clear the current expression or error message."""
        self.display.clear()

    def backspace(self):
        """Remove the last character from the expression."""
        self.display.setText(self.display.text()[:-1])

    def calculate_result(self):
        """Calculate the expression and show either its result or an error."""
        expression = self.display.text().strip()
        if not expression:
            return

        try:
            result = ArithmeticParser.evaluate(expression)
            if isinstance(result, float) and result.is_integer():
                result = int(result)
            self.display.setText(format(result, ".12g") if isinstance(result, float) else str(result))
        except ZeroDivisionError:
            self.display.setText("Error: cannot divide by zero")
        except (SyntaxError, ValueError, OverflowError, TypeError):
            self.display.setText("Error: invalid expression")

def main():
    """Create and run the calculator application."""
    app = QApplication(sys.argv)
    window = CalculatorWindow()
    window.show()
    window.setFocus()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
