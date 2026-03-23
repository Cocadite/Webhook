import { useState, useEffect, useCallback, useRef } from "react";

// ─── MakeCode JS Source ────────────────────────────────────────────────────
const MAKECODE_SOURCE = `// 🐍 Snake Game — micro:bit Full JS
// Botão A = virar à esquerda
// Botão B = virar à direita
// Pressione A para iniciar

let snake: number[][] = [[2, 2], [1, 2]];
let food: number[] = [4, 0];
let direction = 0; // 0=direita 1=baixo 2=esquerda 3=cima
let score = 0;
let gameRunning = false;
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

function placeFood(): void {
    let placed = false;
    while (!placed) {
        let fx = Math.randomRange(0, 4);
        let fy = Math.randomRange(0, 4);
        let onSnake = false;
        for (let seg of snake) {
            if (seg[0] === fx && seg[1] === fy) {
                onSnake = true; break;
            }
        }
        if (!onSnake) { food = [fx, fy]; placed = true; }
    }
}

function drawGame(): void {
    basic.clearScreen();
    for (let seg of snake) led.plot(seg[0], seg[1]);
    led.plot(food[0], food[1]);
}

function startGame(): void {
    score = 0; direction = 0;
    snake = [[2, 2], [1, 2]];
    placeFood(); gameRunning = true;
    basic.clearScreen();
}

function gameLoop(): void {
    if (!gameRunning) return;
    let head = snake[0];
    let nh = [head[0] + DX[direction], head[1] + DY[direction]];
    if (nh[0] < 0 || nh[0] > 4 || nh[1] < 0 || nh[1] > 4) {
        gameOver(); return;
    }
    for (let seg of snake) {
        if (seg[0] === nh[0] && seg[1] === nh[1]) {
            gameOver(); return;
        }
    }
    snake.unshift(nh);
    if (nh[0] === food[0] && nh[1] === food[1]) {
        score++; placeFood();
    } else { snake.pop(); }
    drawGame();
}

function gameOver(): void {
    gameRunning = false;
    basic.showNumber(score);
    basic.pause(2000);
    basic.showString("PLAY?");
}

input.onButtonPressed(Button.A, () => {
    if (!gameRunning) startGame();
    else direction = (direction + 3) % 4;
});
input.onButtonPressed(Button.B, () => {
    if (gameRunning) direction = (direction + 1) % 4;
});

startGame();
loops.everyInterval(400, () => gameLoop());`;

// ─── Game Logic ────────────────────────────────────────────────────────────
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

function randomFood(snake) {
  while (true) {
    const x = Math.floor(Math.random() * 5);
    const y = Math.floor(Math.random() * 5);
    if (!snake.some(([sx, sy]) => sx === x && sy === y)) return [x, y];
  }
}

function initState() {
  const snake = [[2, 2],[1, 2]];
  return { snake, food: randomFood(snake), dir: 0, score: 0, status: "playing" };
}

function step(state) {
  if (state.status !== "playing") return state;
  const { snake, food, dir, score } = state;
  const [hx, hy] = snake[0];
  const nx = hx + DX[dir], ny = hy + DY[dir];
  if (nx < 0 || nx > 4 || ny < 0 || ny > 4) return { ...state, status: "dead" };
  if (snake.some(([x, y]) => x === nx && y === ny)) return { ...state, status: "dead" };
  const newSnake = [[nx, ny], ...snake];
  const ate = nx === food[0] && ny === food[1];
  if (!ate) newSnake.pop();
  return {
    snake: newSnake,
    food: ate ? randomFood(newSnake) : food,
    dir,
    score: ate ? score + 1 : score,
    status: "playing",
  };
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function App() {
  const [game, setGame] = useState(initState);
  const [showCode, setShowCode] = useState(false);
  const [foodBlink, setFoodBlink] = useState(true);
  const [deadAnim, setDeadAnim] = useState(false);
  const [copied, setCopied] = useState(false);
  const dirRef = useRef(game.dir);
  const gameRef = useRef(game);
  gameRef.current = game;

  // food blink
  useEffect(() => {
    const id = setInterval(() => setFoodBlink(b => !b), 300);
    return () => clearInterval(id);
  }, []);

  // game loop
  useEffect(() => {
    if (game.status !== "playing") return;
    const id = setInterval(() => {
      setGame(prev => {
        const next = step({ ...prev, dir: dirRef.current });
        if (next.status === "dead") setDeadAnim(true);
        return next;
      });
    }, 380);
    return () => clearInterval(id);
  }, [game.status]);

  const turnLeft = useCallback(() => {
    if (gameRef.current.status === "dead") { restart(); return; }
    dirRef.current = (dirRef.current + 3) % 4;
    setGame(g => ({ ...g, dir: dirRef.current }));
  }, []);

  const turnRight = useCallback(() => {
    if (gameRef.current.status !== "playing") return;
    dirRef.current = (dirRef.current + 1) % 4;
    setGame(g => ({ ...g, dir: dirRef.current }));
  }, []);

  const restart = () => {
    setDeadAnim(false);
    dirRef.current = 0;
    setGame(initState());
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") turnLeft();
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") turnRight();
      if (e.key === "Enter" || e.key === " ") {
        if (gameRef.current.status === "dead") restart();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [turnLeft, turnRight]);

  const copyCode = () => {
    navigator.clipboard.writeText(MAKECODE_SOURCE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isSnake = (x, y) => game.snake.some(([sx, sy]) => sx === x && sy === y);
  const isHead = (x, y) => game.snake[0]?.[0] === x && game.snake[0]?.[1] === y;
  const isFood = (x, y) => game.food[0] === x && game.food[1] === y;

  const dirArrow = ["→", "↓", "←", "↑"][game.dir];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f0d",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Courier New', monospace",
      color: "#c8ffc0",
      padding: "20px",
    }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          fontSize: 11,
          letterSpacing: 6,
          color: "#4ade80",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>MakeCode Full JS</div>
        <div style={{
          fontSize: 32,
          fontWeight: "bold",
          color: "#fff",
          letterSpacing: 2,
          textShadow: "0 0 20px #4ade8088",
        }}>🐍 Snake</div>
        <div style={{ fontSize: 11, color: "#4ade8077", marginTop: 4, letterSpacing: 3 }}>
          micro:bit 5×5 LED
        </div>
      </div>

      {/* micro:bit shell */}
      <div style={{
        background: "linear-gradient(145deg, #1c1c2e 0%, #12121f 100%)",
        borderRadius: 28,
        padding: "24px 20px 20px",
        boxShadow: "0 0 60px #4ade8022, 0 20px 60px #00000088, inset 0 1px 0 #ffffff11",
        border: "1px solid #2a2a3a",
        width: 260,
      }}>
        {/* Score row */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          padding: "0 4px",
        }}>
          <div style={{ fontSize: 10, color: "#4ade8099", letterSpacing: 2 }}>SCORE</div>
          <div style={{
            fontSize: 22,
            fontWeight: "bold",
            color: "#4ade80",
            textShadow: "0 0 10px #4ade80",
          }}>{game.score.toString().padStart(3, "0")}</div>
          <div style={{ fontSize: 13, color: "#4ade8066" }}>{dirArrow}</div>
        </div>

        {/* LED Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 5,
          background: "#050a06",
          borderRadius: 12,
          padding: 12,
          boxShadow: "inset 0 2px 12px #000, 0 0 30px #4ade8011",
          border: "1px solid #1a2a1a",
          animation: deadAnim ? "shake 0.4s ease" : "none",
        }}>
          {Array.from({ length: 5 }, (_, y) =>
            Array.from({ length: 5 }, (_, x) => {
              const snake = isSnake(x, y);
              const head = isHead(x, y);
              const food = isFood(x, y) && foodBlink;
              const on = snake || food;
              return (
                <div key={`${x}-${y}`} style={{
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: 4,
                  background: head
                    ? "#ffffff"
                    : snake
                    ? "#4ade80"
                    : food
                    ? "#ff6b6b"
                    : "#0d1a0e",
                  boxShadow: head
                    ? "0 0 10px #fff, 0 0 20px #4ade80"
                    : snake
                    ? "0 0 6px #4ade80aa"
                    : food
                    ? "0 0 8px #ff6b6baa"
                    : "inset 0 1px 3px #000",
                  transition: "background 0.08s, box-shadow 0.08s",
                }} />
              );
            })
          )}
        </div>

        {/* Status message */}
        <div style={{
          textAlign: "center",
          marginTop: 10,
          fontSize: 11,
          minHeight: 16,
          color: game.status === "dead" ? "#ff6b6b" : "#4ade8066",
          letterSpacing: 2,
        }}>
          {game.status === "dead" ? "💀 GAME OVER — pressione A" : ""}
        </div>

        {/* Buttons */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 16,
          padding: "0 8px",
        }}>
          {[["A", "Esquerda / Iniciar", turnLeft], ["B", "Direita", turnRight]].map(([label, tip, fn]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <button onClick={fn} style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "linear-gradient(145deg, #2a2a3a, #1a1a28)",
                border: "2px solid #3a3a50",
                color: "#c8ffc0",
                fontSize: 16,
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 3px 8px #000, inset 0 1px 0 #ffffff22",
                fontFamily: "monospace",
                transition: "all 0.1s",
              }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >{label}</button>
              <div style={{ fontSize: 8, color: "#4ade8055", textAlign: "center", maxWidth: 60 }}>{tip}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard hint */}
      <div style={{
        marginTop: 16,
        fontSize: 10,
        color: "#4ade8044",
        letterSpacing: 2,
        textAlign: "center",
      }}>
        ← → ou A D no teclado
      </div>

      {/* Code toggle */}
      <div style={{ marginTop: 24, width: "100%", maxWidth: 640 }}>
        <button onClick={() => setShowCode(v => !v)} style={{
          background: "transparent",
          border: "1px solid #4ade8044",
          color: "#4ade80",
          padding: "8px 18px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 11,
          letterSpacing: 2,
          fontFamily: "monospace",
          display: "block",
          margin: "0 auto",
          transition: "all 0.2s",
        }}
          onMouseOver={e => e.currentTarget.style.borderColor = "#4ade80aa"}
          onMouseOut={e => e.currentTarget.style.borderColor = "#4ade8044"}
        >
          {showCode ? "▲ ESCONDER CÓDIGO" : "▼ VER CÓDIGO MAKECODE"}
        </button>

        {showCode && (
          <div style={{
            marginTop: 12,
            background: "#050a06",
            border: "1px solid #1a3a1a",
            borderRadius: 12,
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
              borderBottom: "1px solid #1a3a1a",
              background: "#0a120a",
            }}>
              <span style={{ fontSize: 10, letterSpacing: 2, color: "#4ade8077" }}>
                snake.ts — MakeCode Full JS
              </span>
              <button onClick={copyCode} style={{
                background: copied ? "#4ade8022" : "transparent",
                border: "1px solid #4ade8044",
                color: copied ? "#4ade80" : "#4ade8099",
                padding: "4px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 10,
                fontFamily: "monospace",
                letterSpacing: 1,
              }}>
                {copied ? "✓ COPIADO" : "COPIAR"}
              </button>
            </div>
            <pre style={{
              margin: 0,
              padding: "16px",
              fontSize: 11,
              lineHeight: 1.7,
              color: "#a8d8a0",
              overflowX: "auto",
              maxHeight: 380,
              overflowY: "auto",
            }}>
              <code>{MAKECODE_SOURCE}</code>
            </pre>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-6px)}
          40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
      `}</style>
    </div>
  );
}