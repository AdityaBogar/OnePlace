'use client';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { mockDb } from '@/lib/supabase/client';
import { Model3D } from '@/types/database';
import { Box, Upload, CheckCircle2, Trash2, Eye, FileUp, Sparkles, Check } from 'lucide-react';
import Link from 'next/link';

export default function AdminModelsPage() {
  const [models, setModels] = useState<Model3D[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    mockDb.getModels().then(setModels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
        alert('Please select a 3D model file in .glb or .gltf format.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsUploading(true);
    setUploadProgress(20);

    try {
      let filePath = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Sponza/glTF-Binary/Sponza.glb';

      if (selectedFile) {
        setUploadProgress(60);
        filePath = await readFileAsDataUrl(selectedFile);
      }

      setUploadProgress(90);

      const newModel = await mockDb.addModel({
        title,
        description: description || null,
        file_path: filePath,
        file_size_bytes: selectedFile ? selectedFile.size : 8500000,
        is_active: true,
        status: 'PUBLISHED',
        created_by: 'user-admin-01',
      });

      await mockDb.setActiveModel(newModel.id);

      const updatedList = await mockDb.getModels();
      setModels(updatedList);
      setIsUploading(false);
      setUploadProgress(0);
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setSuccessMsg('3D Model uploaded successfully and set as active live walkthrough model!');

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert('Failed to process 3D model: ' + errorMsg);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSetActive = async (id: string) => {
    await mockDb.setActiveModel(id);
    const updatedList = await mockDb.getModels();
    setModels(updatedList);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this 3D model?')) {
      await mockDb.deleteModel(id);
      const updatedList = await mockDb.getModels();
      setModels(updatedList);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">3D Model & Architecture Manager</h1>
          <p className="text-xs text-slate-400 mt-1">Upload GLB models, manage draft/published states, and configure active public walkthrough models.</p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* UPLOAD FORM */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <FileUp className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">Upload New 3D Model</h2>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. The Grand Horizon Villa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Enter property details, sq ft, bedroom layout..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium focus:outline-none"
                />
              </div>

              {/* Drag and Drop Box */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">3D Asset File (.GLB / .GLTF)</label>
                <div className="relative border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 text-center bg-slate-950/60 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-sky-400 mx-auto mb-2" />
                  <p className="font-semibold text-white">
                    {selectedFile ? selectedFile.name : 'Drag & drop GLB file or click to browse'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Supported formats: .glb, .gltf (Max 150MB)</p>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Uploading & Processing 3D Geometry...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || !title}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isUploading ? 'Processing 3D Asset...' : 'Upload & Process Model'}
              </button>
            </form>
          </div>

          {/* MODELS REPOSITORY TABLE */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">Uploaded 3D Models</h2>
              </div>
              <span className="text-xs text-slate-400">{models.length} total models</span>
            </div>

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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{m.title}</h3>
                        {m.is_active && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                            <Check className="w-3 h-3" /> ACTIVE LIVE WALKTHROUGH
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.description}</p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono mt-2">
                        <span className="truncate max-w-xs">Path: {m.file_path.startsWith('data:') ? 'Embedded Base64 GLB Data' : m.file_path}</span>
                        <span>Size: {Math.round((m.file_size_bytes || 0) / 1024 / 1024 * 10) / 10} MB</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {!m.is_active && (
                        <button
                          onClick={() => handleSetActive(m.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-semibold transition"
                        >
                          Set Active
                        </button>
                      )}

                      <Link
                        href="/walkthrough"
                        className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </Link>

                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
