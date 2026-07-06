// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, BookOpen, Clock, CheckCircle, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function EmployeeTraining() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user || !profile?.tenant_id) return;
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase.from("training_courses").select("*").eq("tenant_id", profile.tenant_id).eq("status", "active"),
      supabase.from("training_enrollments").select("*").eq("user_id", user.id),
    ]);
    setCourses(c || []);
    setEnrollments(e || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, profile?.tenant_id]);

  const isEnrolled = (courseId: string) => enrollments.some(e => e.course_id === courseId);
  const _getEnrollment = (courseId: string) => enrollments.find(e => e.course_id === courseId);

  const handleEnroll = async (courseId: string) => {
    const { error } = await supabase.from("training_enrollments").insert({
      tenant_id: profile?.tenant_id,
      course_id: courseId,
      user_id: user!.id,
      employee_name: profile?.full_name || "Employee",
    });
    if (error) toast.error(error.message);
    else { toast.success("Enrolled successfully!"); fetchData(); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Training & Courses</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse and enroll in available training programs</p>
      </div>

      {/* My enrollments */}
      {enrollments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">My Enrollments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {enrollments.map(enr => {
              const course = courses.find(c => c.id === enr.course_id);
              return (
                <div key={enr.id} className="border border-primary/20 rounded-xl bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">{course?.title || "Course"}</p>
                  </div>
                  <Progress value={enr.progress || 0} className="h-1.5 mb-1.5" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{enr.progress || 0}% complete</span>
                    <span className={cn(
                      "text-[10px] font-medium capitalize",
                      enr.status === "completed" ? "text-emerald-600" : "text-primary"
                    )}>{enr.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available courses */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Available Courses</h2>
        {courses.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No courses available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => {
              const enrolled = isEnrolled(course.id);
              return (
                <div key={course.id} className="border border-border rounded-xl bg-card p-5 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground capitalize">{course.category}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{course.title}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{course.description || "No description"}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {course.duration_hours}h</span>
                    {course.instructor && <span className="text-[10px] text-muted-foreground">{course.instructor}</span>}
                  </div>
                  {enrolled ? (
                    <Button size="sm" variant="outline" disabled className="w-full">
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Enrolled
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => handleEnroll(course.id)}>
                      <Play className="h-3.5 w-3.5 mr-1" /> Enroll
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
