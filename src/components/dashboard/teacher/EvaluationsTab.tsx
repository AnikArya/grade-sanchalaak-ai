import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, CheckCircle, FileText, TrendingUp } from "lucide-react";
import EvaluationReport from "./EvaluationReport";

interface Assignment {
  id: string;
  title: string;
  total_marks: number;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_name: string;
  file_url: string;
  submitted_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  evaluations?: {
    marks_obtained: number;
    keyword_coverage: number;
    feedback: string;
  }[];
}

interface EvaluationsTabProps {
  teacherId: string;
}

const EvaluationsTab = ({ teacherId }: EvaluationsTabProps) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignment) {
      fetchSubmissions();
    }
  }, [selectedAssignment]);

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("assignments")
      .select("id, title, total_marks")
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
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select(`
        *,
        profiles:student_id(full_name, email),
        evaluations(marks_obtained, keyword_coverage, feedback)
      `)
      .eq("assignment_id", selectedAssignment);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch submissions",
        variant: "destructive",
      });
    } else {
      setSubmissions(data as any || []);
    }
    setLoading(false);
  };

  const evaluatedCount = submissions.filter(s => s.evaluations && s.evaluations.length > 0).length;
  const avgScore = submissions.length > 0 && evaluatedCount > 0
    ? submissions
        .filter(s => s.evaluations && s.evaluations.length > 0)
        .reduce((acc, s) => acc + (s.evaluations?.[0]?.marks_obtained || 0), 0) / evaluatedCount
    : 0;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Assignment Evaluations
          </CardTitle>
          <CardDescription>View and manage student submissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Assignment</label>
            <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an assignment" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAssignment && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-3xl font-bold">{submissions.length}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg">
                  <p className="text-sm text-muted-foreground">Evaluated</p>
                  <p className="text-3xl font-bold">{evaluatedCount}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-3xl font-bold">{avgScore.toFixed(1)}</p>
                </div>
              </div>

              {submissions.length > 0 && (
                <Button onClick={() => setShowReport(true)} className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Detailed Report
                </Button>
              )}

              <div className="space-y-3">
                {loading ? (
                  <p className="text-center text-muted-foreground">Loading submissions...</p>
                ) : submissions.length === 0 ? (
                  <p className="text-center text-muted-foreground">No submissions yet</p>
                ) : (
                  submissions.map((sub) => (
                    <div key={sub.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{sub.profiles.full_name}</p>
                          <p className="text-sm text-muted-foreground">{sub.profiles.email}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <FileText className="h-3 w-3 inline mr-1" />
                            {sub.file_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted: {new Date(sub.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        {sub.evaluations && sub.evaluations.length > 0 && (
                          <div className="text-right">
                            <CheckCircle className="h-5 w-5 text-success inline mr-1" />
                            <p className="text-lg font-bold text-success">
                              {sub.evaluations[0].marks_obtained}/{assignments.find(a => a.id === selectedAssignment)?.total_marks}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {showReport && selectedAssignment && (
        <EvaluationReport
          assignmentId={selectedAssignment}
          submissions={submissions}
          assignment={assignments.find(a => a.id === selectedAssignment)!}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default EvaluationsTab;
