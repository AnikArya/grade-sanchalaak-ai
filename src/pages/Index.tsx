import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Users, BarChart3, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GradeSanchalaak from "@/components/GradeSanchalaak";
import { ThemeToggle } from "@/components/ThemeToggle";
import heroImage from "@/assets/hero-education.jpg";
import aiFeature from "@/assets/ai-feature.jpg";
import studentsFeature from "@/assets/students-feature.jpg";
import analyticsFeature from "@/assets/analytics-feature.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <ThemeToggle />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Education technology background" 
            className="w-full h-full object-cover opacity-20 dark:opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="relative p-6 bg-gradient-to-br from-primary to-accent rounded-full shadow-glow animate-scale-in">
              <GraduationCap className="h-20 w-20 text-white" />
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-accent animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: "0.2s" }}>
            GradeSanchalaak LMS
          </h1>
          
          <p className="text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Transform Education with AI-Powered Learning Management
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth?mode=signup")} 
              className="shadow-glow text-lg px-8 py-6 group"
            >
              Sign Up Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate("/auth?mode=login")}
              className="text-lg px-8 py-6 hover-scale"
            >
              Login
            </Button>
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={() => navigate("/dashboard")}
              className="text-lg px-8 py-6 hover-scale"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background relative">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Powerful Features
          </h2>
          <p className="text-center text-muted-foreground mb-16 text-lg">
            Everything you need for modern education management
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group text-center space-y-4 p-8 rounded-2xl border bg-card hover:shadow-glow transition-all hover-scale hover:border-primary/50">
              <div className="flex justify-center mb-4">
                <div className="relative overflow-hidden rounded-xl shadow-lg">
                  <img 
                    src={aiFeature} 
                    alt="AI Grading" 
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent" />
                </div>
              </div>
              <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold">AI Grading</h3>
              <p className="text-muted-foreground">
                Automated assignment evaluation with keyword extraction and intelligent feedback
              </p>
            </div>
            
            <div className="group text-center space-y-4 p-8 rounded-2xl border bg-card hover:shadow-glow transition-all hover-scale hover:border-accent/50">
              <div className="flex justify-center mb-4">
                <div className="relative overflow-hidden rounded-xl shadow-lg">
                  <img 
                    src={studentsFeature} 
                    alt="Student Management" 
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-accent/50 to-transparent" />
                </div>
              </div>
              <div className="p-4 bg-accent/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold">Student Management</h3>
              <p className="text-muted-foreground">
                Comprehensive student portal with assignment tracking and grade visibility
              </p>
            </div>
            
            <div className="group text-center space-y-4 p-8 rounded-2xl border bg-card hover:shadow-glow transition-all hover-scale hover:border-success/50">
              <div className="flex justify-center mb-4">
                <div className="relative overflow-hidden rounded-xl shadow-lg">
                  <img 
                    src={analyticsFeature} 
                    alt="Analytics & Reports" 
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-success/50 to-transparent" />
                </div>
              </div>
              <div className="p-4 bg-success/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-2xl font-semibold">Analytics & Reports</h3>
              <p className="text-muted-foreground">
                Visual reports with charts, graphs, and performance insights
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Evaluator Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Try Our AI Evaluator
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Experience intelligent grading powered by advanced AI
          </p>
          <div className="animate-fade-in">
            <GradeSanchalaak />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
