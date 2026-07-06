import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Briefcase, Users, FileText, Search, CheckCircle, BarChart3, Globe, Mail, Calendar, Star } from "lucide-react";
import { useAppInfo } from "@/hooks/useAppInfo";

export default function RecruitmentFeature() {
  const { appInfo } = useAppInfo();
  const name = appInfo.app_name || "Dynime";

  return (
    <FeaturePageLayout
      title={`${name} Recruitment`}
      subtitle="Talent Acquisition"
      description="End-to-end hiring pipeline — post jobs, collect applications, screen candidates, and convert top talent into employees with a single click."
      icon={Briefcase}
      gradient="bg-gradient-to-br from-pink-500 via-rose-500 to-red-600"
      features={[
        { title: "Job Postings", description: "Create and publish job listings with a branded careers page.", icon: Globe },
        { title: "Application Tracking", description: "Kanban-style pipeline to move candidates through hiring stages.", icon: Users },
        { title: "Resume Parsing", description: "Upload and attach resumes with automatic profile extraction.", icon: FileText },
        { title: "Candidate Search", description: "Filter applicants by skills, experience, location, and status.", icon: Search },
        { title: "Interview Scheduling", description: "Schedule interviews with calendar integration and email invites.", icon: Calendar },
        { title: "Hiring Analytics", description: "Time-to-hire, source effectiveness, and pipeline conversion reports.", icon: BarChart3 },
      ]}
      detailSections={[
        {
          id: "pipeline",
          label: "Hiring Pipeline",
          icon: CheckCircle,
          color: "hsl(310,60%,50%)",
          title: "Visual Hiring Pipeline",
          description: "Drag-and-drop candidates through customisable stages — Applied, Screening, Interview, Offer, Hired.",
          points: ["Custom stages", "Drag-and-drop", "Stage notes", "Rejection reasons"],
        },
        {
          id: "careers",
          label: "Careers Page",
          icon: Star,
          color: "hsl(38,92%,50%)",
          title: "Branded Careers Page",
          description: "Public job archive with company branding, department filters, and one-click applications.",
          points: ["Public URL", "Department filters", "Application form", "Resume upload"],
        },
        {
          id: "communication",
          label: "Candidate Comms",
          icon: Mail,
          color: "hsl(199,89%,48%)",
          title: "Automated Communication",
          description: "Send confirmation emails, interview invites, and offer letters automatically at each pipeline stage.",
          points: ["Auto-confirm emails", "Interview reminders", "Offer templates", "Rejection notices"],
        },
      ]}
      benefits={[
        "Branded careers page",
        "Applicant tracking system",
        "Resume uploads",
        "Interview scheduling",
        "Pipeline analytics",
        "One-click hire to employee",
      ]}
    />
  );
}
