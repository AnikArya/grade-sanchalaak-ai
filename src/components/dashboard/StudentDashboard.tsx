import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, LogOut, FileText, Award, File, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SubmissionUpload from "./SubmissionUpload";

interface Assignment {
  id: string;
  title: string;
  description: string;
  description_file_url?: string;
  due_date: string;
  total_marks: number;
}

interface Submission {
  id: string;
  assignment_id: string;
  file_name: string;
  submitted_at: string;
}

interface Evaluation {
  marks_obtained: number;
  keyword_coverage: number;
  feedback: string;
}

interface StudentDashboardProps {
  userId: string;
}

const StudentDashboard = ({ userId }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchAssignments(), fetchSubmissions()]);
    setLoading(false);
  };

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

  const fetchSubmissions = async () => {
    const { data: subs, error: subError } = await supabase
      .from("submissions")
      .select("*")
      .eq("student_id", userId);

    if (subError) {
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
      return;
    }

    setSubmissions(subs || []);

    // Fetch evaluations for submissions
    if (subs && subs.length > 0) {
      const { data: evals } = await supabase
        .from("evaluations")
        .select("*")
        .in("submission_id", subs.map(s => s.id));

      if (evals) {
        const evalsMap: Record<string, Evaluation> = {};
        evals.forEach((e: any) => {
          const submission = subs.find(s => s.id === e.submission_id);
          if (submission) {
            evalsMap[submission.assignment_id] = {
              marks_obtained: e.marks_obtained,
              keyword_coverage: e.keyword_coverage,
              feedback: e.feedback,
            };
          }
        });
        setEvaluations(evalsMap);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find(s => s.assignment_id === assignmentId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Student Dashboard
            </h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* My Grades Summary */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              My Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Assignments</p>
                <p className="text-3xl font-bold">{assignments.length}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-3xl font-bold">{submissions.length}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Evaluated</p>
                <p className="text-3xl font-bold">{Object.keys(evaluations).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assignments
            </CardTitle>
            <CardDescription>View and submit your assignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : assignments.length === 0 ? (
              <p className="text-center text-muted-foreground">No assignments available</p>
            ) : (
              assignments.map((assignment) => {
                const submission = getSubmissionForAssignment(assignment.id);
                const evaluation = evaluations[assignment.id];

                return (
                  <div key={assignment.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{assignment.title}</h3>
                        <p className="text-sm text-muted-foreground">{assignment.description}</p>
                        {assignment.description_file_url && (
                          <a
                            href={assignment.description_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                          >
                            <File className="h-4 w-4" />
                            View Assignment PDF
                          </a>
                        )}
                        {assignment.due_date && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{assignment.total_marks} marks</Badge>
                    </div>

                    {submission ? (
                      <div className="bg-muted/50 p-3 rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">✓ Submitted</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">{submission.file_name}</p>
                        
                        {evaluation && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <div className="flex justify-between items-center">
                              <p className="font-semibold">Score:</p>
                              <p className="text-lg font-bold text-primary">
                                {evaluation.marks_obtained}/{assignment.total_marks}
                              </p>
                            </div>
                            {evaluation.keyword_coverage && (
                              <div className="flex justify-between items-center">
                                <p className="text-sm">Keyword Coverage:</p>
                                <p className="text-sm font-medium">{evaluation.keyword_coverage.toFixed(1)}%</p>
                              </div>
                            )}
                            {evaluation.feedback && (
                              <div className="mt-2">
                                <p className="text-sm font-medium mb-1">Feedback:</p>
                                <p className="text-sm text-muted-foreground">{evaluation.feedback}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => setSelectedAssignment(assignment.id)}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Assignment
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>

      {selectedAssignment && (
        <SubmissionUpload
          assignmentId={selectedAssignment}
          studentId={userId}
          onClose={() => setSelectedAssignment(null)}
          onSuccess={() => {
            setSelectedAssignment(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
