"use client";

import React, { useState } from "react";
import { Menu, X, Image as ImageIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setIsDialogOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("/api/generate-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "画像生成に失敗しました");
      }

      const data = await response.json();
      if (data.artifacts && data.artifacts[0]) {
        setGeneratedImage(`data:image/png;base64,${data.artifacts[0].base64}`);
      } else {
        throw new Error("生成された画像データが不正です");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-4">
              {selectedImage && (
                <div className="relative aspect-square w-full">
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Selected"
                    className="object-cover rounded-lg"
                  />
                </div>
              )}
              
              <Button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="w-full"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                画像をアップロード
              </Button>
            </div>

            <Button 
              type="submit" 
              disabled={!selectedImage || isLoading}
              className="w-full"
            >
              {isLoading ? "生成中..." : "画像を生成"}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {generatedImage && (
            <div className="mt-4">
              <img
                src={generatedImage}
                alt="Generated"
                className="max-w-md rounded-lg shadow-md"
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogTitle>画像をアップロード</DialogTitle>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="image">画像を選択</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            <Button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="w-full"
            >
              キャンセル
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}