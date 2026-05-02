"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Users, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { SpinWheel, getColor } from "@/components/SpinWheel";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://xeric-gwendolen-faucetdrops-4f72016d.koyeb.app";

export default function CreateRoomPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [roomDesc, setRoomDesc] = useState("");
  const [namesInput, setNamesInput] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedNames = useMemo(() => {
    return namesInput.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  }, [namesInput]);

  const handleCreate = async () => {
    if (!roomName.trim()) { toast.error("Room name is required"); return; }
    if (parsedNames.length < 2) { toast.error("Add at least 2 participants"); return; }
    
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/spinners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName.trim(),
          description: roomDesc.trim(),
          participants: parsedNames
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Room created!");
        router.push(`/spinner/${data.slug}`);
      } else {
        toast.error(data.detail || "Failed to create room");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pt-10 pb-20">
      <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="text-slate-300 hover:text-white hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Create Unique Spinner</h1>
            <p className="text-sm text-slate-400">Set up your wheel and add initial participants</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-white">Room Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Room Name <span className="text-pink-500">*</span></Label>
                  <Input className="bg-slate-950 border-slate-700 text-white" placeholder="e.g. FaucetDrops Weekly" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Description <span className="text-slate-500 text-xs">(optional)</span></Label>
                  <Input className="bg-slate-950 border-slate-700 text-white" placeholder="What's this spin for?" value={roomDesc} onChange={(e) => setRoomDesc(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-white">Initial Participants</CardTitle>
                <CardDescription className="text-slate-400">You can upload bulk files later inside the room.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={"Alice\nBob\nCarol"}
                  value={namesInput}
                  onChange={(e) => setNamesInput(e.target.value)}
                  className="min-h-[120px] font-mono text-sm resize-none bg-slate-950 border-slate-700 text-white"
                />
              </CardContent>
            </Card>

            <Button
              className="w-full font-bold h-12 text-base bg-gradient-to-r from-yellow-400 to-pink-500 text-slate-950 hover:opacity-90 shadow-[0_0_15px_rgba(255,95,160,0.3)]"
              onClick={handleCreate}
              disabled={!roomName.trim() || parsedNames.length < 2 || loading}
            >
              {loading ? "Creating..." : <><Sparkles className="mr-2 h-5 w-5" /> Generate Unique Room</>}
            </Button>
          </div>

          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <CardHeader className="pb-2 bg-slate-800/50 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-400 font-medium">Live Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex items-center justify-center bg-slate-950">
                {parsedNames.length >= 2 ? (
                  <SpinWheel names={parsedNames} spinning={false} rotation={0} />
                ) : (
                  <div className="text-center text-slate-500 py-16">
                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-10 w-10 text-slate-600" />
                    </div>
                    <p className="text-sm">Add 2+ names to preview</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}