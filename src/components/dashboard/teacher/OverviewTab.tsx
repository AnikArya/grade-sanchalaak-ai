import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, CheckCircle, Clock, Users } from "lucide-react";

interface OverviewTabProps {
  teacherId: string;
}

const OverviewTab = ({ teacherId }: OverviewTabProps) => {
  const [stats, setStats] = useState({
    totalAssignments: 0,
    totalSubmissions: 0,
    totalEvaluations: 0,
    pendingEvaluations: 0,
    averageScore: 0,
  });
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();
  }, [teacherId]);

  const fetchOverviewData = async () => {
    try {
      // Fetch teacher's assignments
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, total_marks")
        .eq("created_by", teacherId);

      const assignmentIds = assignments?.map((a) => a.id) || [];

      // Fetch submissions for these assignments
      const { data: submissions } = await supabase
        .from("submissions")
        .select("id")
        .in("assignment_id", assignmentIds);

      const submissionIds = submissions?.map((s) => s.id) || [];

      // Fetch evaluations
      const { data: evaluations } = await supabase
        .from("evaluations")
        .select("marks_obtained")
        .in("submission_id", submissionIds);

      const totalAssignments = assignments?.length || 0;
      const totalSubmissions = submissions?.length || 0;
      const totalEvaluations = evaluations?.length || 0;
      const pendingEvaluations = totalSubmissions - totalEvaluations;

      // Calculate average score
      const totalMarks = evaluations?.reduce((sum, e) => sum + (Number(e.marks_obtained) || 0), 0) || 0;
      const averageScore = totalEvaluations > 0 ? totalMarks / totalEvaluations : 0;

      // Calculate grade distribution
      const gradeData = evaluations?.reduce((acc: any, e) => {
        const score = Number(e.marks_obtained);
        let grade = "F";
        if (score >= 90) grade = "A";
        else if (score >= 80) grade = "B";
        else if (score >= 70) grade = "C";
        else if (score >= 60) grade = "D";

        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const gradeDistributionData = Object.entries(gradeData || {}).map(([name, value]) => ({
        name,
        value,
      }));

      setStats({
        totalAssignments,
        totalSubmissions,
        totalEvaluations,
        pendingEvaluations: Math.max(0, pendingEvaluations),
        averageScore: Math.round(averageScore * 100) / 100,
      });
      setGradeDistribution(gradeDistributionData);
    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#6b7280"];

  const StatCard = ({ title, value, description, icon: Icon, color }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? "..." : value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">Your teaching performance at a glance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Assignments"
          value={stats.totalAssignments}
          description="Active assignments"
          icon={FileText}
          color="text-primary"
        />
        <StatCard
          title="Total Submissions"
          value={stats.totalSubmissions}
          description="Student submissions"
          icon={CheckCircle}
          color="text-blue-500"
        />
        <StatCard
          title="Completed Evaluations"
          value={stats.totalEvaluations}
          description="Graded submissions"
          icon={CheckCircle}
          color="text-green-500"
        />
        <StatCard
          title="Pending Evaluations"
          value={stats.pendingEvaluations}
          description="Awaiting grading"
          icon={Clock}
          color="text-orange-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average Score</CardTitle>
            <CardDescription>Overall student performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-center py-8">
              {loading ? "..." : `${stats.averageScore}%`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>Student grade breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No evaluation data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
