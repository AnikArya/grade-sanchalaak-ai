import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Brain, CheckCircle, FileText } from "lucide-react";

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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const evaluateAssignment = () => {
    if (!assignmentText.trim()) return;
    
    setIsEvaluating(true);
    
    // Simulate AI evaluation with realistic delay
    setTimeout(() => {
      // Mock evaluation result
      const mockResult: EvaluationResult = {
        keywords: [
          "machine learning",
          "neural networks", 
          "data preprocessing",
          "feature engineering",
          "model training",
          "cross-validation",
          "overfitting",
          "regularization",
          "gradient descent",
          "backpropagation",
          "supervised learning",
          "classification",
          "accuracy metrics"
        ],
        relevance_score: 8.5,
        rubric: {
          content_relevance: 4,
          completeness: 3,
          clarity_language: 4,
          originality: 3
        },
        total_score: 14,
        feedback: "The assignment demonstrates a solid understanding of machine learning concepts with clear explanations. However, it could benefit from more detailed examples and deeper analysis of model evaluation techniques."
      };
      
      setResult(mockResult);
      setIsEvaluating(false);
    }, 2000);
  };

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
          <div className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full mb-4 shadow-glow">
            <Brain className="w-5 h-5" />
            <span className="font-semibold">AI-Powered</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Grade Sanchalaak
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced AI assignment evaluator that provides comprehensive analysis with keyword extraction, 
            semantic relevance scoring, and detailed rubric-based feedback.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="shadow-elegant hover:shadow-glow transition-all duration-300 animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Assignment Input
              </CardTitle>
              <CardDescription>
                Paste the student assignment text below for comprehensive evaluation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste the assignment text here for evaluation..."
                value={assignmentText}
                onChange={(e) => setAssignmentText(e.target.value)}
                className="min-h-[300px] resize-none border-2 focus:border-primary transition-colors"
              />
              <Button
                onClick={evaluateAssignment}
                disabled={!assignmentText.trim() || isEvaluating}
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                size="lg"
              >
                {isEvaluating ? (
                  <>
                    <Brain className="w-4 h-4 mr-2 animate-spin" />
                    Evaluating Assignment...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Evaluate Assignment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-6">
            {result ? (
              <div className="animate-fade-in space-y-6">
                {/* Overall Score */}
                <Card className="shadow-elegant">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      Overall Evaluation
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
                  <h3 className="text-lg font-semibold mb-2">Ready to Evaluate</h3>
                  <p className="text-muted-foreground">
                    Enter an assignment text and click "Evaluate Assignment" to see the AI analysis
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