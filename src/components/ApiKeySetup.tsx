import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Key, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GeminiService } from "@/services/GeminiService";
import { useToast } from "@/hooks/use-toast";

interface ApiKeySetupProps {
  onApiKeySet: () => void;
}

const ApiKeySetup = ({ onApiKeySet }: ApiKeySetupProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsValidating(true);
    
    try {
      const isValid = await GeminiService.testApiKey(apiKey);
      
      if (isValid) {
        GeminiService.saveApiKey(apiKey);
        toast({
          title: "Success!",
          description: "API key validated and saved successfully.",
        });
        onApiKeySet();
      } else {
        toast({
          title: "Invalid API Key",
          description: "Please check your Google Gemini API key and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-3 py-1 rounded-full mx-auto mb-2">
            <Key className="w-4 h-4" />
            <span className="text-sm font-semibold">Setup Required</span>
          </div>
          <CardTitle className="text-2xl">Google Gemini API Key</CardTitle>
          <CardDescription>
            {GeminiService.getApiKey() ? 'Update your Google Gemini API key below' : 'Enter your Google Gemini API key to enable AI-powered assignment evaluation'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your API key is stored locally in your browser and never shared. 
              We recommend connecting to Supabase for better security.
            </AlertDescription>
          </Alert>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Google Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:shadow-glow"
              disabled={!apiKey.trim() || isValidating}
            >
              {isValidating ? "Validating..." : GeminiService.getApiKey() ? "Update API Key" : "Save & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeySetup;