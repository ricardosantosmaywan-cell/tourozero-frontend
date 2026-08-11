import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface SignaturePadHandle {
    clear: () => void;
    isEmpty: () => boolean;
    toDataURL: () => string;
}

interface SignaturePadProps {
    className?: string;
    height?: number;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
    ({ className, height = 200 }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const drawingRef = useRef(false);
        const [hasDrawn, setHasDrawn] = useState(false);

        useEffect(() => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const resize = () => {
                const width = container.clientWidth;
                const dpr = window.devicePixelRatio || 1;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = '#111111';
                }
            };

            resize();
            window.addEventListener('resize', resize);
            return () => window.removeEventListener('resize', resize);
        }, [height]);

        function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
            const canvas = canvasRef.current!;
            const rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }

        function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.setPointerCapture(e.pointerId);
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const { x, y } = getPos(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            drawingRef.current = true;
        }

        function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
            if (!drawingRef.current) return;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!ctx) return;
            const { x, y } = getPos(e);
            ctx.lineTo(x, y);
            ctx.stroke();
            if (!hasDrawn) setHasDrawn(true);
        }

        function handlePointerUp() {
            drawingRef.current = false;
        }

        useImperativeHandle(ref, () => ({
            clear: () => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (canvas && ctx) {
                    const dpr = window.devicePixelRatio || 1;
                    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
                }
                setHasDrawn(false);
            },
            isEmpty: () => !hasDrawn,
            toDataURL: () => canvasRef.current?.toDataURL('image/png') || '',
        }), [hasDrawn]);

        return (
            <div ref={containerRef} className={className}>
                <canvas
                    ref={canvasRef}
                    className="w-full rounded-lg bg-white touch-none"
                    style={{ height }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                />
            </div>
        );
    }
);

SignaturePad.displayName = 'SignaturePad';
