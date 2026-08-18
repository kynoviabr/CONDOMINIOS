"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";

type QrCameraScannerProps = {
  onScanAction: (formData: FormData) => Promise<void> | void;
};

export function QrCameraScanner({ onScanAction }: QrCameraScannerProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedPayload, setScannedPayload] = useState<string>("");
  const streamRef = useRef<MediaStream | null>(null);

  async function startCamera() {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Acesso à câmera não é suportado neste navegador.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Permissão da câmera negada";
      setCameraError(`Erro ao abrir câmera: ${msg}`);
      setIsScanning(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }

  useEffect(() => {
    let animationFrameId: number;
    let barcodeDetector: { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } | null = null;

    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const BD = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => typeof barcodeDetector }).BarcodeDetector;
        barcodeDetector = new BD({ formats: ["qr_code"] });
      } catch {
        barcodeDetector = null;
      }
    }

    async function detectFrame() {
      if (isScanning && videoRef.current && videoRef.current.readyState >= 2 && barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0]?.rawValue) {
            const rawValue = barcodes[0].rawValue;
            setScannedPayload(rawValue);
            stopCamera();

            // Auto-submit form
            const form = document.getElementById("qr-validation-form") as HTMLFormElement | null;
            if (form) {
              const input = form.querySelector('input[name="qrPayload"]') as HTMLInputElement | null;
              if (input) {
                input.value = rawValue;
                form.requestSubmit();
              }
            }
            return;
          }
        } catch {
          // Frame detection pass
        }
      }

      if (isScanning) {
        animationFrameId = requestAnimationFrame(detectFrame);
      }
    }

    if (isScanning) {
      animationFrameId = requestAnimationFrame(detectFrame);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isScanning]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        {!isScanning ? (
          <button
            onClick={startCamera}
            style={{
              alignItems: "center",
              display: "inline-flex",
              gap: "6px",
              padding: "10px 16px"
            }}
            type="button"
          >
            📷 Ler QR Code pela Câmera
          </button>
        ) : (
          <button
            className="secondary"
            onClick={stopCamera}
            style={{ padding: "10px 16px" }}
            type="button"
          >
            ⏹️ Parar Câmera
          </button>
        )}
      </div>

      {cameraError ? (
        <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: "6px 0" }}>{cameraError}</p>
      ) : null}

      {isScanning ? (
        <div
          style={{
            background: "#0f172a",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            marginBottom: "16px",
            maxWidth: "480px",
            overflow: "hidden",
            position: "relative"
          }}
        >
          <video
            muted
            playsInline
            ref={videoRef}
            style={{ display: "block", height: "auto", width: "100%" }}
          />
          <div
            style={{
              border: "2px dashed #22c55e",
              borderRadius: "12px",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
              height: "200px",
              left: "50%",
              pointerEvents: "none",
              position: "absolute",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "200px"
            }}
          />
          <p
            style={{
              bottom: "8px",
              color: "#ffffff",
              fontSize: "0.8rem",
              left: "0",
              margin: 0,
              position: "absolute",
              right: "0",
              textAlign: "center",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)"
            }}
          >
            Aponte a câmera para o QR Code do visitante
          </p>
        </div>
      ) : null}

      {/* Formulário Principal de Validação de QR Code */}
      <form action={onScanAction} className="auth-form" id="qr-validation-form">
        <label>
          Payload / Código do Convite (Cole ou use leitor USB)
          <input
            autoComplete="off"
            autoFocus
            defaultValue={scannedPayload}
            name="qrPayload"
            placeholder="Ex: inv:00000000-0000-0000-0000-000000000701:token..."
            required
          />
        </label>
        <button style={{ minHeight: "44px" }} type="submit">
          ✅ Validar e Liberar Acesso
        </button>
      </form>
    </div>
  );
}
