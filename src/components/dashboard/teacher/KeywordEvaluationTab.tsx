import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GeminiService } from "@/services/GeminiService";
import ApiKeySetup from "@/components/ApiKeySetup";
import { Loader2, PlayCircle, CheckCircle, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Assignment {
  id: string;
  title: string;
  description: string;
  total_marks: number;
}

interface Submission {
  id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

interface EvaluationResult {
  submissionId: string;
  studentName: string;
  result: any;
  success: boolean;
  error?: string;
}

const KeywordEvaluationTab = () => {
  const { toast } = useToast();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [assignmentProblem, setAssignmentProblem] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [currentEvaluating, setCurrentEvaluating] = useState<string>("");

  useEffect(() => {
    const apiKey = GeminiService.getApiKey();
    setHasApiKey(!!apiKey);
    if (apiKey) {
      fetchAssignments();
    }
  }, []);

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch assignments",
        variant: "destructive",
      });
    } else {
      setAssignments(data || []);
    }
  };

  const fetchSubmissions = async (assignmentId: string) => {
    const { data, error } = await supabase
      .from("submissions")
      .select("id, student_id, file_url, file_name")
      .eq("assignment_id", assignmentId);

    if (error) {
      console.error("Fetch submissions error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
      return [];
    }

    // Fetch profiles separately
    const submissionsWithProfiles = await Promise.all(
      (data || []).map(async (sub) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", sub.student_id)
          .single();

        return {
          ...sub,
          profiles: profile || null,
        };
      })
    );

    return submissionsWithProfiles;
  };

  const handleAssignmentSelect = async (assignmentId: string) => {
    setSelectedAssignment(assignmentId);
    setKeywords([]);
    setEvaluationResults([]);
    
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment?.description) {
      setAssignmentProblem(assignment.description);
    }
    
    const subs = await fetchSubmissions(assignmentId);
    setSubmissions(subs);
  };

  const handleExtractKeywords = async () => {
    if (!assignmentProblem.trim()) {
      toast({
        title: "Error",
        description: "Please enter the assignment problem/description",
        variant: "destructive",
      });
      return;
    }

    setIsExtractingKeywords(true);
    try {
      const extractedKeywords = await GeminiService.extractKeywords(assignmentProblem);
      setKeywords(extractedKeywords);
      toast({
        title: "Success",
        description: `Extracted ${extractedKeywords.length} keywords`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract keywords",
        variant: "destructive",
      });
    } finally {
      setIsExtractingKeywords(false);
    }
  };

  const evaluateSubmission = async (submission: Submission): Promise<EvaluationResult> => {
    try {
      const studentName = submission.profiles?.full_name || "Unknown Student";
      setCurrentEvaluating(studentName);
      
      // Fetch file content from storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from("submissions")
        .download(submission.file_url);

      if (fileError) throw new Error("Failed to download submission file");

      const text = await fileData.text();
      const result = await GeminiService.evaluateAssignment(text, keywords);

      // Store evaluation in database
      const { error: insertError } = await supabase.from("evaluations").insert({
        submission_id: submission.id,
        marks_obtained: result.total_score,
        keyword_coverage: result.keyword_coverage,
        matched_keywords: result.matched_keywords,
        missing_keywords: result.missing_keywords,
        rubric_scores: result.rubric,
        feedback: result.feedback,
      });

      if (insertError) throw insertError;

      return {
        submissionId: submission.id,
        studentName,
        result,
        success: true,
      };
    } catch (error) {
      const studentName = submission.profiles?.full_name || "Unknown Student";
      return {
        submissionId: submission.id,
        studentName,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : "Evaluation failed",
      };
    }
  };

  const handleEvaluateAll = async () => {
    if (keywords.length === 0) {
      toast({
        title: "Error",
        description: "Please extract keywords first",
        variant: "destructive",
      });
      return;
    }

    if (submissions.length === 0) {
      toast({
        title: "Error",
        description: "No submissions found for this assignment",
        variant: "destructive",
      });
      return;
    }

    setIsEvaluating(true);
    setEvaluationResults([]);

    const results: EvaluationResult[] = [];
    
    for (const submission of submissions) {
      const result = await evaluateSubmission(submission);
      results.push(result);
      setEvaluationResults([...results]);
    }

    setCurrentEvaluating("");
    setIsEvaluating(false);

    const successCount = results.filter(r => r.success).length;
    toast({
      title: "Evaluation Complete",
      description: `Successfully evaluated ${successCount} out of ${submissions.length} submissions`,
    });
  };

  const handleEvaluateIndividual = async (submission: Submission) => {
    if (keywords.length === 0) {
      toast({
        title: "Error",
        description: "Please extract keywords first",
        variant: "destructive",
      });
      return;
    }

    setIsEvaluating(true);
    const result = await evaluateSubmission(submission);
    setEvaluationResults(prev => [...prev, result]);
    setIsEvaluating(false);
    setCurrentEvaluating("");

    if (result.success) {
      toast({
        title: "Success",
        description: `Evaluated ${result.studentName}'s submission`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Evaluation failed",
        variant: "destructive",
      });
    }
  };

  const handleApiKeySet = () => {
    setHasApiKey(true);
    setShowApiKeySetup(false);
    fetchAssignments();
  };

  if (!hasApiKey || showApiKeySetup) {
    return <ApiKeySetup onApiKeySet={handleApiKeySet} />;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Keyword-Based Evaluation</CardTitle>
              <CardDescription>Evaluate assignments using AI-extracted keywords</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowApiKeySetup(true)}>
              <Settings className="h-4 w-4 mr-2" />
              API Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assignment Selection */}
          <div className="space-y-2">
            <Label>Select Assignment</Label>
            <Select value={selectedAssignment} onValueChange={handleAssignmentSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an assignment" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id}>
                    {assignment.title} ({assignment.total_marks} marks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAssignment && (
            <>
              {/* Assignment Problem/Description */}
              <div className="space-y-2">
                <Label>Assignment Problem/Description</Label>
                <Textarea
                  value={assignmentProblem}
                  onChange={(e) => setAssignmentProblem(e.target.value)}
                  placeholder="Enter or edit the assignment problem description..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Extract Keywords Button */}
              <Button
                onClick={handleExtractKeywords}
                disabled={isExtractingKeywords || !assignmentProblem.trim()}
                className="w-full"
              >
                {isExtractingKeywords ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting Keywords...
                  </>
                ) : (
                  "Extract Keywords"
                )}
              </Button>

              {/* Display Keywords */}
              {keywords.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Extracted {keywords.length} Keywords:</p>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Submissions & Evaluation */}
              {submissions.length > 0 && keywords.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">
                      Submissions ({submissions.length})
                    </h3>
                    <Button
                      onClick={handleEvaluateAll}
                      disabled={isEvaluating}
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Evaluate All
                        </>
                      )}
                    </Button>
                  </div>

                  {currentEvaluating && (
                    <Alert>
                      <AlertDescription>
                        Currently evaluating: <strong>{currentEvaluating}</strong>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    {submissions.map((submission) => {
                      const evalResult = evaluationResults.find(
                        (r) => r.submissionId === submission.id
                      );

                      return (
                        <div
                          key={submission.id}
                          className="border rounded-lg p-4 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{submission.profiles?.full_name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">
                                {submission.profiles?.email || "No email"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                File: {submission.file_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {evalResult ? (
                                evalResult.success ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="default">
                                      Score: {evalResult.result.total_score}/50
                                    </Badge>
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  </div>
                                ) : (
                                  <Badge variant="destructive">Failed</Badge>
                                )
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleEvaluateIndividual(submission)}
                                  disabled={isEvaluating}
                                >
                                  Evaluate
                                </Button>
                              )}
                            </div>
                          </div>

                          {evalResult && evalResult.success && (
                            <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Keyword Coverage:</span>
                                <span className="font-medium">
                                  {evalResult.result.keyword_coverage}/20
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Matched Keywords:</span>
                                <span className="font-medium">
                                  {evalResult.result.matched_keywords?.length || 0}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium">Feedback:</p>
                                <p className="text-muted-foreground text-xs">
                                  {evalResult.result.feedback}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {submissions.length === 0 && selectedAssignment && (
                <Alert>
                  <AlertDescription>
                    No submissions found for this assignment yet.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordEvaluationTab;
