import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Eye } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_marks: number;
  created_at: string;
  submissionsCount?: number;
  evaluationsCount?: number;
}

interface AssignmentsManagementTabProps {
  adminId: string;
}

const AssignmentsManagementTab = ({ adminId }: AssignmentsManagementTabProps) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch submission counts for each assignment
      const assignmentsWithCounts = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { count: submissionsCount } = await supabase
            .from("submissions")
            .select("*", { count: "exact", head: true })
            .eq("assignment_id", assignment.id);

          const { count: evaluationsCount } = await supabase
            .from("evaluations")
            .select("*", { count: "exact", head: true })
            .in(
              "submission_id",
              (
                await supabase
                  .from("submissions")
                  .select("id")
                  .eq("assignment_id", assignment.id)
              ).data?.map((s) => s.id) || []
            );

          return {
            ...assignment,
            submissionsCount: submissionsCount || 0,
            evaluationsCount: evaluationsCount || 0,
          };
        })
      );

      setAssignments(assignmentsWithCounts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase.from("assignments").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });
      fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete assignment",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assignments Management
            </CardTitle>
            <CardDescription>View and manage all assignments across the platform</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading assignments...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Total Marks</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Evaluated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No assignments found
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{assignment.description}</TableCell>
                    <TableCell>
                      {assignment.due_date
                        ? new Date(assignment.due_date).toLocaleDateString()
                        : "No due date"}
                    </TableCell>
                    <TableCell>{assignment.total_marks}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{assignment.submissionsCount || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{assignment.evaluationsCount || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AssignmentsManagementTab;
