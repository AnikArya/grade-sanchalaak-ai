import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, FileText, Brain, Download, BarChart3 } from "lucide-react";

interface BatchResult {
  filename: string;
  evaluation: {
    keyword_coverage: number;
    matched_keywords: string[];
    missing_keywords: string[];
    rubric: {
      content_quality: number;
      completeness: number;
      clarity_language: number;
      originality: number;
    };
    total_score: number;
    is_keyword_only: boolean;
    feedback: string;
    warning?: string;
  };
}

interface BatchEvaluationResultsProps {
  results: BatchResult[];
  extractedKeywords: string[];
  onExportReport: () => void;
  onExportExcel: () => void;
}

const BatchEvaluationResults = ({ results, extractedKeywords, onExportReport, onExportExcel }: BatchEvaluationResultsProps) => {
  const [selectedResult, setSelectedResult] = useState<BatchResult | null>(null);

  const warningResults = results.filter(r => r.evaluation.is_keyword_only);
  const averageScore = results.length > 0 
    ? results.reduce((sum, r) => sum + r.evaluation.total_score, 0) / results.length 
    : 0;

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
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Batch Evaluation Summary
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onExportReport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={onExportExcel}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {results.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Assignments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {averageScore.toFixed(1)}/50
              </div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {warningResults.length}
              </div>
              <div className="text-sm text-muted-foreground">Keyword-Only Warnings</div>
            </div>
          </div>
          
          {warningResults.length > 0 && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="font-medium text-destructive">
                  {warningResults.length} assignments flagged as keyword-only
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                These assignments appear to contain only keywords without proper explanations.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Results List</TabsTrigger>
          <TabsTrigger value="details">Detailed View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Assignment Results</CardTitle>
              <CardDescription>
                Click on any assignment to view detailed evaluation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div 
                      key={index}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        result.evaluation.is_keyword_only ? 'border-destructive bg-destructive/5' : 'border-border'
                      } ${selectedResult?.filename === result.filename ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedResult(result)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm truncate">
                            {result.filename}
                          </span>
                          {result.evaluation.is_keyword_only && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <Badge variant="secondary">
                          {result.evaluation.total_score}/50
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Keywords Covered:</span>
                          <span className="ml-1 font-medium">
                            {result.evaluation.matched_keywords.length}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quality Score:</span>
                          <span className="ml-1 font-medium">
                            {result.evaluation.keyword_coverage}/20
                          </span>
                        </div>
                      </div>
                      
                      <Progress 
                        value={(result.evaluation.total_score / 50) * 100} 
                        className="h-2 mt-2"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details">
          {selectedResult ? (
            <div className="space-y-6">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    {selectedResult.filename}
                  </CardTitle>
                  {selectedResult.evaluation.warning && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="font-medium text-destructive">Warning</span>
                      </div>
                      <p className="text-sm text-destructive mt-1">
                        {selectedResult.evaluation.warning}
                      </p>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Score Overview */}
                  <div className="text-center">
                    <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                      {selectedResult.evaluation.total_score}/50
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Keyword Coverage: {selectedResult.evaluation.keyword_coverage}/20
                    </div>
                    <Progress 
                      value={(selectedResult.evaluation.total_score / 50) * 100} 
                      className="h-3 mt-2"
                    />
                  </div>

                {/* AI Generated Keywords */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2 text-primary">AI Generated Keywords ({extractedKeywords.length})</h4>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto bg-secondary/30 p-2 rounded-lg">
                      {extractedKeywords.map((keyword, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-primary/10">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Keywords Analysis */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 text-success">Matched Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedResult.evaluation.matched_keywords.map((keyword, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 text-destructive">Missing Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedResult.evaluation.missing_keywords.slice(0, 10).map((keyword, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {selectedResult.evaluation.missing_keywords.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{selectedResult.evaluation.missing_keywords.length - 10} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rubric Breakdown */}
                  <div>
                    <h4 className="font-medium mb-3">Rubric Breakdown</h4>
                    <div className="space-y-3">
                      {Object.entries(selectedResult.evaluation.rubric).map(([criterion, score]) => (
                        <div key={criterion} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium capitalize text-sm">
                              {criterion.replace('_', ' & ')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{score}/5</span>
                              <Badge 
                                className={`${getRubricColor(score)} text-white text-xs`}
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
                    </div>
                  </div>

                  {/* Feedback */}
                  <div>
                    <h4 className="font-medium mb-2">AI Feedback</h4>
                    <p className="text-foreground leading-relaxed text-sm bg-secondary/50 p-3 rounded-lg">
                      {selectedResult.evaluation.feedback}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="shadow-elegant">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select an Assignment</h3>
                <p className="text-muted-foreground">
                  Choose an assignment from the list to view detailed evaluation results
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatchEvaluationResults;