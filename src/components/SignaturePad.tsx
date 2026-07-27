import { useRef, useState } from "react";

interface SignaturePadProps {
  onCapture: (blob: Blob) => void;
  onCancel?: () => void;
}

export const SignaturePad = ({ onCapture, onCancel }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = getPos(e);
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#2D2926";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    setHasDrawn(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, "image/png");
  };

  return (
    <div>
      <p className="font-body text-xs text-muted-foreground mb-2">Sign below to confirm you received the package.</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={160}
        className="w-full border border-border rounded-lg bg-background touch-none"
        style={{ touchAction: "none" }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={clear}
          className="flex-1 border border-border text-foreground font-display text-xs font-semibold py-2 rounded-lg hover:bg-secondary transition-colors"
        >
          Clear
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-border text-foreground font-display text-xs font-semibold py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!hasDrawn}
          className="flex-1 bg-gradient-gold text-accent-foreground font-display text-xs font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Confirm signature
        </button>
      </div>
    </div>
  );
};
