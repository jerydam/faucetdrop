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
  const webCanvasRef = useRef<HTMLCanvasElement>(null);
  const farcasterCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [webCopied, setWebCopied] = useState(false);
  const [farcasterCopied, setFarcasterCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"web" | "farcaster">("web");

  // Generate URLs
  const webUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/faucet/${faucetAddress}`
    : "";
  
  const farcasterUrl = `https://farcaster.xyz/miniapps/x8wlGgdqylmp/faucetdrops?startapp/faucet=${faucetAddress}`;

  // Function to generate Web QR Code
  const generateWebQR = () => {
    if (webCanvasRef.current && webUrl) {
      QRCode.toCanvas(
        webCanvasRef.current,
        webUrl,
        {
          width: 280,
          margin: 2,
          color: {
            dark: "#2563eb", // Blue
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
        },
        (error) => {
          if (error) {
            console.error("Web QR Code generation error:", error);
          } else {
            console.log("Web QR Code generated successfully");
          }
        }
      );
    }
  };

  // Function to generate Farcaster QR Code
  const generateFarcasterQR = () => {
    if (farcasterCanvasRef.current && farcasterUrl) {
      QRCode.toCanvas(
        farcasterCanvasRef.current,
        farcasterUrl,
        {
          width: 280,
          margin: 2,
          color: {
            dark: "#7c3aed", // Purple/Violet
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
        },
        (error) => {
          if (error) {
            console.error("Farcaster QR Code generation error:", error);
          } else {
            console.log("Farcaster QR Code generated successfully");
          }
        }
      );
    }
  };

  // Generate QR Code when dialog opens
  useEffect(() => {
    if (open && webUrl) {
      // Generate both QR codes when dialog opens
      const timer = setTimeout(() => {
        generateWebQR();
        generateFarcasterQR();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [open, webUrl, farcasterUrl]);

  // Regenerate QR Code when switching tabs (as backup)
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (activeTab === "web") {
          generateWebQR();
        } else {
          generateFarcasterQR();
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [activeTab, open]);

  // Copy URL to clipboard
  const handleCopyUrl = async (type: "web" | "farcaster") => {
    const url = type === "web" ? webUrl : farcasterUrl;
    
    try {
      await navigator.clipboard.writeText(url);
      
      if (type === "web") {
        setWebCopied(true);
        setTimeout(() => setWebCopied(false), 2000);
      } else {
        setFarcasterCopied(true);
        setTimeout(() => setFarcasterCopied(false), 2000);
      }
      
      toast.success(`${type === "web" ? "Web" : "Farcaster"} link copied to clipboard`);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  // Download QR Code as PNG
  const handleDownloadQR = (type: "web" | "farcaster") => {
    const canvas = type === "web" ? webCanvasRef.current : farcasterCanvasRef.current;
    
    if (!canvas) {
      toast.error("QR Code not ready");
      return;
    }

    try {
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          return;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const filename = `${faucetName.replace(/\s+/g, "-")}-${type}-qr-code.png`;
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`QR Code downloaded as ${filename}`);
      }, "image/png");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download QR Code");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[450px] p-3 sm:p-6 gap-3 sm:gap-4 max-h-[95vh] bg-[#030712]/95 backdrop-blur-md border border-white/10">
        <DialogHeader className="space-y-1 sm:space-y-2">
          <DialogTitle className="text-sm sm:text-lg flex items-center gap-2 text-white/90">
            <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            Share Faucet
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-400">
            Share your faucet via QR code or link
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "web" | "farcaster")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 sm:h-10 bg-white/5 border border-white/10">
            <TabsTrigger value="web" className="gap-1 sm:gap-2 text-[10px] sm:text-sm py-1.5 sm:py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
              <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-blue-600"></div>
              <span>Web</span>
            </TabsTrigger>
            <TabsTrigger value="farcaster" className="gap-1 sm:gap-2 text-[10px] sm:text-sm py-1.5 sm:py-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400">
              <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-purple-600"></div>
              <span>Farcaster</span>
            </TabsTrigger>
          </TabsList>

          {/* Web Link Tab */}
          <TabsContent value="web" className="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
            <Card className="border border-white/10 bg-transparent">
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  {/* QR Code */}
                  <div className="p-2 sm:p-3 bg-white rounded-lg shadow-sm border-2 border-blue-500/30 w-full max-w-[200px] sm:max-w-[250px]">
                    <canvas
                      ref={webCanvasRef}
                      width={280}
                      height={280}
                      className="w-full h-auto"
                      style={{ display: 'block', maxWidth: '100%' }}
                    />
                  </div>

                 

                  {/* Action Buttons */}
                  <div className="flex flex-row gap-1.5 sm:gap-2 w-full">
                    <Button
                      onClick={() => handleCopyUrl("web")}
                      variant="outline"
                      className="flex-1 gap-1 text-[10px] sm:text-xs h-8 sm:h-9 px-2 bg-transparent border-white/10 hover:border-blue-500 hover:bg-blue-500/10 text-gray-300 hover:text-white"
                      disabled={webCopied}
                    >
                      {webCopied ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span className="hidden xs:inline">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="hidden xs:inline">Copy</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleDownloadQR("web")}
                      className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs h-8 sm:h-9 px-2"
                    >
                      <Download className="h-3 w-3" />
                      <span className="hidden xs:inline">Download</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Farcaster Link Tab */}
          <TabsContent value="farcaster" className="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
            <Card className="border border-white/10 bg-transparent">
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  {/* QR Code */}
                  <div className="p-2 sm:p-3 bg-white rounded-lg shadow-sm border-2 border-purple-500/30 w-full max-w-[200px] sm:max-w-[250px]">
                    <canvas
                      ref={farcasterCanvasRef}
                      width={280}
                      height={280}
                      className="w-full h-auto"
                      style={{ display: 'block', maxWidth: '100%' }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-row gap-1.5 sm:gap-2 w-full">
                    <Button
                      onClick={() => handleCopyUrl("farcaster")}
                      variant="outline"
                      className="flex-1 gap-1 text-[10px] sm:text-xs h-8 sm:h-9 px-2 bg-transparent border-white/10 hover:border-purple-500 hover:bg-purple-500/10 text-gray-300 hover:text-white"
                      disabled={farcasterCopied}
                    >
                      {farcasterCopied ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span className="hidden xs:inline">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="hidden xs:inline">Copy</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleDownloadQR("farcaster")}
                      className="flex-1 gap-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] sm:text-xs h-8 sm:h-9 px-2"
                    >
                      <Download className="h-3 w-3" />
                      <span className="hidden xs:inline">Download</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

       
      </DialogContent>
    </Dialog>
  );
}