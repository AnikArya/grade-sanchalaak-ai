import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Submission {
  id: string;
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

interface Assignment {
  title: string;
  total_marks: number;
}

interface EvaluationReportProps {
  assignmentId: string;
  submissions: Submission[];
  assignment: Assignment;
  onClose: () => void;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const EvaluationReport = ({ submissions, assignment, onClose }: EvaluationReportProps) => {
  const evaluatedSubmissions = submissions.filter(s => s.evaluations && s.evaluations.length > 0);
  
  const scoreDistribution = [
    { range: '0-20', count: 0 },
    { range: '21-40', count: 0 },
    { range: '41-60', count: 0 },
    { range: '61-80', count: 0 },
    { range: '81-100', count: 0 },
  ];

  evaluatedSubmissions.forEach(sub => {
    const score = sub.evaluations![0].marks_obtained;
    if (score <= 20) scoreDistribution[0].count++;
    else if (score <= 40) scoreDistribution[1].count++;
    else if (score <= 60) scoreDistribution[2].count++;
    else if (score <= 80) scoreDistribution[3].count++;
    else scoreDistribution[4].count++;
  });

  const gradeDistribution = [
    { name: 'A (81-100)', value: scoreDistribution[4].count },
    { name: 'B (61-80)', value: scoreDistribution[3].count },
    { name: 'C (41-60)', value: scoreDistribution[2].count },
    { name: 'D (21-40)', value: scoreDistribution[1].count },
    { name: 'F (0-20)', value: scoreDistribution[0].count },
  ].filter(g => g.value > 0);

  const getGrade = (score: number) => {
    if (score >= 81) return 'A';
    if (score >= 61) return 'B';
    if (score >= 41) return 'C';
    if (score >= 21) return 'D';
    return 'F';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-success text-white';
      case 'B': return 'bg-primary text-white';
      case 'C': return 'bg-warning text-white';
      case 'D': return 'bg-destructive/70 text-white';
      case 'F': return 'bg-destructive text-white';
      default: return 'bg-muted';
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{assignment.title} - Detailed Report</DialogTitle>
          <DialogDescription>
            Comprehensive evaluation statistics and student performance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
              <CardDescription>Distribution of marks across all students</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Grade Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
              <CardDescription>Percentage of students in each grade category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Student List with Scores */}
          <Card>
            <CardHeader>
              <CardTitle>Student Performance List</CardTitle>
              <CardDescription>Detailed marks for each student</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Marks</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center">Coverage %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluatedSubmissions.map((sub) => {
                    const marks = sub.evaluations![0].marks_obtained;
                    const grade = getGrade(marks);
                    const coverage = sub.evaluations![0].keyword_coverage || 0;

                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.profiles.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{sub.profiles.email}</TableCell>
                        <TableCell className="text-center font-semibold">
                          {marks}/{assignment.total_marks}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getGradeColor(grade)}>{grade}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{coverage.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EvaluationReport;
