import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Brain, CheckCircle, FileText, Upload, Settings, LogOut } from "lucide-react";
import { GeminiService } from "@/services/GeminiService";
import { ParsedContent } from "@/services/FileParserService";
import FileUpload from "@/components/FileUpload";
import ApiKeySetup from "@/components/ApiKeySetup";
import { useToast } from "@/hooks/use-toast";

interface EvaluationResult {
  keywords: string[];
  relevance_score: number;
  rubric: {
    content_relevance: number;
    completeness: number;
    clarity_language: number;
    originality: number;
  };
  total_score: number;
  feedback: string;
}

const AssignmentEvaluator = () => {
  const [assignmentText, setAssignmentText] = useState("");
  const [parsedFiles, setParsedFiles] = useState<ParsedContent[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const { toast } = useToast();

  useEffect(() => {
    const apiKey = GeminiService.getApiKey();
    setHasApiKey(!!apiKey);
  }, []);

  const evaluateAssignment = async () => {
    let textToEvaluate = "";
    
    if (activeTab === "text" && assignmentText.trim()) {
      textToEvaluate = assignmentText;
    } else if (activeTab === "files" && parsedFiles.length > 0) {
      textToEvaluate = parsedFiles.map(file => 
        `File: ${file.filename}\n${file.text}`
      ).join('\n\n---\n\n');
    }
    
    if (!textToEvaluate.trim()) {
      toast({
        title: "No Content",
        description: "Please provide assignment text or upload files to evaluate.",
        variant: "destructive",
      });
      return;
    }
    
    setIsEvaluating(true);
    setResult(null);
    
    try {
      // For single assignment evaluation, we'll use empty keywords array
      const evaluation = await GeminiService.evaluateAssignment(textToEvaluate, []);
      setResult(evaluation);
      
      toast({
        title: "Evaluation Complete",
        description: "Assignment has been successfully evaluated by AI.",
      });
    } catch (error) {
      console.error('Evaluation error:', error);
      toast({
        title: "Evaluation Failed",
        description: error instanceof Error ? error.message : "Failed to evaluate assignment",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApiKeySet = () => {
    setHasApiKey(true);
  };

  const handleLogout = () => {
    GeminiService.removeApiKey();
    setHasApiKey(false);
    setResult(null);
    setAssignmentText("");
    setParsedFiles([]);
    toast({
      title: "Logged Out",
      description: "API key removed successfully.",
    });
  };

  if (!hasApiKey) {
    return <ApiKeySetup onApiKeySet={handleApiKeySet} />;
  }

  const getRubricColor = (score: number) => {
    if (score >= 4) return "bg-success";
    if (score >= 3) return "bg-accent";
    if (score >= 2) return "bg-warning";
    return "bg-destructive";
  };

  const getRubricLabel = (score: number) => {
    if (score >= 4) return "Excellent";
    if (score >= 3) return "Good";
    if (score >= 2) return "Fair";
    return "Needs Improvement";
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <div className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full shadow-glow">
              <Brain className="w-5 h-5" />
              <span className="font-semibold">AI-Powered</span>
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced AI assignment evaluator supporting multiple file formats with comprehensive analysis, 
            keyword extraction, semantic relevance scoring, and detailed rubric-based feedback.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <Card className="shadow-elegant hover:shadow-glow transition-all duration-300 animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Assignment Input
                </CardTitle>
                <CardDescription>
                  Enter text directly or upload assignment files for AI evaluation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="text" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Text Input
                    </TabsTrigger>
                    <TabsTrigger value="files" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      File Upload
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="text" className="space-y-4">
                    <Textarea
                      placeholder="Paste the assignment text here for evaluation..."
                      value={assignmentText}
                      onChange={(e) => setAssignmentText(e.target.value)}
                      className="min-h-[300px] resize-none border-2 focus:border-primary transition-colors"
                    />
                  </TabsContent>
                  
                  <TabsContent value="files">
                    <FileUpload 
                      onFilesParsed={setParsedFiles}
                      disabled={isEvaluating}
                    />
                  </TabsContent>
                </Tabs>
                
                <Button
                  onClick={evaluateAssignment}
                  disabled={
                    isEvaluating || 
                    (activeTab === "text" && !assignmentText.trim()) ||
                    (activeTab === "files" && parsedFiles.length === 0)
                  }
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 mt-4"
                  size="lg"
                >
                  {isEvaluating ? (
                    <>
                      <Brain className="w-4 h-4 mr-2 animate-spin" />
                      AI is Evaluating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Evaluate with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {result ? (
              <div className="animate-fade-in space-y-6">
                {/* Overall Score */}
                <Card className="shadow-elegant">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      AI Evaluation Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                        {result.total_score}/20
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Relevance Score: {result.relevance_score}/10
                      </div>
                    </div>
                    <Progress 
                      value={(result.total_score / 20) * 100} 
                      className="h-3"
                    />
                  </CardContent>
                </Card>

                {/* Keywords */}
                <Card className="shadow-elegant">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-accent" />
                      Extracted Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.keywords.map((keyword, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Rubric Breakdown */}
                <Card className="shadow-elegant">
                  <CardHeader>
                    <CardTitle>Rubric Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(result.rubric).map(([criterion, score]) => (
                      <div key={criterion} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">
                            {criterion.replace('_', ' & ')}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{score}/5</span>
                            <Badge 
                              className={`${getRubricColor(score)} text-white`}
                            >
                              {getRubricLabel(score)}
                            </Badge>
                          </div>
                        </div>
                        <Progress 
                          value={(score / 5) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Feedback */}
                <Card className="shadow-elegant">
                  <CardHeader>
                    <CardTitle>Constructive Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed">
                      {result.feedback}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="shadow-elegant">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready for AI Evaluation</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "text" 
                      ? "Enter assignment text and click 'Evaluate with AI'"
                      : "Upload assignment files and click 'Evaluate with AI'"
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentEvaluator;