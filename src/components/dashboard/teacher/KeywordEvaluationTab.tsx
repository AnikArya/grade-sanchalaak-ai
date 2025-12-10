import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GeminiService } from "@/services/GeminiService";
import { Loader2, PlayCircle, CheckCircle, Sparkles, File } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Assignment {
  id: string;
  title: string;
  description: string;
  description_file_url?: string;
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
    fetchAssignments();
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
    } else {
      setAssignmentProblem("");
    }
    
    const subs = await fetchSubmissions(assignmentId);
    setSubmissions(subs);
  };

  const getSelectedAssignment = () => assignments.find(a => a.id === selectedAssignment);

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
      
      // Extract the file path from the full URL
      const urlParts = submission.file_url.split('/submissions/');
      const filePath = urlParts.length > 1 ? urlParts[1] : submission.file_url;
      
      // Fetch file content from storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from("submissions")
        .download(filePath);

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

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Keyword Evaluation
              </CardTitle>
              <CardDescription>Evaluate assignments using AI-extracted keywords - no API key required</CardDescription>
            </div>
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
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Assignment Problem/Description</Label>
                  {getSelectedAssignment()?.description_file_url && (
                    <a
                      href={getSelectedAssignment()?.description_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <File className="h-4 w-4" />
                      View PDF Description
                    </a>
                  )}
                </div>
                <Textarea
                  value={assignmentProblem}
                  onChange={(e) => setAssignmentProblem(e.target.value)}
                  placeholder="Enter or edit the assignment problem description. If a PDF was uploaded, copy the relevant content here for keyword extraction..."
                  rows={8}
                  className="resize-none bg-background border-2 border-border focus:border-primary transition-colors"
                />
                {getSelectedAssignment()?.description_file_url && !assignmentProblem.trim() && (
                  <p className="text-sm text-muted-foreground">
                    A PDF description is attached. Please copy the text content from the PDF above into the text area for keyword extraction.
                  </p>
                )}
              </div>

              {/* Extract Keywords Button */}
              <Button
                onClick={handleExtractKeywords}
                disabled={isExtractingKeywords || !assignmentProblem.trim()}
                className="w-full"
                size="lg"
              >
                {isExtractingKeywords ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting Keywords...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Extract Keywords from Description
                  </>
                )}
              </Button>

              {/* Display Keywords */}
              {keywords.length > 0 && (
                <Card className="bg-muted/50 border-2">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-lg">Extracted Keywords</p>
                        <Badge variant="outline" className="text-base px-3 py-1">
                          {keywords.length} keywords
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submissions & Evaluation */}
              {submissions.length > 0 && keywords.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border">
                    <h3 className="font-semibold text-lg">
                      Submissions ({submissions.length})
                    </h3>
                    <Button
                      onClick={handleEvaluateAll}
                      disabled={isEvaluating}
                      size="lg"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Evaluate All Submissions
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
                        <Card
                          key={submission.id}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-lg">{submission.profiles?.full_name || "Unknown Student"}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {submission.profiles?.email || "No email"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                  <span className="font-medium">File:</span> {submission.file_name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {evalResult ? (
                                  evalResult.success ? (
                                    <div className="flex items-center gap-3">
                                      <Badge variant="default" className="text-base px-4 py-2">
                                        {evalResult.result.total_score}/50
                                      </Badge>
                                      <CheckCircle className="h-6 w-6 text-green-500" />
                                    </div>
                                  ) : (
                                    <Badge variant="destructive" className="px-4 py-2">Failed</Badge>
                                  )
                                ) : (
                                  <Button
                                    size="default"
                                    onClick={() => handleEvaluateIndividual(submission)}
                                    disabled={isEvaluating}
                                  >
                                    Evaluate
                                  </Button>
                                )}
                              </div>
                            </div>

                            {evalResult && evalResult.success && (
                              <div className="mt-4 pt-4 border-t space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-muted/50 p-3 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Keyword Coverage</p>
                                    <p className="text-lg font-semibold">
                                      {evalResult.result.keyword_coverage}%
                                    </p>
                                  </div>
                                  <div className="bg-muted/50 p-3 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Keywords Matched</p>
                                    <p className="text-lg font-semibold">
                                      {evalResult.result.matched_keywords?.length || 0}/{keywords.length}
                                    </p>
                                  </div>
                                </div>
                                {evalResult.result.rubric && (
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Content Quality:</span>
                                      <span className="font-medium">{evalResult.result.rubric.content_quality}/10</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Completeness:</span>
                                      <span className="font-medium">{evalResult.result.rubric.completeness}/10</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Clarity:</span>
                                      <span className="font-medium">{evalResult.result.rubric.clarity_language}/5</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Originality:</span>
                                      <span className="font-medium">{evalResult.result.rubric.originality}/5</span>
                                    </div>
                                  </div>
                                )}
                                <div className="bg-primary/5 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground mb-1">Feedback</p>
                                  <p className="text-sm">{evalResult.result.feedback}</p>
                                </div>
                                {evalResult.result.matched_keywords?.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">Matched Keywords</p>
                                    <div className="flex flex-wrap gap-1">
                                      {evalResult.result.matched_keywords.map((kw: string, idx: number) => (
                                        <Badge key={idx} variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                                          {kw}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
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
