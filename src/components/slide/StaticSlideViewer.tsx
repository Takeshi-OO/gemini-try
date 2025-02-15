import React, { useEffect, useState, useRef } from "react";
import { Slide } from "../../types/slide";
import { Shape } from "../../types/shape";
import { ShapeRenderer } from "./ShapeRenderer";
import { fixRotatedImages } from "./utils/slideUtils";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  useDraggable
} from "@dnd-kit/core";
import Draggable from "react-draggable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface SlideViewerProps {
  initialSlides?: Slide[];
  projectDir?: string;
  commitId?: string;
  templateId?: string;
  resourcesDir?: string;
  onSlideUpdate?: (updatedSlide: Slide) => void;
}

// スライドを画像として保存する関数
async function captureAndSaveSlide(slideElement: HTMLDivElement, projectDir: string, versionDir: string, slideIndex: number) {
  try {
    const canvas = await html2canvas(slideElement, {
      backgroundColor: "#ffffff",
      scale: 2, // 高品質な画像のために2倍のスケールで描画
    });

    // Canvas を Blob に変換
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob as Blob);
      }, "image/png");
    });

    const slideId = `slide${slideIndex}`;

    // Blob を FormData に追加
    const formData = new FormData();
    formData.append("image", blob, `${slideId}.png`);
    formData.append("projectDir", projectDir);
    formData.append("versionDir", versionDir);
    formData.append("slideId", slideId);

    // APIエンドポイントに送信
    const response = await fetch("/api/save-slide-image", {
      method: "POST",
      body: formData,
    });

    await response.json();

  } catch (error) {
    console.error(`Error saving slide ${slideIndex}:`, error);
  }
}

// スライド情報を読み込む関数を追加
async function loadSlideData(projectDir: string, slideId: string, version: string): Promise<Slide> {
  const response = await fetch(`/projects/${projectDir}/slides/${slideId}/${version}/${slideId}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load slide data for ${slideId}`);
  }
  const data = await response.json();
  return data as Slide;
}

// バージョン情報を取得する関数
async function getSlideVersion(projectDir: string, commitId: string | undefined, slideId: string): Promise<string | null> {
  try {
    // commits.jsonを読み込む
    const commitsResponse = await fetch(`/projects/${projectDir}/commits.json`);
    const commits = await commitsResponse.json();
    
    // states.jsonを読み込む
    const statesResponse = await fetch(`/projects/${projectDir}/states.json`);
    const states = await statesResponse.json();

    let targetCommit;
    if (commitId) {
      // 指定されたcommitIdのコミットを探す
      targetCommit = commits.find((c: any) => c.id === commitId);
    } else {
      // commitIdが指定されていない場合は最新のコミットを使用
      targetCommit = commits[commits.length - 1];
    }
    
    if (!targetCommit) {
      return null;
    }

    // 対応するstateを探す
    const currentState = states.find((s: any) => s.id === targetCommit.stateId);

    if (!currentState) {
      return null;
    }

    // スライドのバージョンを取得
    const version = currentState.slides[slideId];

    if (!version) {
      return null;
    }

    return version;
  } catch (error) {
    console.error(`Error getting slide version:`, error);
    return null;
  }
}

// DraggableShapeコンポーネントを更新
function DraggableShape({ 
  shape, 
  projectDir, 
  resourcesDir, 
  templateId,
  onTextChange,
  onImageChange,
  onSelect,
  scale
}: {
  shape: Shape;
  projectDir?: string;
  resourcesDir?: string;
  templateId?: string;
  onTextChange: (id: number, text: string) => void;
  onImageChange: (id: number) => void;
  onSelect: (shape: Shape) => void;
  scale: number;
}) {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: shape.id.toString(),
  });

  const style: React.CSSProperties = {
    width: shape.width,
    height: shape.height,
    left: shape.left,
    top: shape.top,
    position: 'absolute',
    zIndex: transform ? 1000 : shape.zOrder,
    touchAction: 'none',
    userSelect: 'none',
  };

  if (transform) {
    style.transform = `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`;
  }

  // グループ内の要素をレンダリングする関数
  const renderGroupItems = (items: Shape[]) => {
    return items.map(item => {
      // グループ内の要素の位置は親要素からの相対位置として計算
      const relativeItem = {
        ...item,
        left: item.left - shape.left,
        top: item.top - shape.top
      };
      
      return (
        <DraggableShape
          key={item.id}
          shape={relativeItem}
          projectDir={projectDir}
          resourcesDir={resourcesDir}
          templateId={templateId}
          onTextChange={onTextChange}
          onImageChange={onImageChange}
          onSelect={onSelect}
          scale={scale}
        />
      );
    });
  };
  
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="absolute cursor-move"
      style={style}
      onClick={() => onSelect(shape)}
    >
      {shape.type === 'TextBox' ? (
        <div className="relative w-full h-full">
          <ShapeRenderer
            shape={{
              ...shape,
              left: 0,
              top: 0
            }}
            projectDir={projectDir}
            resourcesDir={resourcesDir}
            templateId={templateId}
          />
          <textarea
            value={shape.text || ''}
            onChange={(e) => onTextChange(shape.id, e.target.value)}
            className="absolute inset-0 bg-transparent resize-none cursor-text z-10"
            style={{
              font: shape.font ? `${shape.font.size}px ${shape.font.name}` : 'inherit',
              color: 'transparent',
              caretColor: 'black'
            }}
          />
        </div>
      ) : shape.groupItems ? (
        // グループの場合は、グループ内の要素のみをレンダリング
        renderGroupItems(shape.groupItems)
      ) : (
        <>
          <ShapeRenderer
            shape={{
              ...shape,
              left: 0,
              top: 0
            }}
            projectDir={projectDir}
            resourcesDir={resourcesDir}
            templateId={templateId}
          />
          {(shape.type === 'Image' || shape.type === 'Placeholder') && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white z-10"
              onClick={() => onImageChange(shape.id)}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// 既存の画像を選択するためのダイアログコンポーネントを追加
interface ResourceSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (resource: { url: string; fileName: string }) => void;
  projectDir?: string;
}

function ResourceSelectionDialog({
  open,
  onOpenChange,
  onSelect,
  projectDir
}: ResourceSelectionDialogProps) {
  const [resources, setResources] = useState<{ url: string; fileName: string }[]>([]);

  useEffect(() => {
    if (open && projectDir) {
      fetch(`/api/getProjectResources?projectDir=${projectDir}`)
        .then(res => res.json())
        .then(data => setResources(data.resources))
        .catch(console.error);
    }
  }, [open, projectDir]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>アップロード済み写真から選択</DialogTitle>
        <div className="grid grid-cols-3 gap-4 p-4">
          {resources.map((resource, index) => (
            <button
              key={index}
              onClick={() => onSelect(resource)}
              className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
            >
              <img
                src={resource.url}
                alt={resource.fileName}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('image', file);
                formData.append('projectDir', projectDir || '');
                
                try {
                  const response = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData,
                  });
                  
                  if (!response.ok) {
                    throw new Error('画像のアップロードに失敗しました');
                  }
                  
                  const { fileName } = await response.json();
                  onSelect({
                    url: `/projects/${projectDir}/resources/${fileName}`,
                    fileName
                  });
                } catch (error) {
                  console.error('画像のアップロードに失敗しました:', error);
                }
                onOpenChange(false);
              };
              input.click();
            }}
          >
            新しい写真をアップロード
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SlideItem({ 
  slide, 
  projectDir, 
  versionDir, 
  resourcesDir, 
  templateId,
  onSlideUpdate,
  isEditing,
  onEditStart,
  onDeselect
}: { 
  slide: Slide, 
  projectDir?: string,
  versionDir?: string,
  resourcesDir?: string,
  templateId?: string,
  onSlideUpdate?: (updatedSlide: Slide) => void;
  isEditing: boolean;
  onEditStart: () => void;
  onDeselect: () => void;
}) {
  const [scale, setScale] = useState(1);
  const slideRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [slideVersion, setSlideVersion] = useState<string | null>(null);
  const [editingSlide, setEditingSlide] = useState<Slide>({ ...slide });
  const [selectedShape, setSelectedShape] = useState<Shape | null>(null);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null);

  // DnD関連のフックをトップレベルに移動
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  // slideプロパティが変更された時にeditingSlideを更新
  useEffect(() => {
    setEditingSlide(JSON.parse(JSON.stringify(slide)));
  }, [slide]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active) return;

    const newSlide = { ...editingSlide };
    
    // 再帰的にシェイプを更新する関数
    const updateShapePosition = (shapes: Shape[]): Shape[] => {
      return shapes.map(s => {
        if (s.id.toString() === active.id) {
          // スケールを考慮した移動量を計算
          const scaledDeltaX = delta.x / scale;
          const scaledDeltaY = delta.y / scale;
          
          return {
            ...s,
            left: s.left + scaledDeltaX,
            top: s.top + scaledDeltaY,
            // グループ内の要素の位置も更新
            groupItems: s.groupItems?.map(item => ({
              ...item,
              left: item.left + scaledDeltaX,
              top: item.top + scaledDeltaY
            }))
          };
        }
        
        // グループ内の要素を検索
        if (s.groupItems) {
          const updatedGroupItems = s.groupItems.map(item => {
            if (item.id.toString() === active.id) {
              const scaledDeltaX = delta.x / scale;
              const scaledDeltaY = delta.y / scale;
              
              return {
                ...item,
                left: item.left + scaledDeltaX,
                top: item.top + scaledDeltaY
              };
            }
            return item;
          });
          
          return {
            ...s,
            groupItems: updatedGroupItems
          };
        }
        
        return s;
      });
    };

    newSlide.shapes = updateShapePosition(newSlide.shapes || []);
    setEditingSlide(newSlide);
    if (onSlideUpdate) {
      onSlideUpdate(newSlide);
    }
  };

  // コミットIDからバージョンを取得
  useEffect(() => {
    const fetchVersion = async () => {
      if (projectDir && slide.slideIndex !== undefined) {
        const slideId = `slide${slide.slideIndex}`;
        const version = slide.version || await getSlideVersion(projectDir, versionDir, slideId);
        if (version) {
          setSlideVersion(version);
        }
      }
    };

    fetchVersion();
  }, [projectDir, versionDir, slide.slideIndex, slide.version]);

  // スライドが表示された後に画像として保存
  useEffect(() => {
    if (slideRef.current && projectDir && slideVersion && slide.slideIndex !== undefined) {
      captureAndSaveSlide(slideRef.current, projectDir, slideVersion, slide.slideIndex);
    }
  }, [slide, projectDir, slideVersion]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || !slide.width) return;
      const containerWidth = containerRef.current.clientWidth;
      const padding = 40;
      const maxWidth = containerWidth - padding;
      const newScale = Math.min(1, maxWidth / slide.width);
      setScale(newScale);
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [slide.width]);

  const handleTextChange = (shapeId: number, newText: string) => {
    const newSlide = { ...editingSlide };
    const updateShapeText = (shapes: Shape[]): Shape[] => {
      return shapes.map(shape => {
        if (shape.id === shapeId) {
          return { ...shape, text: newText };
        }
        if (shape.groupItems) {
          return { ...shape, groupItems: updateShapeText(shape.groupItems) };
        }
        return shape;
      });
    };
    newSlide.shapes = updateShapeText(newSlide.shapes || []);
    setEditingSlide(newSlide);
    if (onSlideUpdate) {
      onSlideUpdate(newSlide);
    }
  };

  const handleImageChange = async (shapeId: number) => {
    setSelectedShapeId(shapeId);
    setShowResourceDialog(true);
  };

  const handleResourceSelect = async (resource: { fileName: string }) => {
    if (!selectedShapeId) return;

    const newSlide = { ...editingSlide };
    const updateShapeImage = (shapes: Shape[]): Shape[] => {
      return shapes.map(shape => {
        if (shape.id === selectedShapeId) {
          return { ...shape, exportedImagePath: resource.fileName };
        }
        if (shape.groupItems) {
          return { ...shape, groupItems: updateShapeImage(shape.groupItems) };
        }
        return shape;
      });
    };
    newSlide.shapes = updateShapeImage(newSlide.shapes || []);
    setEditingSlide(newSlide);
    if (onSlideUpdate) {
      onSlideUpdate(newSlide);
    }
    setShowResourceDialog(false);
    setSelectedShapeId(null);
  };

  const slideStyle: React.CSSProperties = {
    position: "relative",
    width: slide.width,
    height: slide.height,
    border: isEditing ? "2px solid #2563eb" : "1px solid #ccc",
    backgroundColor: "#ffffff",
    overflow: "hidden",
    transform: `scale(${scale})`,
    transformOrigin: "center top",
  };

  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    padding: "20px",
    minWidth: "min-content",
    position: "relative",
    paddingTop: "40px",
  };

  const containerStyle: React.CSSProperties = {
    height: slide.height ? slide.height * scale + 40 : 'auto',
    width: "100%",
    display: "flex",
    justifyContent: "center"
  };

  const editBadgeStyle: React.CSSProperties = {
    position: "absolute",
    top: "0px",
    right: "20px",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "4px 12px",
    borderRadius: "4px",
    fontSize: "14px",
    zIndex: 20,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  };

  const renderSlideContent = () => {
    if (!isEditing) {
      const sortedShapes = [...(slide.shapes ?? [])].sort((a, b) => a.zOrder - b.zOrder);
      return sortedShapes.map((shape) => (
        <ShapeRenderer
          key={shape.id}
          shape={shape}
          projectDir={projectDir}
          resourcesDir={resourcesDir}
          templateId={templateId}
        />
      ));
    }

    return (
      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
      >
        {editingSlide.shapes?.map((shape) => (
          <DraggableShape
            key={shape.id}
            shape={shape}
            projectDir={projectDir}
            resourcesDir={resourcesDir}
            templateId={templateId}
            onTextChange={handleTextChange}
            onImageChange={handleImageChange}
            onSelect={setSelectedShape}
            scale={scale}
          />
        ))}
      </DndContext>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div ref={containerRef} style={containerStyle}>
        <div style={wrapperStyle}>
          <div className="relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 bg-muted px-3 py-1 rounded-full text-sm font-medium z-30">
              スライド {slide.slideIndex}
            </div>
            {isEditing && (
              <div style={editBadgeStyle}>
                編集中
              </div>
            )}
            <div 
              ref={slideRef} 
              style={{ ...slideStyle, cursor: isEditing ? 'default' : 'pointer' }}
              onClick={() => !isEditing && onEditStart()}
            >
              {renderSlideContent()}
            </div>
          </div>
        </div>
      </div>
      {isEditing && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 mb-4"
          onClick={onDeselect}
        >
          選択解除
        </Button>
      )}
      <ResourceSelectionDialog
        open={showResourceDialog}
        onOpenChange={setShowResourceDialog}
        onSelect={handleResourceSelect}
        projectDir={projectDir}
      />
    </div>
  );
}

export default function StaticSlideViewer({ 
  initialSlides, 
  projectDir,
  commitId,
  templateId,
  resourcesDir,
  onSlideUpdate 
}: SlideViewerProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSlides, setEditingSlides] = useState<Slide[]>([]);
  const [modifiedSlideIndices, setModifiedSlideIndices] = useState<Set<number>>(new Set());
  const [activeSlideIndices, setActiveSlideIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function loadSlides() {
      if (initialSlides && initialSlides.length > 0) {
        const processedSlides = [...initialSlides];
        processedSlides.forEach(slide => {
          if (slide.shapes) {
            fixRotatedImages(slide.shapes);
          }
        });
        setSlides(processedSlides);
        setEditingSlides(JSON.parse(JSON.stringify(processedSlides)));
      } else if (projectDir && commitId) {
        try {
          // コミット情報を読み込む
          const commitsResponse = await fetch(`/projects/${projectDir}/commits.json`);
          const commits = await commitsResponse.json();
          const currentCommit = commits.find((c: any) => c.id === commitId);
          
          if (!currentCommit) {
            throw new Error(`Commit ${commitId} not found`);
          }
          
          // 状態情報を読み込む
          const statesResponse = await fetch(`/projects/${projectDir}/states.json`);
          const states = await statesResponse.json();
          const currentState = states.find((s: any) => s.id === currentCommit.stateId);
          
          if (!currentState) {
            throw new Error(`State ${currentCommit.stateId} not found`);
          }
          
          // 各スライドを読み込む
          const loadedSlides = await Promise.all(
            Object.entries(currentState.slides).map(async ([slideId, version]) => {
              if (typeof version !== 'string') {
                throw new Error(`Invalid version for slide ${slideId}`);
              }
              const basePath = projectDir.startsWith('template') 
                ? `/templates/${projectDir}/slides/${slideId}/${version}/${slideId}.json`
                : `/projects/${projectDir}/slides/${slideId}/${version}/${slideId}.json`;
              const response = await fetch(basePath);
              if (!response.ok) {
                throw new Error(`Failed to load slide data for ${slideId}`);
              }
              return await response.json();
            })
          );
          
          // スライドを順番に並べ替え
          const sortedSlides = loadedSlides.sort((a, b) => {
            const indexA = a.slideIndex ?? 0;
            const indexB = b.slideIndex ?? 0;
            return indexA - indexB;
          });
          sortedSlides.forEach(slide => {
            if (slide.shapes) {
              fixRotatedImages(slide.shapes);
            }
          });
          
          setSlides(sortedSlides);
          setEditingSlides(JSON.parse(JSON.stringify(sortedSlides)));
        } catch (error) {
          console.error('Error loading slides:', error);
        }
      }
    }
    
    loadSlides();
  }, [initialSlides, projectDir, commitId]);

  const handleSlideUpdate = (updatedSlide: Slide) => {
    const newEditingSlides = editingSlides.map(slide => 
      slide.slideIndex === updatedSlide.slideIndex ? updatedSlide : slide
    );
    setEditingSlides(newEditingSlides);
    setModifiedSlideIndices(prev => {
      const newSet = new Set(prev);
      newSet.add(updatedSlide.slideIndex!);
      return newSet;
    });
  };

  const handleSaveAll = async () => {
    try {
      if (!projectDir) {
        throw new Error("Project directory is not specified");
      }

      // 変更されたスライドのみを保存
      const savePromises = Array.from(modifiedSlideIndices).map(async (slideIndex) => {
        const slideToSave = editingSlides.find(s => s.slideIndex === slideIndex);
        if (!slideToSave) return;

        const slideId = `slide${slideIndex}`;

        // 現在のバージョン情報を取得
        const statesResponse = await fetch(`/projects/${projectDir}/states.json`);
        const states = await statesResponse.json();
        const commitsResponse = await fetch(`/projects/${projectDir}/commits.json`);
        const commits = await commitsResponse.json();
        
        // 最新のコミットを取得
        const latestCommit = commits[commits.length - 1];
        const currentState = states.find((s: any) => s.id === latestCommit.stateId);
        
        // 現在のスライドの最新バージョンを取得
        const currentVersion = currentState.slides[slideId];
        const versionNumber = currentVersion ? parseInt(currentVersion.replace('version', '')) : 0;
        const newVersion = `version${versionNumber + 1}`;

        // スライドを保存
        const response = await fetch('/api/save-slide', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectDir,
            slideData: {
              ...slideToSave,
              version: newVersion
            },
            slideId,
            version: newVersion
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save slide ${slideIndex}`);
        }

        const result = await response.json();
        return {
          ...slideToSave,
          version: newVersion,
          commitId: result.commitId
        };
      });

      const savedSlides = await Promise.all(savePromises);
      
      // 保存されたスライドで状態を更新
      const newSlides = slides.map(slide => {
        const savedSlide = savedSlides.find(s => s?.slideIndex === slide.slideIndex);
        return savedSlide || slide;
      });

      setSlides(newSlides);
      setEditingSlides(JSON.parse(JSON.stringify(newSlides)));
      setModifiedSlideIndices(new Set());
      setIsEditing(false);
      setActiveSlideIndices(new Set());

      // 親コンポーネントに変更を通知
      if (onSlideUpdate) {
        savedSlides.forEach(savedSlide => {
          if (savedSlide) {
            onSlideUpdate(savedSlide);
          }
        });
      }
    } catch (error) {
      console.error('Error saving slides:', error);
    }
  };

  const handleCancelAll = () => {
    setEditingSlides(JSON.parse(JSON.stringify(slides)));
    setModifiedSlideIndices(new Set());
    setIsEditing(false);
    setActiveSlideIndices(new Set());
  };

  const handleSlideClick = (slideIndex: number) => {
    if (!isEditing) {
      setIsEditing(true);
      setActiveSlideIndices(new Set([slideIndex]));
    } else {
      setActiveSlideIndices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(slideIndex)) {
          newSet.delete(slideIndex);
          if (newSet.size === 0) {
            setIsEditing(false);
          }
        } else {
          newSet.add(slideIndex);
        }
        return newSet;
      });
    }
  };

  const handleDeselectSlide = (slideIndex: number) => {
    setActiveSlideIndices(prev => {
      const newSet = new Set(prev);
      newSet.delete(slideIndex);
      if (newSet.size === 0) {
        setIsEditing(false);
      }
      return newSet;
    });
  };

  return (
    <div>
      {editingSlides.map((slide) => (
        <SlideItem 
          key={slide.slideIndex} 
          slide={slide} 
          projectDir={projectDir}
          versionDir={commitId}
          resourcesDir={resourcesDir}
          templateId={templateId}
          onSlideUpdate={handleSlideUpdate}
          isEditing={isEditing && activeSlideIndices.has(slide.slideIndex!)}
          onEditStart={() => handleSlideClick(slide.slideIndex!)}
          onDeselect={() => handleDeselectSlide(slide.slideIndex!)}
        />
      ))}
      {isEditing && (
        <div className="bg-background border-t p-4 mb-20">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-center items-center gap-2">
            <Button 
              onClick={handleSaveAll}
              disabled={modifiedSlideIndices.size === 0}
              className="w-full sm:w-auto"
            >
              保存 ({modifiedSlideIndices.size}個のスライドが変更されました)
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancelAll}
              className="w-full sm:w-auto"
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 