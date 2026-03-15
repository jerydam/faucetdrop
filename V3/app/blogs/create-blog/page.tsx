"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Link2, PenLine, X, Plus,
  ImageIcon, User, ArrowLeft, CheckCircle2, Lock, RotateCcw
} from "lucide-react";
import { getSession, getAdmin, clearSession, API } from "../_lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
type Mode = "url" | "manual";
export default function CreateBlogPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [mode, setMode] = useState<Mode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const admin = getAdmin();
  const initialFormState = {
    title: "", content: "", excerpt: "",
    coverImageUrl: "", tags: [] as string[],
    authorName: admin?.displayName || "",
    authorAvatar: admin?.avatarUrl || "",
    authorHandle: "", sourceUrl: "",
  };
  const [form, setForm] = useState(initialFormState);
  useEffect(() => {
    const token = getSession();
    if (!token) { router.replace("/blogs/login"); return; }
    fetch(`${API}/api/blog/me?sessionToken=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setAuthed(true);
        else { clearSession(); router.replace("/blogs/login"); }
      })
      .catch(() => { clearSession(); router.replace("/blogs/login"); })
      .finally(() => setChecking(false));
  }, [router]);
  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
  const addTag = () => {
    const newTags = tagInput
      .split(",")
      .map(t => t.trim().replace(/^#/, ""))
      .filter(t => t.length > 0);
    if (newTags.length > 0) {
      const uniqueTags = Array.from(new Set([...form.tags, ...newTags])).slice(0, 8);
      set("tags", uniqueTags);
      setTagInput("");
    }
  };
  const removeTag = (tag: string) => set("tags", form.tags.filter(t => t !== tag));
  const handleClear = () => {
    setForm(initialFormState);
    setUrlInput("");
    setExtracted(false);
  };
  const handleExtract = async () => {
    const token = getSession();
    if (!token) { router.replace("/blogs/login"); return; }
    if (!urlInput.trim()) { toast.error("Enter a URL first"); return; }
    setExtracting(true);
    setExtracted(false);
    try {
      const res = await fetch(`${API}/api/blog/extract-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim(), sessionToken: token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || "Extraction failed");
      setForm(prev => ({ ...prev, ...data.data }));
      setExtracted(true);
      toast.success("Extracted! Review and edit before publishing.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to extract");
    } finally {
      setExtracting(false);
    }
  };
  const handleSubmit = async () => {
    const token = getSession();
    if (!token) { router.replace("/blogs/login"); return; }
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.content.trim()) { toast.error("Content is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/blog/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sessionToken: token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || "Failed to publish");
      toast.success("Post published!");
      router.push(`/blogs/${data.slug}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setSubmitting(false);
    }
  };
  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all";
  const labelClass = "block text-sm font-bold text-white/70 mb-1.5";
  if (checking) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
    </div>
  );
  if (!authed) return null;
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 pb-20">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/blogs/admin")}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-black text-white">New Post</h1>
              <p className="text-white/40 text-xs">Import from URL or write manually</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{admin?.displayName || "Admin"}</span>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex gap-1">
          {(["url", "manual"] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                mode === m
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {m === "url"
                ? <><Link2 className="h-4 w-4" />Import from URL</>
                : <><PenLine className="h-4 w-4" />Write Manually</>
              }
            </button>
          ))}
        </div>
        {/* URL section */}
        {mode === "url" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
            <h2 className="font-black text-white flex items-center gap-2">
              <Link2 className="h-4 w-4 text-indigo-400" /> Import from URL
            </h2>
            <p className="text-white/40 text-sm">
              Paste any article or X/Twitter link &mdash; we&apos;ll extract the title, content, images, and author automatically.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleExtract(); }}
                placeholder="https://example.com/article..."
                className={cn(inputClass, "flex-1")}
              />
              <button
                onClick={handleExtract}
                disabled={extracting || !urlInput.trim()}
                className="shrink-0 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Extract"}
              </button>
            </div>
            {extracted && (
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Extracted &mdash; review and edit before publishing
              </div>
            )}
          </div>
        )}
        {/* Form */}
        {(mode === "manual" || extracted) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-black text-white flex items-center gap-2">
                <PenLine className="h-4 w-4 text-indigo-400" />
                {mode === "url" ? "Review & Edit" : "Post Details"}
              </h2>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Clear Form
              </button>
            </div>
            <div>
              <label className={labelClass}>Title *</label>
              <input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Post title..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Excerpt</label>
              <textarea value={form.excerpt} onChange={e => set("excerpt", e.target.value)} placeholder="Short summary shown in listings..." rows={2} className={cn(inputClass, "resize-none")} />
            </div>
            <div>
              <div className="flex items-end justify-between mb-1.5">
                <label className="block text-sm font-bold text-white/70">Content *</label>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-white/10 text-white/50">Markdown Supported</span>
              </div>
              <textarea value={form.content} onChange={e => set("content", e.target.value)} placeholder="Full post content..." rows={12} className={cn(inputClass, "resize-y font-mono text-xs")} />
              <p className="text-white/30 text-xs mt-1">
                {form.content.length} chars &bull; ~{Math.max(1, Math.ceil(form.content.split(/\s+/).length / 200))} min read
              </p>
            </div>
            <div>
              <label className={labelClass}><ImageIcon className="inline h-3.5 w-3.5 mr-1" />Cover Image URL</label>
              <input type="url" value={form.coverImageUrl} onChange={e => set("coverImageUrl", e.target.value)} placeholder="https://..." className={inputClass} />
              {form.coverImageUrl && (
                <div className="mt-2 aspect-video w-full max-w-xs rounded-xl overflow-hidden border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.coverImageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => set("coverImageUrl", "")}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}><User className="inline h-3.5 w-3.5 mr-1" />Author Name</label>
                <input type="text" value={form.authorName} onChange={e => set("authorName", e.target.value)} placeholder={admin?.displayName || "Author..."} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Author Handle</label>
                <input type="text" value={form.authorHandle} onChange={e => set("authorHandle", e.target.value)} placeholder="@handle" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Author Avatar URL</label>
              <input type="url" value={form.authorAvatar} onChange={e => set("authorAvatar", e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
            {mode === "url" && (
              <div>
                <label className={labelClass}>Source URL</label>
                <input type="url" value={form.sourceUrl} onChange={e => set("sourceUrl", e.target.value)} className={inputClass} />
              </div>
            )}
            <div>
              <label className={labelClass}>Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Type a tag or comma-separated list..."
                  className={cn(inputClass, "flex-1")}
                />
                <button
                  onClick={addTag}
                  className="h-11 px-4 shrink-0 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-3 py-1 text-xs font-bold">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-indigo-400/60 hover:text-indigo-300">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Submit */}
        {(mode === "manual" || extracted) && (
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/blogs/admin")}
              className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-bold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.title.trim() || !form.content.trim()}
              className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing...</>
                : "Publish Post"
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}