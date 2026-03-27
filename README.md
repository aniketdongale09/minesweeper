# DEFUSE — AI Bomb Disposal Expert

**BOMB DISPOSAL TRAINING — FIELD EXERCISE 7**

DEFUSE is a high-stakes, military-themed Minesweeper game enhanced with AI intelligence. Face the field with **Colonel Rex**, your AI Bomb Disposal Expert, who provides real-time tactical advice, insults, or encouragement as you clear the minefield.

---

## 🚀 Key Features

- **🤖 AI Intelligence (Colonel Rex)**: Powered by Google Gemini, Col. Rex monitors your every move. Choose between "Drill Sergeant", "Mentor", or "Comedian" personalities.
- **🔦 Tactical Heatmap**: Toggle a probability heatmap to visualize the risk level of every hidden tile.
- **⚡ AI Auto-Solver**: Feeling stuck? Let the AI analyze the board and make the next logical move for you.
- **📡 Emergency Radio**: A one-time use lifeline to ask Col. Rex for intel on a specific coordinate (e.g., "B4").
- **🎖️ Difficulty Ranks**: From **Rookie** (8x8) to **Legend** (30x16), test your skills across five intense ranks.
- **📖 Field Manual**: Built-in guide covering advanced tactical patterns like the 1-2-1 and 1-2-2-1 logic.
- **🔊 Tactical Audio**: Immersive military soundscapes and voice-enabled commentary (optional).

## 🎮 How to Play

1.  **Objective**: Reveal all safe tiles without detonating a single mine.
2.  **Controls**:
    - **Left Click**: Reveal a tile.
    - **Right Click / Long Press**: Flag a suspected mine.
    - **Number Tiles**: Indicate how many mines are in the 8 adjacent squares.
3.  **Victory**: Clear the entire field to earn your stripes.

## 🛠️ Technical Stack

- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism, Animations).
- **Logic**: Pure JavaScript (ES6+).
- **AI**: Google Gemini API Integration.
- **Typography**: OSWALD & Share Tech Mono (via Google Fonts).

## ⚙️ Setup & Configuration

### Local Execution
1.  Clone the repository:
    ```bash
    git clone https://github.com/aniketdongale09/minesweeper.git
    ```
2.  Open `index.html` in any modern web browser.

### API Key (Required for AI Features)
To enable Colonel Rex's commentary:
1.  Click the **Settings (⚙️)** icon in the top right.
2.  Enter your **Gemini API Key**.
3.  Your key is stored securely in your browser's `localStorage` and is never sent to any server other than Google's API.

---

*Good luck out there, soldier. Don't let the pressure get to you.*
