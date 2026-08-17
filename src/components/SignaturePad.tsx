import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface SignaturePadHandle {
    clear: () => void;
    isEmpty: () => boolean;
    toDataURL: () => string;
}

interface SignaturePadProps {
    className?: string;
    /** Altura fixa em px. Se omitida, o pad ocupa 100% da altura do contentor pai (modo "fill"). */
    height?: number;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
    ({ className, height }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const drawingRef = useRef(false);
        const [hasDrawn, setHasDrawn] = useState(false);
        const fill = height === undefined;

        useEffect(() => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const resize = () => {
                const width = container.clientWidth;
                const cssHeight = fill ? container.clientHeight : height!;
                if (width === 0 || cssHeight === 0) return;
                const dpr = window.devicePixelRatio || 1;

                // Preserva o desenho existente ao redimensionar (ex: rotação do ecrã)
                const prev = hasDrawn ? canvas.toDataURL('image/png') : null;

                canvas.width = width * dpr;
                canvas.height = cssHeight * dpr;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${cssHeight}px`;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = '#111111';
                    if (prev) {
                        const img = new Image();
                        img.onload = () => ctx.drawImage(img, 0, 0, width, cssHeight);
                        img.src = prev;
                    }
                }
            };

            resize();

            const observer = new ResizeObserver(resize);
            observer.observe(container);
            window.addEventListener('orientationchange', resize);
            return () => {
                observer.disconnect();
                window.removeEventListener('orientationchange', resize);
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [height, fill]);

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
            <div ref={containerRef} className={className} style={fill ? { height: '100%' } : undefined}>
                <canvas
                    ref={canvasRef}
                    className="w-full rounded-lg bg-white touch-none block"
                    style={fill ? { height: '100%' } : { height }}
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
