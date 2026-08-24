'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { mockDb } from '@/lib/supabase/client';
import { Model3D } from '@/types/database';
import {
  Box, Upload, CheckCircle2, Trash2, Eye, FileUp, Sparkles, Check, AlertCircle, RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function AdminModelsPage() {
  const [models, setModels] = useState<Model3D[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadModels = async () => {
    setIsLoadingModels(true);
    const data = await mockDb.getModels();
    setModels(data);
    setIsLoadingModels(false);
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
        setErrorMsg('Please select a 3D model file in .glb or .gltf format.');
        return;
      }
      if (file.size > 157286400) { // 150MB
        setErrorMsg('File is too large. Maximum allowed size is 150MB.');
        return;
      }
      setErrorMsg('');
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      setErrorMsg('Please select a 3D model file in .glb or .gltf format.');
      return;
    }
    setErrorMsg('');
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const form = new FormData();
      form.append('title', title);
      form.append('description', description);
      if (selectedFile) {
        form.append('file', selectedFile);
      }

      setUploadProgress(30);

      const res = await fetch('/api/models/upload', {
        method: 'POST',
        body: form,
      });

      setUploadProgress(85);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadProgress(100);

      // Refresh models list from live DB
      await loadModels();

      setIsUploading(false);
      setUploadProgress(0);
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setSuccessMsg(
        `✓ "${data.model.title}" uploaded and set as the active 3D walkthrough model!`
      );
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Upload failed: ${msg}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSetActive = async (id: string) => {
    await mockDb.setActiveModel(id);
    await loadModels();
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      await mockDb.deleteModel(id);
      await loadModels();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const truncateUrl = (url: string) => {
    if (url.startsWith('data:')) return 'Embedded GLB Data';
    if (url.length > 60) return url.slice(0, 57) + '…';
    return url;
  };

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">3D Model & Architecture Manager</h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload GLB models, manage draft/published states, and configure the active walkthrough model.
            </p>
          </div>
          <button
            onClick={loadModels}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingModels ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
            {successMsg}
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-none" />
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ====== UPLOAD FORM ====== */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <FileUp className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">Upload New 3D Model</h2>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Project Title */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Project Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. The Grand Horizon Villa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Enter property details, sq ft, bedroom layout..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none resize-none transition"
                />
              </div>

              {/* Drop Zone */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">3D Asset File (.GLB / .GLTF)</label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center bg-slate-950/60 transition cursor-pointer hover:border-sky-500/70 ${
                    selectedFile ? 'border-sky-500/60 bg-sky-950/20' : 'border-slate-800'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${selectedFile ? 'text-sky-400' : 'text-slate-500'}`} />
                  {selectedFile ? (
                    <>
                      <p className="font-bold text-sky-300">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatBytes(selectedFile.size)}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-white">Drag & drop or click to browse</p>
                      <p className="text-[10px] text-slate-400 mt-1">Supported: .glb, .gltf — Max 150MB</p>
                    </>
                  )}
                </div>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="mt-1.5 text-[10px] text-slate-500 hover:text-red-400 transition"
                  >
                    × Remove file
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      {uploadProgress < 30 ? 'Preparing...' :
                       uploadProgress < 85 ? 'Uploading to cloud storage...' :
                       'Saving to database...'}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || !title}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isUploading ? 'Uploading to Cloud Storage...' : 'Upload & Activate Model'}
              </button>

              {!selectedFile && (
                <p className="text-[10px] text-slate-500 text-center">
                  No file? A sample 3D scene will be used as placeholder.
                </p>
              )}
            </form>
          </div>

          {/* ====== MODELS LIST ====== */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">Uploaded 3D Models</h2>
              </div>
              <span className="text-xs text-slate-400">{models.length} total model{models.length !== 1 ? 's' : ''}</span>
            </div>

            {isLoadingModels ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                Loading from database...
              </div>
            ) : models.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Box className="w-8 h-8 mx-auto mb-3 opacity-40" />
                No models uploaded yet. Upload your first GLB file above.
              </div>
            ) : (
              <div className="space-y-4">
                {models.map((m) => (
                  <div
                    key={m.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      m.is_active
                        ? 'bg-sky-950/20 border-sky-500/50 ring-1 ring-sky-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white">{m.title}</h3>
                          {m.is_active && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                              <Check className="w-3 h-3" /> ACTIVE LIVE WALKTHROUGH
                            </span>
                          )}
                          {m.status === 'DRAFT' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/40">
                              DRAFT
                            </span>
                          )}
                        </div>
                        {m.description && (
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono mt-2">
                          <span className="truncate" title={m.file_path}>
                            {truncateUrl(m.file_path)}
                          </span>
                          <span className="flex-none">{formatBytes(m.file_size_bytes || 0)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start flex-none">
                        {!m.is_active && (
                          <button
                            onClick={() => handleSetActive(m.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold border border-emerald-600/40 transition"
                          >
                            Set Active
                          </button>
                        )}

                        <Link
                          href="/walkthrough"
                          className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white text-xs font-semibold border border-sky-500/40 transition flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </Link>

                        <button
                          onClick={() => handleDelete(m.id, m.title)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/40 transition"
                          title="Delete model"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
