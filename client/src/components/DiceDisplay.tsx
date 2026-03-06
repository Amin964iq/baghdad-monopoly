interface Props {
  dice: { die1: number; die2: number; total: number; isDouble: boolean } | null;
}

const DOT_POSITIONS: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function DieFace({ value, isDouble }: { value: number; isDouble: boolean }) {
  const dots = DOT_POSITIONS[value] || [];
  return (
    <div className={`die-3d ${isDouble ? 'die-double' : ''}`}>
      <div className="die-face">
        {[0, 1, 2].map(row => (
          <div key={row} className="die-row">
            {[0, 1, 2].map(col => (
              <div key={col} className="die-cell">
                {dots.some(([r, c]) => r === row && c === col) && (
                  <div className="die-dot" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DiceDisplay({ dice }: Props) {
  if (!dice) return null;

  return (
    <div className={`dice-display ${dice.isDouble ? 'double' : ''}`}>
      <div className="dice-container">
        <DieFace value={dice.die1} isDouble={dice.isDouble} />
        <DieFace value={dice.die2} isDouble={dice.isDouble} />
      </div>
      <div className="dice-total">{dice.total}</div>
      {dice.isDouble && <div className="dice-double-text">دوبل! 🎯</div>}
    </div>
  );
}
