"use client"

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Download, Link as LinkIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes"; // Import theme hook

interface QRCodeShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faucetAddress: string;
  faucetName?: string;
}

export function QRCodeShareDialog({
  open,
  onOpenChange,
  faucetAddress,
  faucetName = "Faucet",
}: QRCodeShareDialogProps) {
  const { theme, resolvedTheme } = useTheme(); // Detect current theme
  const webCanvasRef = useRef<HTMLCanvasElement>(null);
  const farcasterCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [webCopied, setWebCopied] = useState(false);
  const [farcasterCopied, setFarcasterCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"web" | "farcaster">("web");

  // Determine QR colors based on theme
  const isDark = resolvedTheme === "dark";
  const qrColors = {
    web: {
      dark: isDark ? "#3b82f6" : "#2563eb", // Lighter blue for dark mode
      light: isDark ? "#00000000" : "#ffffff", // Transparent bg in dark mode
    },
    farcaster: {
      dark: isDark ? "#a78bfa" : "#7c3aed", // Lighter purple for dark mode
      light: isDark ? "#00000000" : "#ffffff",
    }
  };

  const webUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/faucet/${faucetAddress}`
    : "";
  
  const farcasterUrl = `https://farcaster.xyz/miniapps/x8wlGgdqylmp/faucetdrops?startapp/faucet=${faucetAddress}`;

  const generateWebQR = () => {
    if (webCanvasRef.current && webUrl) {
      QRCode.toCanvas(
        webCanvasRef.current,
        webUrl,
        {
          width: 280,
          margin: 2,
          color: qrColors.web,
          errorCorrectionLevel: "H",
        },
        (error) => {
          if (error) console.error("Web QR Code error:", error);
        }
      );
    }
  };

  const generateFarcasterQR = () => {
    if (farcasterCanvasRef.current && farcasterUrl) {
      QRCode.toCanvas(
        farcasterCanvasRef.current,
        farcasterUrl,
        {
          width: 280,
          margin: 2,
          color: qrColors.farcaster,
          errorCorrectionLevel: "H",
        },
        (error) => {
          if (error) console.error("Farcaster QR Code error:", error);
        }
      );
    }
  };

  // Regenerate when open, when tab changes, or when theme changes
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        generateWebQR();
        generateFarcasterQR();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open, webUrl, farcasterUrl, resolvedTheme, activeTab]);

  const handleCopyUrl = async (type: "web" | "farcaster") => {
    const url = type === "web" ? webUrl : farcasterUrl;
    try {
      await navigator.clipboard.writeText(url);
      type === "web" ? setWebCopied(true) : setFarcasterCopied(true);
      setTimeout(() => {
        setWebCopied(false);
        setFarcasterCopied(false);
      }, 2000);
      toast.success(`${type === "web" ? "Web" : "Farcaster"} link copied`);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQR = (type: "web" | "farcaster") => {
    const canvas = type === "web" ? webCanvasRef.current : farcasterCanvasRef.current;
    if (!canvas) return;

    // To ensure the download is visible even if the UI used transparent bg, 
    // we temporarily draw on a white background for the file
    const downloadCanvas = document.createElement("canvas");
    downloadCanvas.width = canvas.width;
    downloadCanvas.height = canvas.height;
    const ctx = downloadCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
      ctx.drawImage(canvas, 0, 0);
      
      const link = document.createElement("a");
      link.download = `${faucetName}-${type}-qr.png`;
      link.href = downloadCanvas.toDataURL("image/png");
      link.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* SYSTEM THEME: Changed bg and border to semantic classes */}
      <DialogContent className="w-[90vw] max-w-[450px] p-3 sm:p-6 gap-3 sm:gap-4 max-h-[95vh] bg-background backdrop-blur-md border border-border shadow-2xl">
        <DialogHeader className="space-y-1 sm:space-y-2">
          <DialogTitle className="text-sm sm:text-lg flex items-center gap-2 text-foreground">
            <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Share Faucet
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Share your faucet via QR code or link
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "web" | "farcaster")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 sm:h-10 bg-muted border border-border">
            <TabsTrigger value="web" className="gap-1 sm:gap-2 text-[10px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-blue-500"></div>
              <span>Web</span>
            </TabsTrigger>
            <TabsTrigger value="farcaster" className="gap-1 sm:gap-2 text-[10px] sm:text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-purple-500"></div>
              <span>Farcaster</span>
            </TabsTrigger>
          </TabsList>

          {["web", "farcaster"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
              <Card className="border border-border bg-card shadow-inner">
                <CardContent className="p-4 flex flex-col items-center space-y-4">
                  {/* QR Code Container: Background logic for contrast */}
                  <div className="p-3 bg-white rounded-xl shadow-md border-2 border-primary/20">
                    <canvas
                      ref={tab === "web" ? webCanvasRef : farcasterCanvasRef}
                      className="w-full max-w-[200px] sm:max-w-[240px] aspect-square"
                    />
                  </div>

                  <div className="flex flex-row gap-2 w-full">
                    <Button
                      onClick={() => handleCopyUrl(tab as any)}
                      variant="outline"
                      className="flex-1 gap-2 text-xs h-9 border-border hover:bg-accent"
                    >
                      { (tab === "web" ? webCopied : farcasterCopied) ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" /> }
                      Copy Link
                    </Button>
                    <Button
                      onClick={() => handleDownloadQR(tab as any)}
                      className={`flex-1 gap-2 text-xs h-9 ${tab === 'web' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                    >
                      <Download className="h-4 w-4" />
                      PNG
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}