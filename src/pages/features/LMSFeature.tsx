import FeaturePageLayout from "@/components/FeaturePageLayout";
import { GraduationCap, BookOpen, Award, Users, BarChart3, Clock, Gamepad2, Video, Building2, Heart } from "lucide-react";

export default function LMSFeature() {
  return (
    <FeaturePageLayout
      title="Learning Management System"
      subtitle="Employee Training Platform"
      description="Build, assign, and track employee training programs directly within your platform. Eliminate third-party LMS costs with built-in course management."
      icon={GraduationCap}
      gradient="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600"
      features={[
        { title: "Course Builder", description: "Create courses with video lessons, quizzes, PDFs, and interactive content.", icon: Video },
        { title: "Learning Paths", description: "Sequential learning paths with prerequisites and progressive unlocking.", icon: BookOpen },
        { title: "Certifications", description: "Issue certificates on completion with automatic expiry tracking and renewal alerts.", icon: Award },
        { title: "Compliance Training", description: "Mandatory training dashboard for managers with completion tracking.", icon: Users },
        { title: "Analytics", description: "Department-wise training completion analytics and skill gap identification.", icon: BarChart3 },
        { title: "Gamification", description: "Badges, streaks, leaderboards, and points to drive engagement.", icon: Gamepad2 },
      ]}
      detailSections={[
        {
          id: "courses",
          label: "Course Builder",
          icon: Video,
          color: "hsl(142,71%,45%)",
          title: "Create engaging training content",
          description: "Build courses with a mix of video lessons, documents, quizzes, and assessments. Support for SCORM content import from existing LMS platforms.",
          points: [
            "Video, PDF, and quiz content types",
            "SCORM content support",
            "Drag-and-drop course structure",
            "Assessment and grading tools",
            "Course versioning and updates",
          ],
        },
        {
          id: "tracking",
          label: "Completion Tracking",
          icon: BarChart3,
          color: "hsl(199,89%,48%)",
          title: "Track progress across the organization",
          description: "Monitor training completion rates, identify skill gaps, and ensure compliance training deadlines are met — all from a centralized dashboard.",
          points: [
            "Individual progress tracking",
            "Department completion rates",
            "Mandatory training compliance view",
            "Manager-assigned courses with due dates",
            "Overdue training alerts and escalation",
          ],
        },
      ]}
      stats={[
        { value: "78%", label: "Training completion rate" },
        { value: "45%", label: "Faster employee onboarding" },
        { value: "60%", label: "Cost savings vs. external LMS" },
        { value: "92%", label: "Compliance training adherence" },
      ]}
      useCases={[
        { title: "Employee Onboarding", description: "Day 1-90 structured onboarding with role-specific learning paths and checklists.", icon: Users },
        { title: "Compliance Training", description: "Annual compliance and safety training with mandatory completion tracking.", icon: Award },
        { title: "Skill Development", description: "Technical and soft skill courses for professional growth and career advancement.", icon: GraduationCap },
        { title: "Partner Training", description: "Train resellers, distributors, and partners with external-facing course portals.", icon: Building2 },
      ]}
      benefits={[
        "Built-in course builder",
        "Video and quiz support",
        "Learning path prerequisites",
        "Certificate generation",
        "Expiry tracking and renewal",
        "Mandatory training compliance",
        "Department analytics",
        "Gamified engagement",
        "HRM onboarding integration",
        "Manager course assignment",
      ]}
      faqs={[
        { q: "Can I import existing training content?", a: "Yes. Upload videos, PDFs, and SCORM packages. You can also link external video URLs from YouTube or Vimeo." },
        { q: "How does certification work?", a: "On course completion, the system auto-generates a certificate with the employee name, completion date, and course details. Certificates can have expiry dates with automatic renewal reminders." },
        { q: "Can managers assign mandatory training?", a: "Yes. Managers can assign courses with due dates. The compliance dashboard shows completion status and overdue alerts." },
        { q: "Is there gamification?", a: "Yes. Earn badges, maintain streaks, and compete on leaderboards. Points can be configured per course and quiz completion." },
      ]}
    />
  );
}
