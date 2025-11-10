import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"teacher" | "student" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);

    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch user role",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!roles) {
      toast({
        title: "No Role Assigned",
        description: "Please wait for a teacher to assign your role.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setUserRole(roles.role as "teacher" | "student");
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No Role Assigned</h2>
          <p className="text-muted-foreground">
            Please contact your teacher to assign you a role.
          </p>
        </div>
      </div>
    );
  }

  return userRole === "teacher" ? (
    <TeacherDashboard userId={userId!} />
  ) : (
    <StudentDashboard userId={userId!} />
  );
};

export default Dashboard;
