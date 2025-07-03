"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { 
  Puzzle, Trophy, Timer, RotateCcw, Shuffle, 
  Play, HelpCircle, CheckCircle, Target,
  Zap, Smartphone
} from "lucide-react";
import { PuzzlePiece, PuzzleState } from "@/types/exif";
import { getImagePreviewUrl, shuffleArray } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ImagePuzzleProps {
  uploadedImage: File | null;
}

export function ImagePuzzle({ uploadedImage }: ImagePuzzleProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(uploadedImage);
  const [puzzleState, setPuzzleState] = useState<PuzzleState | null>(null);
  const [gridSize, setGridSize] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameTimer, setGameTimer] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [touchState, setTouchState] = useState<{
    selectedPiece: number | null;
    isDragging: boolean;
  }>({ selectedPiece: null, isDragging: false });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update selected file when uploadedImage prop changes
  useEffect(() => {
    if (uploadedImage && uploadedImage !== selectedFile) {
      setSelectedFile(uploadedImage);
      const previewUrl = getImagePreviewUrl(uploadedImage);
      setImagePreview(previewUrl);
    }
  }, [uploadedImage, selectedFile]);

  // Game timer effect
  useEffect(() => {
    if (gameStarted && puzzleState && !puzzleState.isComplete) {
      timerRef.current = setInterval(() => {
        setGameTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStarted, puzzleState]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = useCallback((file: File) => {
    setSelectedFile(file);
    const previewUrl = getImagePreviewUrl(file);
    setImagePreview(previewUrl);
    resetGame();
  }, []);

  const createPuzzle = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      // Create puzzle pieces client-side instead of relying on API
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(selectedFile);
      });

      const pieceSize = 300; // Larger piece size for better quality
      canvas.width = pieceSize * gridSize;
      canvas.height = pieceSize * gridSize;

      // Draw the image to fit the canvas
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Create puzzle pieces
      const pieces: PuzzlePiece[] = [];
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const pieceCanvas = document.createElement('canvas');
          const pieceCtx = pieceCanvas.getContext('2d');
          pieceCanvas.width = pieceSize;
          pieceCanvas.height = pieceSize;

          // Extract piece from main canvas
          const imageData = ctx?.getImageData(
            col * pieceSize, 
            row * pieceSize, 
            pieceSize, 
            pieceSize
          );
          
          if (imageData && pieceCtx) {
            pieceCtx.putImageData(imageData, 0, 0);
            
            const pieceIndex = row * gridSize + col;
            pieces.push({
              id: pieceIndex,
              currentPosition: pieceIndex,
              correctPosition: pieceIndex,
              imageData: pieceCanvas.toDataURL('image/jpeg', 0.9),
            });
          }
        }
      }

      // Shuffle the pieces
      const shuffledPositions = shuffleArray([...Array(pieces.length).keys()]);
      const shuffledPieces = pieces.map((piece, index) => ({
        ...piece,
        currentPosition: shuffledPositions[index],
      }));

      setPuzzleState({
        pieces: shuffledPieces,
        isComplete: false,
        moves: 0,
        timeElapsed: 0,
        gridSize,
      });

      setGameStarted(true);
      setGameTimer(0);
      
      // Clean up
      URL.revokeObjectURL(img.src);
    } catch (error) {
      console.error('Error creating puzzle:', error);
      alert('Failed to create puzzle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setPuzzleState(null);
    setGameStarted(false);
    setGameTimer(0);
    setShowHint(false);
    setDraggedPiece(null);
    setTouchState({ selectedPiece: null, isDragging: false });
  };

  const shufflePieces = () => {
    if (!puzzleState) return;

    const shuffledPositions = shuffleArray([...Array(puzzleState.pieces.length).keys()]);
    const shuffledPieces = puzzleState.pieces.map((piece, index) => ({
      ...piece,
      currentPosition: shuffledPositions[index],
    }));

    setPuzzleState({
      ...puzzleState,
      pieces: shuffledPieces,
      moves: puzzleState.moves + 1,
      isComplete: false,
    });
  };

  const checkCompletion = (pieces: PuzzlePiece[]): boolean => {
    return pieces.every(piece => piece.currentPosition === piece.correctPosition);
  };

  // Desktop drag and drop handlers
  const handleDragStart = (e: React.DragEvent, pieceIndex: number) => {
    if (isMobile) return;
    setDraggedPiece(pieceIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isMobile) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (isMobile) return;
    e.preventDefault();
    if (draggedPiece === null || !puzzleState) return;

    swapPieces(draggedPiece, targetIndex);
    setDraggedPiece(null);
  };

  // Mobile touch handlers
  const handleTouchStart = (e: React.TouchEvent, pieceIndex: number) => {
    e.preventDefault();
    if (touchState.selectedPiece === null) {
      // First touch - select piece
      setTouchState({ selectedPiece: pieceIndex, isDragging: false });
    } else if (touchState.selectedPiece === pieceIndex) {
      // Same piece touched - deselect
      setTouchState({ selectedPiece: null, isDragging: false });
    } else {
      // Different piece - swap and deselect
      swapPieces(touchState.selectedPiece, pieceIndex);
      setTouchState({ selectedPiece: null, isDragging: false });
    }
  };

  // Universal swap function
  const swapPieces = (piece1Index: number, piece2Index: number) => {
    if (!puzzleState) return;

    const newPieces = [...puzzleState.pieces];
    const piece1Pos = newPieces[piece1Index].currentPosition;
    const piece2Pos = newPieces[piece2Index].currentPosition;

    newPieces[piece1Index].currentPosition = piece2Pos;
    newPieces[piece2Index].currentPosition = piece1Pos;

    const isComplete = checkCompletion(newPieces);
    
    setPuzzleState({
      ...puzzleState,
      pieces: newPieces,
      moves: puzzleState.moves + 1,
      isComplete,
    });

    if (isComplete) {
      setGameStarted(false);
    }
  };

  const getPieceAtPosition = (position: number): PuzzlePiece | undefined => {
    return puzzleState?.pieces.find(piece => piece.currentPosition === position);
  };

  // Calculate responsive puzzle size
  const getPuzzleSize = () => {
    if (isMobile) {
      return {
        containerSize: Math.min(window.innerWidth - 32, 400),
        pieceSize: Math.min(window.innerWidth - 32, 400) / gridSize
      };
    } else {
      return {
        containerSize: Math.min(600, window.innerWidth * 0.6),
        pieceSize: Math.min(600, window.innerWidth * 0.6) / gridSize
      };
    }
  };

  const puzzleSize = getPuzzleSize();

  if (!selectedFile) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Puzzle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Image Puzzle Game</h2>
          <p className="text-muted-foreground mb-6">
            Turn your images into fun sliding puzzles! Upload an image to start playing.
          </p>
        </div>
        
        <FileUpload 
          onFileUpload={handleFileUpload}
          acceptedTypes={["image/*"]}
          maxSize={50 * 1024 * 1024}
        />
        
        <Alert className="bg-purple-500/10 border-purple-500/20">
          <HelpCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>How to play:</strong> {isMobile ? 'Tap pieces to select and swap them' : 'Drag and drop puzzle pieces'} to rearrange them and 
            recreate the original image. Try to complete it in the fewest moves!
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Setup */}
      {!puzzleState && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Puzzle Configuration
              {isMobile && <Badge variant="secondary" className="bg-blue-500/20 text-blue-400"><Smartphone className="w-3 h-3 mr-1" />Touch Mode</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                {imagePreview && (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Puzzle source"
                      className="w-full h-64 object-contain rounded-lg bg-muted"
                    />
                    <Badge className="absolute top-2 right-2 bg-black/80">
                      Source Image
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                  <Select value={gridSize.toString()} onValueChange={(value) => setGridSize(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400">Easy</Badge>
                          <span>3x3 (9 pieces)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">Medium</Badge>
                          <span>4x4 (16 pieces)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="5">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-red-500/20 text-red-400">Hard</Badge>
                          <span>5x5 (25 pieces)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={createPuzzle} 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Creating Puzzle...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Puzzle Game
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Interface */}
      {puzzleState && (
        <>
          {/* Game Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Timer className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                <div className="text-2xl font-bold">{formatTime(gameTimer)}</div>
                <div className="text-xs text-muted-foreground">Time</div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                <div className="text-2xl font-bold">{puzzleState.moves}</div>
                <div className="text-xs text-muted-foreground">Moves</div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Puzzle className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold">{gridSize}x{gridSize}</div>
                <div className="text-xs text-muted-foreground">Grid</div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold">
                  {puzzleState.isComplete ? '100' : Math.round((puzzleState.pieces.filter(p => p.currentPosition === p.correctPosition).length / puzzleState.pieces.length) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </CardContent>
            </Card>
          </div>

          {/* Game Controls */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={shufflePieces} disabled={puzzleState.isComplete}>
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowHint(!showHint)}
              className={showHint ? "bg-yellow-500/20 border-yellow-500/40" : ""}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </Button>
            <Button variant="outline" onClick={resetGame}>
              <RotateCcw className="w-4 h-4 mr-2" />
              New Game
            </Button>
            {isMobile && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                <Smartphone className="w-3 h-3 mr-1" />
                Tap to select/swap
              </Badge>
            )}
          </div>

          {/* Reference Image */}
          {showHint && imagePreview && (
            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-sm text-yellow-400">Reference Image</CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={imagePreview} 
                  alt="Reference"
                  className="w-48 h-48 object-contain rounded-lg bg-muted mx-auto"
                />
              </CardContent>
            </Card>
          )}

          {/* Puzzle Grid - Responsive Size */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div 
                className="grid mx-auto border-2 border-border/50 rounded-lg overflow-hidden"
                style={{ 
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                  width: `${puzzleSize.containerSize}px`,
                  height: `${puzzleSize.containerSize}px`,
                  gap: '0px'
                }}
              >
                {Array.from({ length: gridSize * gridSize }, (_, index) => {
                  const piece = getPieceAtPosition(index);
                  const isSelected = isMobile && touchState.selectedPiece === piece?.id;
                  const isCorrectPosition = showHint && piece?.correctPosition === index;
                  const isWrongPosition = showHint && piece?.correctPosition !== index;
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "aspect-square border-0 transition-all duration-200 relative",
                        !isMobile && "hover:scale-105 cursor-grab active:cursor-grabbing",
                        isMobile && "cursor-pointer active:scale-95",
                        draggedPiece === piece?.id && "opacity-50 scale-95",
                        isSelected && "ring-4 ring-blue-500 z-10",
                        isCorrectPosition && "ring-2 ring-green-500",
                        isWrongPosition && "ring-2 ring-red-500"
                      )}
                      style={{ 
                        width: `${puzzleSize.pieceSize}px`, 
                        height: `${puzzleSize.pieceSize}px` 
                      }}
                      onDragOver={!isMobile ? handleDragOver : undefined}
                      onDrop={!isMobile ? (e) => handleDrop(e, piece?.id || 0) : undefined}
                      onTouchStart={isMobile ? (e) => handleTouchStart(e, piece?.id || 0) : undefined}
                    >
                      {piece && (
                        <img
                          src={piece.imageData}
                          alt={`Puzzle piece ${piece.id}`}
                          className="w-full h-full object-cover select-none"
                          draggable={!isMobile}
                          onDragStart={!isMobile ? (e) => handleDragStart(e, piece.id) : undefined}
                          style={{ 
                            pointerEvents: isMobile ? 'none' : 'auto',
                            userSelect: 'none',
                            WebkitUserSelect: 'none'
                          }}
                        />
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Mobile Instructions */}
              {isMobile && !puzzleState.isComplete && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <Smartphone className="w-4 h-4 inline mr-2" />
                  Tap a piece to select it, then tap another piece to swap them
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completion Alert */}
          {puzzleState.isComplete && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Congratulations!</strong> You completed the puzzle in {puzzleState.moves} moves 
                and {formatTime(gameTimer)}! 🎉
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}