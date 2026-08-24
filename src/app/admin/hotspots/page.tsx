'use client';

import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { WalkthroughCanvas } from '@/components/3d/WalkthroughCanvas';
import { mockDb } from '@/lib/supabase/client';
import { Hotspot, Model3D } from '@/types/database';
import { MapPin, Plus, Trash2, Edit3, Save, CheckCircle2, Compass } from 'lucide-react';

export default function AdminHotspotsPage() {
  const [activeModel, setActiveModel] = useState<Model3D | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<Partial<Hotspot> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    mockDb.getActiveModel().then((res) => {
      if (res) {
        setActiveModel(res.model);
        setHotspots(res.hotspots);
      }
    });
  }, []);

  const handleSaveHotspot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotspot || !selectedHotspot.name || !activeModel) return;

    const saved = await mockDb.saveHotspot({
      id: selectedHotspot.id,
      model_id: activeModel.id,
      name: selectedHotspot.name,
      description: selectedHotspot.description || null,
      pos_x: Number(selectedHotspot.pos_x) || 0,
      pos_y: Number(selectedHotspot.pos_y) || 1.2,
      pos_z: Number(selectedHotspot.pos_z) || 0,
      rot_y: Number(selectedHotspot.rot_y) || 0,
      target_pos_x: Number(selectedHotspot.target_pos_x) || 0,
      target_pos_y: Number(selectedHotspot.target_pos_y) || 1.7,
      target_pos_z: Number(selectedHotspot.target_pos_z) || -2,
      target_rot_y: Number(selectedHotspot.target_rot_y) || 0,
      is_enabled: selectedHotspot.is_enabled ?? true,
    });

    const updated = await mockDb.getHotspotsByModel(activeModel.id);
    setHotspots(updated);
    setIsEditing(false);
    setSelectedHotspot(null);
    setSuccessMsg(`Tour point "${saved.name}" saved successfully.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteHotspot = async (id: string) => {
    if (confirm('Delete this spatial hotspot point?')) {
      await mockDb.deleteHotspot(id);
      if (activeModel) {
        const updated = await mockDb.getHotspotsByModel(activeModel.id);
        setHotspots(updated);
      }
    }
  };

  const startNewHotspot = () => {
    setSelectedHotspot({
      name: 'New Room Point',
      description: 'Room spatial highlights',
      pos_x: 0,
      pos_y: 1.2,
      pos_z: 2,
      rot_y: 0,
      target_pos_x: 0,
      target_pos_y: 1.7,
      target_pos_z: 0,
      target_rot_y: 0,
      is_enabled: true,
    });
    setIsEditing(true);
  };

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Interactive 3D Hotspot Editor</h1>
            <p className="text-xs text-slate-400 mt-1">Configure spatial navigation tour points, room camera targets, and orientation vectors.</p>
          </div>

          <button
            onClick={startNewHotspot}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add Spatial Hotspot
          </button>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* REALTIME 3D VIEWPORT PREVIEW */}
          <div className="lg:col-span-2 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl h-[550px] relative">
            <WalkthroughCanvas model={activeModel} hotspots={hotspots} />
          </div>

          {/* EDIT & LIST SIDE PANEL */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-6">
            {isEditing && selectedHotspot ? (
              <form onSubmit={handleSaveHotspot} className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-sky-400" />
                    {selectedHotspot.id ? 'Edit Hotspot' : 'Configure New Hotspot'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Hotspot Name</label>
                  <input
                    type="text"
                    value={selectedHotspot.name || ''}
                    onChange={(e) => setSelectedHotspot({ ...selectedHotspot, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Room Description</label>
                  <textarea
                    value={selectedHotspot.description || ''}
                    onChange={(e) => setSelectedHotspot({ ...selectedHotspot, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-500 text-white font-medium"
                  />
                </div>

                {/* Coordinates Grid */}
                <div className="space-y-2 pt-2">
                  <span className="text-slate-400 font-semibold block">3D Spatial Position (X, Y, Z):</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={selectedHotspot.pos_x ?? 0}
                      onChange={(e) => setSelectedHotspot({ ...selectedHotspot, pos_x: parseFloat(e.target.value) })}
                      placeholder="X"
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-center"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={selectedHotspot.pos_y ?? 1.2}
                      onChange={(e) => setSelectedHotspot({ ...selectedHotspot, pos_y: parseFloat(e.target.value) })}
                      placeholder="Y"
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-center"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={selectedHotspot.pos_z ?? 0}
                      onChange={(e) => setSelectedHotspot({ ...selectedHotspot, pos_z: parseFloat(e.target.value) })}
                      placeholder="Z"
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-center"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-slate-400 font-semibold block">Target Camera Landing (X, Y, Z):</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={selectedHotspot.target_pos_x ?? 0}
                      onChange={(e) => setSelectedHotspot({ ...selectedHotspot, target_pos_x: parseFloat(e.target.value) })}
                      placeholder="Target X"
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-center"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={selectedHotspot.target_pos_y ?? 1.7}
                      onChange={(e) => setSelectedHotspot({ ...selectedHotspot, target_pos_y: parseFloat(e.target.value) })}
                      placeholder="Target Y"
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-center"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={selectedHotspot.target_pos_z ?? -2}
                      onChange={(e) => setSelectedHotspot({ ...selectedHotspot, target_pos_z: parseFloat(e.target.value) })}
                      placeholder="Target Z"
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Spatial Hotspot
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-sky-400" />
                    Hotspots ({hotspots.length})
                  </h3>
                </div>

                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {hotspots.map((hs) => (
                    <div
                      key={hs.id}
                      className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <h4 className="font-semibold text-white">{hs.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Pos: ({hs.pos_x}, {hs.pos_y}, {hs.pos_z})
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedHotspot(hs);
                            setIsEditing(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-sky-600/30 text-sky-400 border border-slate-800 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteHotspot(hs.id)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-slate-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
