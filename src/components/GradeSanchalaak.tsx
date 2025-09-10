import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, CheckCircle, FileText, Upload, LogOut, BookOpen, BarChart3 } from "lucide-react";
import { OpenAIService } from "@/services/OpenAIService";
import { ParsedContent } from "@/services/FileParserService";
import BatchFileUpload from "@/components/BatchFileUpload";
import BatchEvaluationResults from "@/components/BatchEvaluationResults";
import ApiKeySetup from "@/components/ApiKeySetup";
import { useToast } from "@/hooks/use-toast";

interface BatchResult {
  filename: string;
  evaluation: any;
}

const GradeSanchalaak = () => {
  const [step, setStep] = useState<'problem' | 'upload' | 'results'>('problem');
  const [assignmentProblem, setAssignmentProblem] = useState("");
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<ParsedContent[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const apiKey = OpenAIService.getApiKey();
    setHasApiKey(!!apiKey);
  }, []);

  const extractKeywords = async () => {
    if (!assignmentProblem.trim()) {
      toast({
        title: "No Problem Statement",
        description: "Please enter the assignment problem first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const keywords = await OpenAIService.extractKeywords(assignmentProblem);
      setExtractedKeywords(keywords);
      setStep('upload');
      
      toast({
        title: "Keywords Extracted",
        description: `Successfully extracted ${keywords.length} relevant keywords.`,
      });
    } catch (error) {
      console.error('Keyword extraction error:', error);
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract keywords",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const evaluateBatch = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No Files",
        description: "Please upload assignment files first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const results: BatchResult[] = [];

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        try {
          const evaluation = await OpenAIService.evaluateAssignment(file.text, extractedKeywords);
          results.push({
            filename: file.filename,
            evaluation: evaluation
          });
        } catch (error) {
          console.error(`Error evaluating ${file.filename}:`, error);
          toast({
            title: "Evaluation Error",
            description: `Failed to evaluate ${file.filename}`,
            variant: "destructive",
          });
        }
      }

      setBatchResults(results);
      setStep('results');
      
      toast({
        title: "Batch Evaluation Complete",
        description: `Successfully evaluated ${results.length} assignments.`,
      });
    } catch (error) {
      console.error('Batch evaluation error:', error);
      toast({
        title: "Evaluation Failed",
        description: "Failed to complete batch evaluation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApiKeySet = () => {
    setHasApiKey(true);
  };

  const handleLogout = () => {
    OpenAIService.removeApiKey();
    setHasApiKey(false);
    resetApp();
    toast({
      title: "Logged Out",
      description: "API key removed successfully.",
    });
  };

  const resetApp = () => {
    setStep('problem');
    setAssignmentProblem("");
    setExtractedKeywords([]);
    setUploadedFiles([]);
    setBatchResults([]);
  };

  const exportReport = () => {
    const reportData = {
      assignmentProblem,
      extractedKeywords,
      totalFiles: uploadedFiles.length,
      results: batchResults,
      summary: {
        averageScore: batchResults.length > 0 
          ? batchResults.reduce((sum, r) => sum + r.evaluation.total_score, 0) / batchResults.length 
          : 0,
        warningCount: batchResults.filter(r => r.evaluation.is_keyword_only).length
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grade_sanchalaak_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!hasApiKey) {
    return <ApiKeySetup onApiKeySet={handleApiKeySet} />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <div className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full shadow-glow">
              <Brain className="w-5 h-5" />
              <span className="font-semibold">AI-Powered Batch Evaluator</span>
            </div>
            <div className="flex-1 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Reset API Key
              </Button>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Grade Sanchalaak
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Advanced AI assignment evaluator with keyword extraction and batch processing. 
            Extract 50 keywords from assignment problems, then evaluate up to 100 student solutions.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              step === 'problem' ? 'bg-primary text-primary-foreground' : 
              extractedKeywords.length > 0 ? 'bg-success text-white' : 'bg-muted text-muted-foreground'
            }`}>
              <FileText className="w-4 h-4" />
              Problem & Keywords
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              step === 'upload' ? 'bg-primary text-primary-foreground' : 
              uploadedFiles.length > 0 ? 'bg-success text-white' : 'bg-muted text-muted-foreground'
            }`}>
              <Upload className="w-4 h-4" />
              Batch Upload
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              step === 'results' ? 'bg-primary text-primary-foreground' : 
              batchResults.length > 0 ? 'bg-success text-white' : 'bg-muted text-muted-foreground'
            }`}>
              <BarChart3 className="w-4 h-4" />
              Results
            </div>
          </div>
        </div>

        <Tabs value={step} onValueChange={(value: any) => setStep(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="problem" disabled={isProcessing}>
              Assignment Problem
            </TabsTrigger>
            <TabsTrigger value="upload" disabled={extractedKeywords.length === 0 || isProcessing}>
              Upload Solutions
            </TabsTrigger>
            <TabsTrigger value="results" disabled={batchResults.length === 0 || isProcessing}>
              View Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="problem" className="space-y-6">
            <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Assignment Problem Statement
                </CardTitle>
                <CardDescription>
                  Enter or upload the assignment problem to extract 50 relevant keywords for evaluation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="text" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Type Problem
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Problem
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="text" className="space-y-4">
                    <Textarea
                      placeholder="Enter the complete assignment problem statement here. The AI will extract 50 domain-specific keywords that will be used to evaluate student solutions..."
                      value={assignmentProblem}
                      onChange={(e) => setAssignmentProblem(e.target.value)}
                      className="min-h-[200px] resize-none border-2 focus:border-primary transition-colors"
                    />
                  </TabsContent>
                  
                  <TabsContent value="upload" className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const { FileParserService } = await import('@/services/FileParserService');
                              const parsed = await FileParserService.parseFile(file);
                              setAssignmentProblem(parsed.text);
                            } catch (error) {
                              console.error('Error parsing file:', error);
                            }
                          }
                        }}
                        className="hidden"
                        id="problem-file-input"
                      />
                      <label htmlFor="problem-file-input" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload assignment problem file
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports PDF, Word, and TXT files
                        </p>
                      </label>
                    </div>
                    {assignmentProblem && (
                      <div className="bg-secondary/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Extracted text preview:</p>
                        <p className="text-sm truncate">{assignmentProblem.substring(0, 100)}...</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                
                <Button
                  onClick={extractKeywords}
                  disabled={isProcessing || !assignmentProblem.trim()}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Brain className="w-4 h-4 mr-2 animate-spin" />
                      Extracting Keywords...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Extract 50 Keywords
                    </>
                  )}
                </Button>

                {extractedKeywords.length > 0 && (
                  <Card className="bg-secondary/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Extracted Keywords ({extractedKeywords.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {extractedKeywords.map((keyword, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            className="bg-primary/10 hover:bg-primary/20 transition-colors"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Batch Upload Assignment Solutions
                </CardTitle>
                <CardDescription>
                  Upload up to 100 assignment solutions for evaluation based on extracted keywords
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BatchFileUpload 
                  onFilesParsed={setUploadedFiles}
                  disabled={isProcessing}
                />
                
                {uploadedFiles.length > 0 && (
                  <Button
                    onClick={evaluateBatch}
                    disabled={isProcessing}
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Brain className="w-4 h-4 mr-2 animate-spin" />
                        Evaluating {uploadedFiles.length} Assignments...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Evaluate {uploadedFiles.length} Assignments
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            {batchResults.length > 0 ? (
              <BatchEvaluationResults 
                results={batchResults}
                onExportReport={exportReport}
              />
            ) : (
              <Card className="shadow-elegant">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                  <p className="text-muted-foreground">
                    Complete the previous steps to see batch evaluation results
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GradeSanchalaak;