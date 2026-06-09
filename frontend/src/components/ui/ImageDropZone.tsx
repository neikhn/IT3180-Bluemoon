import React, { useCallback, useRef, useState } from "react"
import { UploadCloud, X } from "lucide-react"

interface ImageDropZoneProps {
  value?: string
  onChange: (base64: string) => void
  label?: string
  accept?: string
  maxSizeMB?: number
  className?: string
}

export function ImageDropZone({
  value,
  onChange,
  label = "Kéo thả hoặc bấm để chọn ảnh",
  accept = "image/*",
  maxSizeMB = 5,
  className = "",
}: ImageDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setError(null)
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh hợp lệ.")
      return
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Kích thước ảnh không được vượt quá ${maxSizeMB}MB.`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      onChange(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [maxSizeMB, onChange])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
          isDragActive
            ? "border-primary bg-primary/5"
            : error
            ? "border-destructive bg-destructive/5"
            : value
            ? "border-border bg-muted/20"
            : "border-muted-foreground/30 bg-muted/10 hover:bg-muted/30 hover:border-muted-foreground/50"
        }`}
      >
        {value ? (
          <div className="relative h-full w-full flex items-center justify-center">
            <img src={value} alt="Preview" className="max-h-[200px] max-w-full rounded-md object-contain" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
                if (inputRef.current) inputRef.current.value = ""
              }}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-md transition-transform hover:scale-110"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className={`h-8 w-8 ${isDragActive ? "text-primary" : "text-muted-foreground/60"}`} />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs opacity-70">PNG, JPG tối đa {maxSizeMB}MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

interface MultiImageDropZoneProps {
  values: string[]
  onChange: (base64s: string[]) => void
  maxFiles?: number
  label?: string
  accept?: string
  maxSizeMB?: number
  className?: string
}

export function MultiImageDropZone({
  values,
  onChange,
  maxFiles = 3,
  label = "Kéo thả hoặc bấm để chọn ảnh",
  accept = "image/*",
  maxSizeMB = 5,
  className = "",
}: MultiImageDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = (files: FileList | File[]) => {
    setError(null)
    const validFiles: File[] = []
    let err = ""

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        err = "Chỉ chấp nhận file ảnh."
      } else if (file.size > maxSizeMB * 1024 * 1024) {
        err = `Ảnh không được vượt quá ${maxSizeMB}MB.`
      } else {
        validFiles.push(file)
      }
    })

    if (err) setError(err)

    const totalAllowed = maxFiles - values.length
    const toProcess = validFiles.slice(0, totalAllowed)

    if (toProcess.length < validFiles.length) {
      setError(`Chỉ có thể tải lên tối đa ${maxFiles} ảnh.`)
    }

    if (toProcess.length === 0) return

    let processedCount = 0
    const newBase64s: string[] = []

    toProcess.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        newBase64s.push(reader.result as string)
        processedCount++
        if (processedCount === toProcess.length) {
          onChange([...values, ...newBase64s])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [values, maxFiles, maxSizeMB])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const removeImage = (index: number) => {
    const newVals = [...values]
    newVals.splice(index, 1)
    onChange(newVals)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {values.length < maxFiles && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
            isDragActive
              ? "border-primary bg-primary/5"
              : error
              ? "border-destructive bg-destructive/5"
              : "border-muted-foreground/30 bg-muted/10 hover:bg-muted/30 hover:border-muted-foreground/50"
          }`}
        >
          <UploadCloud className={`mb-2 h-6 w-6 ${isDragActive ? "text-primary" : "text-muted-foreground/60"}`} />
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/70">
            Tối đa {maxFiles} ảnh ({values.length}/{maxFiles})
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}
      
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {values.map((val, idx) => (
            <div key={idx} className="group relative aspect-square rounded-lg border bg-muted/20">
              <img src={val} alt="" className="h-full w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -right-2 -top-2 z-10 hidden rounded-full bg-destructive p-1 text-destructive-foreground shadow-md transition-transform hover:scale-110 group-hover:block"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
