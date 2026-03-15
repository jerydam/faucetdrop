"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, Heart, Eye, ArrowLeft,
  ExternalLink, Calendar, Share2, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrowserFingerprint, API } from "../_lib/auth";
import { toast } from "sonner";
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image_url: string;
  tags: string[];
  author_name: string;
  author_avatar: string;
  author_handle: string;
  source_url: string;
  published_at: string;
  likes_count: number;
  views_count: number;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });
}
function formatReadTime(content: string) {
  const words = content.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}
function renderContent(content: string) {
  return content.split("\n\n").map((para, i) => {
    if (!para.trim()) return null;
    return (
      <p key={i} className="text-white/70 text-base sm:text-lg leading-relaxed">
        {para.trim()}
      </p>
    );
  });
}
export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug ?? "";
  const [avatarError, setAvatarError] = useState(false);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API}/api/blog/posts/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPost(d.post);
          setLikesCount(d.post.likes_count);
          const likedSlugs: string[] = JSON.parse(localStorage.getItem("blog_liked") || "[]");
          setLiked(likedSlugs.includes(slug));
        } else setError(d.detail || "Post not found");
      })
      .catch(() => setError("Failed to load post"))
      .finally(() => setLoading(false));
  }, [slug]);
  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const fp = getBrowserFingerprint();
    try {
      const res = await fetch(`${API}/api/blog/posts/${slug}/like?fingerprint=${fp}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLiked(data.liked);
        setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
        const likedSlugs: string[] = JSON.parse(localStorage.getItem("blog_liked") || "[]");
        const updated = data.liked ? [...likedSlugs, slug] : likedSlugs.filter(s => s !== slug);
        localStorage.setItem("blog_liked", JSON.stringify(updated));
      }
    } catch { toast.error("Failed to like"); }
    finally { setLiking(false); }
  };
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
    </div>
  );
  if (error || !post) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="text-5xl mb-4">📰</div>
      <h2 className="text-xl font-black text-white mb-2">Post not found</h2>
      <p className="text-white/50 text-sm mb-6">{error}</p>
      <button
        onClick={() => router.push("/blogs")}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/15 transition-all"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </button>
    </div>
  );
  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-1.5 text-sm text-white/40 flex-wrap">
          <button onClick={() => router.push("/")} className="hover:text-white transition-colors font-medium">Home</button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <button onClick={() => router.push("/blogs")} className="hover:text-white transition-colors font-medium">Blog</button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-white/70 font-bold truncate max-w-50 sm:max-w-xs">{post.title}</span>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-20">
        <article className="space-y-6">
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => router.push(`/blogs?tag=${tag}`)}
                  className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold hover:bg-indigo-500/30 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            {post.title}
          </h1>
          {/* Author + meta row */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-indigo-500/30 border-2 border-indigo-500/40 overflow-hidden flex items-center justify-center shrink-0">
                {post.author_avatar && !avatarError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.author_avatar}
                    alt={post.author_name}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className="font-bold text-indigo-300">
                    {post.author_name?.slice(0, 2).toUpperCase() || "FD"}
                  </span>
                )}
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  {post.author_name || "FaucetDrops Team"}
                  {post.author_handle && (
                    <span className="text-white/40 font-normal ml-1.5">@{post.author_handle}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 text-white/40 text-xs flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(post.published_at)}</span>
                  <span>•</span>
                  <span>{formatReadTime(post.content)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views_count}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.source_url && (
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Source
                </a>
              )}
              <button
                onClick={handleLike}
                disabled={liking}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                  liked
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-white/5 border-white/10 text-white/50 hover:border-red-500/40 hover:text-red-400"
                )}
              >
                <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
                {likesCount}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80 transition-all"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
          {/* Cover image */}
          {post.cover_image_url && (
            <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}
          {/* Excerpt callout */}
          {post.excerpt && (
            <div className="bg-indigo-500/10 border-l-4 border-indigo-500 rounded-r-2xl px-5 py-4">
              <p className="text-indigo-200 text-base font-medium italic leading-relaxed">
                {post.excerpt}
              </p>
            </div>
          )}
          {/* Body */}
          <div className="space-y-5">
            {renderContent(post.content)}
          </div>
          {/* Bottom actions */}
          <div className="pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={handleLike}
              disabled={liking}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm border transition-all active:scale-95",
                liked
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-white/5 border-white/10 text-white/60 hover:border-red-500/40 hover:text-red-400"
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              {liked ? "Liked" : "Like"} ({likesCount})
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm border border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white transition-all"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => router.push("/blogs")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
              >
                More Posts
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}