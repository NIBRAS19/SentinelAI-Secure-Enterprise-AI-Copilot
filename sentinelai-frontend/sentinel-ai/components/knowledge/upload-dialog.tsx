"use client";

import { useRef, useState } from "react";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const STAGES = ["Validating", "Extracting text", "Chunking", "Generating embeddings", "Indexing"];

export function UploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (filename: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState(-1); // -1 = not started
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function reset() {
    clearTimer();
    setFile(null);
    setStage(-1);
    setDone(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function startProcessing() {
    if (!file) return;
    setStage(0);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      if (i >= STAGES.length) {
        clearTimer();
        setDone(true);
      } else {
        setStage(i);
      }
    }, 650);
  }

  function finish() {
    if (file) onUploaded(file.name);
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Upload document">
      {stage === -1 ? (
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line px-6 py-10 text-center hover:bg-panel-raised">
            <Upload className="mb-2 h-5 w-5 text-faint" />
            <span className="text-sm text-paper">{file ? file.name : "Choose a file or drop it here"}</span>
            <span className="mt-1 text-xs text-faint">PDF, DOCX, TXT or Markdown</span>
            <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <p className="text-xs text-faint">
            Every upload runs through malware/file validation, a prompt-injection scan, and a PII scan before it
            becomes searchable (PRD §16, §34).
          </p>
          <Button className="w-full" disabled={!file} onClick={startProcessing}>
            Start processing
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="truncate text-sm text-paper">{file?.name}</p>
          <div className="space-y-3">
            {STAGES.map((label, i) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                {i < stage || done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-status-safe" />
                ) : i === stage ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-signal" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-line" />
                )}
                <span className={i <= stage || done ? "text-paper" : "text-faint"}>{label}</span>
              </div>
            ))}
          </div>
          <Progress value={done ? 100 : ((stage + 1) / STAGES.length) * 100} />
          {done ? (
            <Button className="w-full" onClick={finish}>
              Done — view in Knowledge
            </Button>
          ) : (
            <p className="text-center text-xs text-faint">Processing runs asynchronously — this window can be closed.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
