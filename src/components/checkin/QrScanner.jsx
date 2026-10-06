import React, { useEffect, useRef, useState } from "react";
import jsqr from "jsqr";
import { X, Upload, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// In-app QR scanner for centre check-in codes.
// Calls onResult(decodedText) once, then stops the camera.
export default function QrScanner({ onResult, onClose }) {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const doneRef = useRef(false);
  const [errKind, setErrKind] = useState(null); // null | denied | busy | missing | failed
  const [starting, setStarting] = useState(true);
  const [retryN, setRetryN] = useState(0);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  };

  const handleText = (text) => {
    if (!text || doneRef.current) return;
    doneRef.current = true;
    stop();
    onResult(text);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      // Not every failure means "blocked": name it so the message can be true.
      const fail = (e) => {
        console.log("qr camera:", JSON.stringify({ name: e?.name || null, msg: e?.message || null }));
        if (!alive) return;
        const n = e?.name || "";
        if (n === "NotAllowedError" || n === "SecurityError") setErrKind("denied");
        else if (n === "NotReadableError" || n === "AbortError") setErrKind("busy");
        else if (n === "NotFoundError" || n === "OverconstrainedError") setErrKind("missing");
        else setErrKind("failed");
        setStarting(false);
      };
      const attach = async (stream) => {
        if (!alive) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        try {
          await video.play();
        } catch (e) {
          fail(e);
          return;
        }
        if (!alive) return;
        setStarting(false);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const tick = () => {
          if (!alive || doneRef.current) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsqr(img.data, img.width, img.height);
            if (code?.data) {
              handleText(code.data);
              return;
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      };
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          fail({ name: "NotFoundError" });
          return;
        }
        try {
          // Prefer the rear camera, but accept ANY camera (laptops only have one).
          attach(await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          }));
        } catch (e) {
          if (!alive) return;
          if (e?.name === "OverconstrainedError") {
            attach(await navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
          } else {
            fail(e);
          }
        }
      } catch (e) {
        fail(e);
      }
    })();
    return () => {
      alive = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryN]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const size = Math.min(800, img.width, img.height);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size);
      const code = jsqr(data.data, data.width, data.height);
      URL.revokeObjectURL(img.src);
      if (code?.data) handleText(code.data);
      else alert(t("ciScanInvalid"));
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 grid place-items-center p-4">
      <div className="panel-solid orbital soft-shadow p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">{t("ciScanBtn")}</h2>
          <button
            type="button"
            onClick={() => {
              stop();
              onClose();
            }}
            aria-label={t("ciScanCancel")}
            className="h-9 w-9 rounded-full grid place-items-center border border-border hover:bg-primary/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {errKind ? (
          <p className="text-sm text-destructive">
            {t(
              errKind === "denied" ? "ciScanDenied"
              : errKind === "busy" ? "ciScanBusy"
              : errKind === "missing" ? "ciScanMissing"
              : "ciScanFail"
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("ciScanHint")}</p>
        )}
        <div className="mt-4 rounded-2xl overflow-hidden bg-black aspect-square grid place-items-center">
          {starting && !errKind ? (
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          ) : (
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          )}
        </div>
        {errKind && errKind !== "denied" && (
          <button
            type="button"
            onClick={() => {
              stop();
              setErrKind(null);
              setStarting(true);
              setRetryN((n) => n + 1);
            }}
            className="mt-4 w-full h-12 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
          >
            {t("ciScanRetry")}
          </button>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <label className="mt-4 flex items-center justify-center gap-2 h-12 rounded-full border border-border text-sm font-semibold cursor-pointer hover:bg-primary/10 transition">
          <Upload className="w-4 h-4" /> {t("ciScanUpload")}
          <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
        </label>
      </div>
    </div>
  );
}
