import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CheckCircle, Clock, GraduationCap, Shield } from "lucide-react";

const SystemOverviewTab = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalAssignments: 0,
    totalSubmissions: 0,
    totalEvaluations: 0,
    pendingEvaluations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch roles
      const { data: roles } = await supabase.from("user_roles").select("role");
      const adminsCount = roles?.filter((r) => r.role === "admin").length || 0;
      const teachersCount = roles?.filter((r) => r.role === "teacher").length || 0;
      const studentsCount = roles?.filter((r) => r.role === "student").length || 0;

      // Fetch assignments count
      const { count: assignmentsCount } = await supabase
        .from("assignments")
        .select("*", { count: "exact", head: true });

      // Fetch submissions count
      const { count: submissionsCount } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true });

      // Fetch evaluations count
      const { count: evaluationsCount } = await supabase
        .from("evaluations")
        .select("*", { count: "exact", head: true });

      // Calculate pending evaluations
      const pendingCount = (submissionsCount || 0) - (evaluationsCount || 0);

      setStats({
        totalUsers: usersCount || 0,
        totalAdmins: adminsCount,
        totalTeachers: teachersCount,
        totalStudents: studentsCount,
        totalAssignments: assignmentsCount || 0,
        totalSubmissions: submissionsCount || 0,
        totalEvaluations: evaluationsCount || 0,
        pendingEvaluations: Math.max(0, pendingCount),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="text-3xl font-bold tracking-tight">System Overview</h2>
        <p className="text-muted-foreground">Complete view of your LMS platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description="All registered users"
          icon={Users}
          color="text-primary"
        />
        <StatCard
          title="Admins"
          value={stats.totalAdmins}
          description="System administrators"
          icon={Shield}
          color="text-destructive"
        />
        <StatCard
          title="Teachers"
          value={stats.totalTeachers}
          description="Active teachers"
          icon={GraduationCap}
          color="text-blue-500"
        />
        <StatCard
          title="Students"
          value={stats.totalStudents}
          description="Enrolled students"
          icon={Users}
          color="text-green-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Assignments"
          value={stats.totalAssignments}
          description="Created assignments"
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
    </div>
  );
};

export default SystemOverviewTab;
