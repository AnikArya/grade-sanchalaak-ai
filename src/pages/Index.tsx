import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GradeSanchalaak from "@/components/GradeSanchalaak";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-primary to-accent rounded-full shadow-lg">
              <GraduationCap className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            GradeSanchalaak LMS
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI-Powered Learning Management System for Modern Education
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-lg">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <div className="flex justify-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">AI Grading</h3>
              <p className="text-muted-foreground">
                Automated assignment evaluation with keyword extraction and intelligent feedback
              </p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <div className="flex justify-center">
                <div className="p-3 bg-accent/10 rounded-full">
                  <Users className="h-8 w-8 text-accent" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Student Management</h3>
              <p className="text-muted-foreground">
                Comprehensive student portal with assignment tracking and grade visibility
              </p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
              <div className="flex justify-center">
                <div className="p-3 bg-success/10 rounded-full">
                  <BarChart3 className="h-8 w-8 text-success" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Analytics & Reports</h3>
              <p className="text-muted-foreground">
                Visual reports with charts, graphs, and performance insights
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Evaluator Section */}
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Try Our AI Evaluator</h2>
          <GradeSanchalaak />
        </div>
      </section>
    </div>
  );
};

export default Index;
