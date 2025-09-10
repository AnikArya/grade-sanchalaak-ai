import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, AlertTriangle } from "lucide-react";
import { FileParserService, ParsedContent } from "@/services/FileParserService";
import { useToast } from "@/hooks/use-toast";

interface BatchFileUploadProps {
  onFilesParsed: (files: ParsedContent[]) => void;
  disabled?: boolean;
}

const BatchFileUpload = ({ onFilesParsed, disabled }: BatchFileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedContent[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const { toast } = useToast();

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    
    if (files.length > 100) {
      toast({
        title: "Too Many Files",
        description: "Maximum 100 files allowed at once.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    const newParsedFiles: ParsedContent[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const parsedContent = await FileParserService.parseFile(file);
        newParsedFiles.push(parsedContent);
      } catch (error) {
        console.error(`Error parsing ${file.name}:`, error);
        toast({
          title: "File Parse Error",
          description: `Failed to parse ${file.name}`,
          variant: "destructive",
        });
      }
      setProcessingProgress(((i + 1) / fileArray.length) * 100);
    }

    setParsedFiles(newParsedFiles);
    onFilesParsed(newParsedFiles);
    setIsProcessing(false);
    
    toast({
      title: "Files Processed",
      description: `Successfully processed ${newParsedFiles.length} out of ${fileArray.length} files.`,
    });
  }, [onFilesParsed, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isProcessing) return;
    handleFiles(e.dataTransfer.files);
  }, [handleFiles, disabled, isProcessing]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && !disabled && !isProcessing) {
      handleFiles(e.target.files);
    }
  }, [handleFiles, disabled, isProcessing]);

  const removeFile = (index: number) => {
    const updatedFiles = parsedFiles.filter((_, i) => i !== index);
    setParsedFiles(updatedFiles);
    onFilesParsed(updatedFiles);
  };

  const clearAll = () => {
    setParsedFiles([]);
    onFilesParsed([]);
    setProcessingProgress(0);
  };

  return (
    <div className="space-y-4">
      <Card 
        className={`border-2 border-dashed transition-all duration-300 ${
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Batch Upload Assignment Solutions
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Drop up to 100 assignment files here or click to browse. 
            Supports PDF, Excel, Word, and text files.
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.docx,.txt"
            onChange={handleFileInput}
            className="hidden"
            id="batch-file-input"
            disabled={disabled || isProcessing}
          />
          <Button 
            asChild 
            variant="outline" 
            disabled={disabled || isProcessing}
            className="mb-2"
          >
            <label htmlFor="batch-file-input" className="cursor-pointer">
              Choose Files
            </label>
          </Button>
          <p className="text-xs text-muted-foreground">
            Maximum 100 files, 10MB per file
          </p>
        </CardContent>
      </Card>

      {isProcessing && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-medium">Processing files...</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(processingProgress)}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {parsedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Uploaded Files ({parsedFiles.length})
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAll}
                disabled={isProcessing}
              >
                Clear All
              </Button>
            </div>
            <CardDescription>
              Click on any file to remove it from the batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {parsedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-secondary rounded-lg group hover:bg-destructive/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {file.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.text.length} characters
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isProcessing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchFileUpload;