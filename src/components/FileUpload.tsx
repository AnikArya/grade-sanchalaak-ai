import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  File, 
  CheckCircle, 
  X, 
  AlertCircle 
} from "lucide-react";
import { FileParserService, ParsedContent } from "@/services/FileParserService";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFilesParsed: (files: ParsedContent[]) => void;
  disabled?: boolean;
}

const FileUpload = ({ onFilesParsed, disabled }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedContent[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [disabled]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    const supportedFiles = files.filter(file => {
      if (FileParserService.isFileSupported(file)) {
        return true;
      } else {
        toast({
          title: "Unsupported File",
          description: `${file.name} format is not supported`,
          variant: "destructive",
        });
        return false;
      }
    });

    if (supportedFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    
    const parsed: ParsedContent[] = [];
    
    for (let i = 0; i < supportedFiles.length; i++) {
      const file = supportedFiles[i];
      
      try {
        const content = await FileParserService.parseFile(file);
        parsed.push(content);
        setProgress(((i + 1) / supportedFiles.length) * 100);
        
        toast({
          title: "File Processed",
          description: `Successfully parsed ${file.name}`,
        });
      } catch (error) {
        toast({
          title: "Parse Error",
          description: error instanceof Error ? error.message : `Failed to parse ${file.name}`,
          variant: "destructive",
        });
      }
    }
    
    setParsedFiles(parsed);
    onFilesParsed(parsed);
    setIsProcessing(false);
  };

  const removeFile = (index: number) => {
    const updated = parsedFiles.filter((_, i) => i !== index);
    setParsedFiles(updated);
    onFilesParsed(updated);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'xlsx':
      case 'xls':
        return <File className="w-4 h-4 text-green-500" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'txt':
        return <FileText className="w-4 h-4 text-gray-500" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const supportedFormats = FileParserService.getSupportedFormats().join(', ');

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          File Upload
        </CardTitle>
        <CardDescription>
          Upload assignment files for evaluation. Supported formats: {supportedFormats}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : disabled 
                ? 'border-muted bg-muted/30' 
                : 'border-border hover:border-primary hover:bg-primary/5'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className={`w-8 h-8 mx-auto mb-3 ${disabled ? 'text-muted-foreground' : 'text-primary'}`} />
          <p className="text-sm font-medium mb-2">
            {disabled ? 'Upload disabled during processing' : 'Drop files here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Maximum file size: 10MB per file
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={disabled}
          />
          <Label htmlFor="file-upload">
            <Button 
              variant="outline" 
              className="cursor-pointer"
              disabled={disabled}
              asChild
            >
              <span>Choose Files</span>
            </Button>
          </Label>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm font-medium">Processing files...</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Parsed Files List */}
        {parsedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Processed Files:</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {parsedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-md"
                >
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.text.length} characters extracted
                    </p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => removeFile(index)}
                    disabled={disabled}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUpload;