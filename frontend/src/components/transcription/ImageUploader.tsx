'use client';

import { useRef, useState } from 'react';
import { Upload, Camera, X } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClear: () => void;
}

export default function ImageUploader({ onImageSelect, selectedImage, onClear }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // プレビュー生成
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    onImageSelect(file);
  };

  const handleClear = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClear();
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        書類の写真
      </label>

      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-4">
              <Upload className="text-slate-400" size={32} />
              <Camera className="text-slate-400" size={32} />
            </div>
            <div>
              <p className="text-slate-600 font-medium">クリックして画像を選択</p>
              <p className="text-slate-400 text-sm mt-1">またはカメラで撮影</p>
              <p className="text-slate-400 text-xs mt-1">JPEG / PNG（10MB以下）</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative border border-slate-200 rounded-lg overflow-hidden">
          <img
            src={preview}
            alt="アップロード画像プレビュー"
            className="w-full max-h-64 object-contain bg-slate-50"
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
            title="画像を削除"
          >
            <X size={16} />
          </button>
          <div className="p-2 bg-slate-50 text-sm text-slate-500">
            {selectedImage?.name}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
