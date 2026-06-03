"use client"

import { useState } from "react"
import { UploadCloud, Image as ImageIcon, Video, Send, Loader2, Sparkles, Settings2 } from "lucide-react"

export default function StudioPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState("")

  const handleGenerate = async () => {
    if (!prompt) return
    setIsGenerating(true)
    
    try {
      const res = await fetch("/api/studio/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, voiceId: "en-US-ChristopherNeural", pipelineId: "Premium Cinematic", images: [] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Dispatch failed")
      
      alert("ComfyUI JSON generated and dispatched to n8n orchestration tier.\\nJob ID: " + (data.jobId || data.result?.id || "N/A"))
    } catch (e: any) {
      alert("Error: " + e.message)
      console.error(e)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
      
      {/* Left Column: Canvas / Upload */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            New Cinematic Production
          </h1>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Workflow Settings
            </button>
          </div>
        </div>

        <div 
          className={`flex-1 min-h-[400px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
            isDragging ? 'border-cyan-500 bg-cyan-500/5 scale-[1.02]' : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
        >
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
            <UploadCloud className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Drop source material here</h3>
          <p className="text-sm text-white/50 text-center max-w-sm mb-8">
            Upload base images, company logos, or reference videos. OpenMontage will pass these to the ComfyUI nodes via R2 storage.
          </p>
          <div className="flex gap-4">
            <button className="px-6 py-2.5 rounded-xl bg-white/10 text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Add Image
            </button>
            <button className="px-6 py-2.5 rounded-xl bg-white/10 text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-2">
              <Video className="w-4 h-4" />
              Add Reference Video
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Orchestration Controls */}
      <div className="flex flex-col gap-6">
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col gap-6 shadow-2xl">
          
          <div>
            <h3 className="text-sm font-medium text-white/80 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Narrative Prompt
            </h3>
            <p className="text-xs text-white/40 mb-4">Dify will optimize this prompt before sending to ComfyUI.</p>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A sleek, executive cinematic presentation about real estate DX. Dark mode aesthetic..."
              className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all placeholder:text-white/20"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/60 mb-2 block">Voice & TTS (Edge-TTS)</label>
              <select className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm appearance-none focus:outline-none focus:border-cyan-500/50">
                <option>en-US-ChristopherNeural (Executive Male)</option>
                <option>en-US-JennyNeural (Professional Female)</option>
                <option>ja-JP-NanamiNeural (Japanese Female)</option>
                <option>ja-JP-KeitaNeural (Japanese Male)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-white/60 mb-2 block">ComfyUI Pipeline</label>
              <select className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm appearance-none focus:outline-none focus:border-cyan-500/50">
                <option>Premium Cinematic (Flux + SVD + LivePortrait)</option>
                <option>Fast B-Roll Generation (SVD Only)</option>
                <option>Executive Avatar Only (LivePortrait)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-6 border-t border-white/10">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(6,182,212,0.3)]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Orchestrating...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Generate via n8n
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-white/40 mt-4 uppercase tracking-widest font-medium">
              Powered by ComfyUI API & n8n
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}
