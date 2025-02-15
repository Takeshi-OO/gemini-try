"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "../../lib/utils";

interface ChatMessageProps {
  message: {
    type: string;
    content: string | string[];
    images?: string[];
    imageTypes?: ("material" | "request")[];
  };
  onTemplateSelect?: (template: string) => void;
  onImageClick?: (image: string) => void;
}

export function ChatMessage({ message, onTemplateSelect, onImageClick }: ChatMessageProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleTemplateClick = (template: string) => {
    setSelectedTemplate(template);
    onTemplateSelect?.(template);
  };

  return (
    <div
      className={cn(
        "flex w-full",
        message.type === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[80%] space-y-2",
          message.type === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {typeof message.content === "string" ? (
          <p>{message.content}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {message.content.map((item, index) => (
              <button
                key={index}
                onClick={() => handleTemplateClick(item)}
                className={cn(
                  "p-2 rounded border text-left hover:bg-accent",
                  selectedTemplate === item && "bg-accent"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {message.images && message.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {message.images.map((image, index) => (
              <div
                key={index}
                className="relative cursor-pointer"
                onClick={() => onImageClick?.(image)}
              >
                <Image
                  src={image}
                  alt={`Image ${index + 1}`}
                  width={200}
                  height={150}
                  className="rounded-md"
                  unoptimized
                />
                {message.imageTypes && message.imageTypes[index] && (
                  <span className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-md">
                    {message.imageTypes[index] === "material" ? "素材" : "要望参考"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
