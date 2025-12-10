import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Trash2, Upload, File, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Assignment {
  id: string;
  title: string;
  description: string;
  description_file_url?: string;
  due_date: string;
  total_marks: number;
  created_at: string;
}

interface AssignmentsTabProps {
  teacherId: string;
}

const AssignmentsTab = ({ teacherId }: AssignmentsTabProps) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssignments();
  }, [teacherId]);

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("created_by", teacherId)
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
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    
    const formData = new FormData(e.currentTarget);
    let fileUrl: string | null = null;

    // Upload file if selected
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${teacherId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("assignment-files")
        .upload(fileName, selectedFile);

      if (uploadError) {
        toast({
          title: "Upload Error",
          description: "Failed to upload file",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("assignment-files")
        .getPublicUrl(fileName);
      
      fileUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("assignments").insert({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      description_file_url: fileUrl,
      due_date: formData.get("due_date") as string || null,
      total_marks: parseInt(formData.get("total_marks") as string),
      created_by: teacherId,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
      setOpen(false);
      setSelectedFile(null);
      fetchAssignments();
      (e.target as HTMLFormElement).reset();
    }
    setUploading(false);
  };

  const handleDeleteAssignment = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });
      fetchAssignments();
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manage Assignments
            </CardTitle>
            <CardDescription>Create and manage course assignments</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) setSelectedFile(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>Add a new assignment for students</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Text)</Label>
                  <Textarea id="description" name="description" placeholder="Enter assignment description or upload a PDF below" />
                </div>
                
                {/* File Upload Section */}
                <div className="space-y-2">
                  <Label>Description (PDF)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {selectedFile ? (
                      <div className="flex items-center justify-between bg-muted p-2 rounded">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-primary" />
                          <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload PDF (max 10MB)
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input id="due_date" name="due_date" type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_marks">Total Marks</Label>
                  <Input id="total_marks" name="total_marks" type="number" defaultValue={100} required />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : assignments.length === 0 ? (
          <p className="text-center text-muted-foreground">No assignments created yet</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{assignment.title}</h3>
                  <p className="text-sm text-muted-foreground">{assignment.description}</p>
                  {assignment.description_file_url && (
                    <a
                      href={assignment.description_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                    >
                      <File className="h-3 w-3" />
                      View PDF
                    </a>
                  )}
                  {assignment.due_date && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Due: {new Date(assignment.due_date).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{assignment.total_marks} marks</span>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteAssignment(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AssignmentsTab;
