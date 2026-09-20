"use client"

import React, { useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ImagePlus, X } from "lucide-react"
import { toast } from "sonner"

interface MultiImageUploadProps {
    files: File[]
    onChange: (files: File[]) => void
    max?: number          // keep in sync with MAX_PROOF_IMAGES in main.py
    maxSizeMB?: number    // keep in sync with MAX_PROOF_IMAGE_BYTES in main.py
    disabled?: boolean
}

export default function MultiImageUpload({
    files,
    onChange,
    max = 5,
    maxSizeMB = 5,
    disabled = false,
}: MultiImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    // Preview URLs, revoked on change/unmount so we don't leak memory
    const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
    useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

    const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files || [])
        e.target.value = "" // lets the user pick the same file again later

        const valid = picked.filter((f) => {
            if (!f.type.startsWith("image/")) {
                toast.error(`${f.name} is not an image`)
                return false
            }
            if (f.size > maxSizeMB * 1024 * 1024) {
                toast.error(`${f.name} is larger than ${maxSizeMB}MB`)
                return false
            }
            return true
        })

        const room = max - files.length
        if (valid.length > room) {
            toast.error(`You can upload up to ${max} images`)
        }
        onChange([...files, ...valid.slice(0, Math.max(room, 0))])
    }

    const removeAt = (i: number) => onChange(files.filter((_, idx) => idx !== i))

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePick}
                disabled={disabled}
            />

            {files.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {previews.map((src, i) => (
                        <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-neutral-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`Proof ${i + 1}`} className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeAt(i)}
                                disabled={disabled}
                                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                                aria-label={`Remove image ${i + 1}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {files.length < max && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    {files.length === 0 ? "Add image" : "Add another image"}
                    <span className="ml-2 text-xs opacity-60">
                        {files.length}/{max}
                    </span>
                </Button>
            )}
        </div>
    )
}

/*
 * ── How to wire it into your task-submission modal ─────────────────────────
 *
 * 1. State (replace your single `file` state):
 *      const [proofFiles, setProofFiles] = useState<File[]>([])
 *
 * 2. Render where your single file input used to be:
 *      <MultiImageUpload files={proofFiles} onChange={setProofFiles} />
 *
 * 3. In the submit handler, append every file under the SAME key "files":
 *      const formData = new FormData()
 *      formData.append("walletAddress", address)
 *      formData.append("taskId", task.id)
 *      formData.append("submissionType", task.verificationType)
 *      if (link) formData.append("submittedData", link)
 *      proofFiles.forEach((f) => formData.append("files", f))
 *      await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}/submissions`, {
 *          method: "POST",
 *          body: formData,   // no Content-Type header — the browser sets it
 *      })
 *
 * 4. Show the result (admin review / participant history):
 *      const images = sub.proofUrls?.length ? sub.proofUrls : [sub.submittedData]
 */